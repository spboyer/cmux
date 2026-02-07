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

  async start(): Promise<void> {
    const { CopilotClient } = await loadSdk();
    this.client = new CopilotClient();
    await this.client.start();
  }

  private async getOrCreateSession(conversationId: string): Promise<CopilotSessionType> {
    let session = this.sessions.get(conversationId);
    if (!session) {
      if (!this.client) {
        await this.start();
      }
      session = await this.client!.createSession();
      this.sessions.set(conversationId, session);
    }
    return session;
  }

  async destroySession(conversationId: string): Promise<void> {
    const session = this.sessions.get(conversationId);
    if (session) {
      await session.destroy().catch(() => {});
      this.sessions.delete(conversationId);
    }
  }

  async sendMessage(
    conversationId: string,
    prompt: string,
    messageId: string,
    onChunk: (messageId: string, content: string) => void,
    onDone: (messageId: string, fullContent?: string) => void,
    onError: (messageId: string, error: string) => void,
  ): Promise<void> {
    try {
      const session = await this.getOrCreateSession(conversationId);

      let receivedChunks = false;

      // Stream deltas as they arrive
      const unsubDelta = session.on('assistant.message_delta', (event) => {
        receivedChunks = true;
        onChunk(messageId, event.data.deltaContent);
      });

      // sendAndWait blocks until the full response is ready
      const response = await session.sendAndWait({ prompt });

      unsubDelta();

      // If no streaming chunks were received, send the full response content
      if (!receivedChunks && response?.data.content) {
        onChunk(messageId, response.data.content);
      }

      onDone(messageId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(messageId, message);
    }
  }

  async stop(): Promise<void> {
    for (const [id, session] of this.sessions) {
      await session.destroy().catch(() => {});
      this.sessions.delete(id);
    }
    if (this.client) {
      await this.client.stop().catch(() => {});
      this.client = null;
    }
  }
}
