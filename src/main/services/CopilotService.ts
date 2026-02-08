// Uses shared SDK loader for ESM-only @github/copilot-sdk in CJS Electron main process
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getSharedClient } from './SdkLoader';

type CopilotSessionType = import('@github/copilot-sdk').CopilotSession;
type ToolType = import('@github/copilot-sdk').Tool;

let logFilePath: string | null = null;

function logToFile(message: string): void {
  const filePath = logFilePath ?? (logFilePath = path.join(app.getPath('userData'), 'copilot-chat.log'));
  fs.appendFile(filePath, `${new Date().toISOString()} ${message}\n`, (err) => {
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

      // Inject active agent context so the model knows which agents exist
      let enrichedPrompt = prompt;
      if (this.agentContextProvider) {
        const agents = this.agentContextProvider();
        if (agents.length > 0) {
          const agentList = agents.map(a => `- ${a.label} (ID: ${a.agentId}, path: ${a.cwd})`).join('\n');
          enrichedPrompt = `<active_agents>\n${agentList}\n</active_agents>\n\n${prompt}`;
        }
      }

      let receivedChunks = false;

      // Log all events for debugging
      const unsubDebug = session.on((event) => {
        if (event.type === 'assistant.message_delta') return; // too noisy
        const payload = JSON.stringify(event.data ?? {}).slice(0, 200);
        console.log(`[CopilotService] Event: ${event.type}`, payload);
        logToFile(`Event: ${event.type} ${payload}`);
      });

      // Stream deltas as they arrive
      const unsubDelta = session.on('assistant.message_delta', (event) => {
        if (abortController.signal.aborted) return;
        receivedChunks = true;
        onChunk(messageId, event.data.deltaContent);
      });

      // sendAndWait blocks until the full response is ready
      // 5 min timeout — orchestrator tool calls (vp_send_to_agent) can take minutes
      console.log(`[CopilotService] Sending prompt to session ${conversationId}`);
      logToFile(`Sending prompt to session ${conversationId}`);
      const response = await session.sendAndWait({ prompt: enrichedPrompt }, 300_000);
      console.log(`[CopilotService] sendAndWait resolved for ${conversationId}`);
      logToFile(`sendAndWait resolved for ${conversationId}`);

      unsubDelta();
      unsubDebug();

      if (abortController.signal.aborted) return;

      // If no streaming chunks were received, send the full response content
      if (!receivedChunks && response?.data.content) {
        onChunk(messageId, response.data.content);
      }

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
