// Dynamic import for ESM-only @github/copilot-sdk in CJS Electron main process
type CopilotClientType = import('@github/copilot-sdk').CopilotClient;
type CopilotSessionType = import('@github/copilot-sdk').CopilotSession;

async function loadSdk() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('return import("@github/copilot-sdk")')() as Promise<typeof import('@github/copilot-sdk')>;
}

export class CopilotService {
  private client: CopilotClientType | null = null;
  private sessions: Map<string, CopilotSessionType> = new Map();
  private sessionModels: Map<string, string> = new Map();
  private activeAbortControllers: Map<string, AbortController> = new Map();

  async start(): Promise<void> {
    const { CopilotClient } = await loadSdk();
    this.client = new CopilotClient();
    await this.client.start();
  }

  async listModels(): Promise<Array<{ id: string; name: string }>> {
    if (!this.client) {
      await this.start();
    }
    const models = await this.client!.listModels();
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
      if (!this.client) {
        await this.start();
      }
      const config = model ? { model } : undefined;
      session = await this.client!.createSession(config);
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

      let receivedChunks = false;

      // Stream deltas as they arrive
      const unsubDelta = session.on('assistant.message_delta', (event) => {
        if (abortController.signal.aborted) return;
        receivedChunks = true;
        onChunk(messageId, event.data.deltaContent);
      });

      // sendAndWait blocks until the full response is ready
      const response = await session.sendAndWait({ prompt });

      unsubDelta();

      if (abortController.signal.aborted) return;

      // If no streaming chunks were received, send the full response content
      if (!receivedChunks && response?.data.content) {
        onChunk(messageId, response.data.content);
      }

      onDone(messageId);
    } catch (err) {
      if (abortController.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
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
    if (this.client) {
      await this.client.stop().catch(() => {});
      this.client = null;
    }
  }
}
