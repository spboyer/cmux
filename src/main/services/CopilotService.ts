// Uses shared SDK loader for ESM-only @github/copilot-sdk in CJS Electron main process
import * as fs from 'fs';
import * as path from 'path';
import { getCopilotChatLogPath, getLogsDir, getUserDataDir } from './AppPaths';
import { getSharedClient } from './SdkLoader';

type CopilotSessionType = import('@github/copilot-sdk').CopilotSession;
type ToolType = import('@github/copilot-sdk').Tool;

let logFilePath: string | null = null;

function logToFile(message: string): void {
  if (!logFilePath) {
    const logsDir = getLogsDir();
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
      console.error('[CopilotService] Failed to create logs directory:', error);
    }

    const legacyPath = path.join(getUserDataDir(), 'copilot-chat.log');
    const newPath = getCopilotChatLogPath();
    if (!fs.existsSync(newPath) && fs.existsSync(legacyPath)) {
      try {
        fs.renameSync(legacyPath, newPath);
      } catch (error) {
        console.warn('[CopilotService] Failed to migrate copilot chat log:', error);
      }
    }
    logFilePath = newPath;
  }

  fs.appendFile(logFilePath, `${new Date().toISOString()} ${message}\n`, (err) => {
    if (err) {
      console.error('[CopilotService] Failed to write log file:', err);
    }
  });
}

export class CopilotService {
  private sessions: Map<string, CopilotSessionType> = new Map();
  private sessionModels: Map<string, string> = new Map();
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private tools: ToolType[] = [];
  private systemMessage: string | null = null;
  private agentContextProvider: (() => Array<{ agentId: string; label: string; cwd: string }>) | null = null;

  /** Register tools that will be provided to all new chat sessions. */
  setTools(tools: ToolType[]): void {
    this.tools = tools;
  }

  /** Set a system message appended to all new chat sessions. */
  setSystemMessage(message: string): void {
    this.systemMessage = message;
  }

  /** Set a provider that returns active agents for dynamic context injection. */
  setAgentContextProvider(provider: () => Array<{ agentId: string; label: string; cwd: string }>): void {
    this.agentContextProvider = provider;
  }

  async listModels(): Promise<Array<{ id: string; name: string }>> {
    const client = await getSharedClient();
    const models = await client.listModels();
    return models.map(m => ({ id: m.id, name: m.name }));
  }

  private async getOrCreateSession(conversationId: string, model?: string): Promise<CopilotSessionType> {
    const existingModel = this.sessionModels.get(conversationId);
    // Recreate session if model changed
    if (model && existingModel && existingModel !== model) {
      await this.destroySession(conversationId);
    }

    let session = this.sessions.get(conversationId);
    if (!session) {
      const client = await getSharedClient();
      const config: Record<string, unknown> = {};
      if (model) config.model = model;
      if (this.tools.length > 0) config.tools = this.tools;
      if (this.systemMessage) {
        config.systemMessage = { mode: 'append', content: this.systemMessage };
      }
      // Auto-approve permissions so CLI tools (bash, read, edit) don't block
      config.onPermissionRequest = async (request: { kind: string }) => {
        console.log(`[CopilotService] Permission auto-approved: ${request.kind}`);
        logToFile(`Permission auto-approved: ${request.kind}`);
        return { kind: 'approved' };
      };
      // Handle user input requests so ask_user doesn't throw
      config.onUserInputRequest = async (request: { question: string }) => {
        console.log(`[CopilotService] User input requested: ${request.question}`);
        logToFile(`User input requested: ${request.question}`);
        return { answer: 'Not available in this context', wasFreeform: true };
      };
      session = await client.createSession(config as Parameters<typeof client.createSession>[0]);
      this.sessions.set(conversationId, session);
      if (model) {
        this.sessionModels.set(conversationId, model);
      }
    }
    return session;
  }

  async destroySession(conversationId: string): Promise<void> {
    const session = this.sessions.get(conversationId);
    if (session) {
      await session.destroy().catch(() => {});
      this.sessions.delete(conversationId);
      this.sessionModels.delete(conversationId);
    }
  }

  async sendMessage(
    conversationId: string,
    prompt: string,
    messageId: string,
    onChunk: (messageId: string, content: string) => void,
    onDone: (messageId: string, fullContent?: string) => void,
    onError: (messageId: string, error: string) => void,
    model?: string,
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeAbortControllers.set(conversationId, abortController);

    try {
      const session = await this.getOrCreateSession(conversationId, model);
      const enrichedPrompt = this.enrichPrompt(prompt);
      const { unsubscribeAll, hasReceivedChunks } = this.subscribeToEvents(session, abortController, messageId, onChunk);

      console.log(`[CopilotService] Sending prompt to session ${conversationId}`);
      logToFile(`Sending prompt to session ${conversationId}`);
      // 5 min timeout — orchestrator tool calls (vp_send_to_agent) can take minutes
      const response = await session.sendAndWait({ prompt: enrichedPrompt }, 300_000);
      console.log(`[CopilotService] sendAndWait resolved for ${conversationId}`);
      logToFile(`sendAndWait resolved for ${conversationId}`);

      unsubscribeAll();

      if (abortController.signal.aborted) return;

      this.handleStreamingResponse(response, hasReceivedChunks(), messageId, onChunk);
      onDone(messageId);
    } catch (err) {
      if (abortController.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      logToFile(`Error: ${message}`);
      onError(messageId, message);
    } finally {
      this.activeAbortControllers.delete(conversationId);
    }
  }

  /** Inject active agent context into the prompt so the model knows which agents exist. */
  private enrichPrompt(prompt: string): string {
    if (!this.agentContextProvider) return prompt;
    const agents = this.agentContextProvider();
    if (agents.length === 0) return prompt;
    const agentList = agents.map(a => `- ${a.label} (ID: ${a.agentId}, path: ${a.cwd})`).join('\n');
    return `<active_agents>\n${agentList}\n</active_agents>\n\n${prompt}`;
  }

  /** Subscribe to debug logging and streaming delta events on the session. */
  private subscribeToEvents(
    session: CopilotSessionType,
    abortController: AbortController,
    messageId: string,
    onChunk: (messageId: string, content: string) => void,
  ): { unsubscribeAll: () => void; hasReceivedChunks: () => boolean } {
    let receivedChunks = false;

    const unsubDebug = session.on((event) => {
      if (event.type === 'assistant.message_delta') return;
      const payload = JSON.stringify(event.data ?? {}).slice(0, 200);
      console.log(`[CopilotService] Event: ${event.type}`, payload);
      logToFile(`Event: ${event.type} ${payload}`);
    });

    const unsubDelta = session.on('assistant.message_delta', (event) => {
      if (abortController.signal.aborted) return;
      receivedChunks = true;
      onChunk(messageId, event.data.deltaContent);
    });

    return {
      unsubscribeAll: () => { unsubDelta(); unsubDebug(); },
      hasReceivedChunks: () => receivedChunks,
    };
  }

  /** If no streaming chunks were received, send the full response content as a single chunk. */
  private handleStreamingResponse(
    response: { data: { content?: string } } | undefined,
    receivedChunks: boolean,
    messageId: string,
    onChunk: (messageId: string, content: string) => void,
  ): void {
    if (!receivedChunks && response?.data.content) {
      onChunk(messageId, response.data.content);
    }
  }

  async cancelMessage(
    conversationId: string,
    messageId: string,
    onDone: (messageId: string) => void,
  ): Promise<void> {
    const controller = this.activeAbortControllers.get(conversationId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(conversationId);
    }
    const session = this.sessions.get(conversationId);
    if (session) {
      await session.abort().catch(() => {});
    }
    onDone(messageId);
  }

  async stop(): Promise<void> {
    for (const [id, session] of this.sessions) {
      await session.destroy().catch(() => {});
      this.sessions.delete(id);
    }
    this.sessionModels.clear();
  }
}
