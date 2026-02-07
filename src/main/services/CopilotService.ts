import { CopilotClient, CopilotSession } from '@github/copilot-sdk';

export class CopilotService {
  private client: CopilotClient | null = null;
  private session: CopilotSession | null = null;

  async start(): Promise<void> {
    this.client = new CopilotClient();
    await this.client.start();
  }

  async sendMessage(
    prompt: string,
    messageId: string,
    onChunk: (messageId: string, content: string) => void,
    onDone: (messageId: string) => void,
    onError: (messageId: string, error: string) => void,
  ): Promise<void> {
    try {
      if (!this.client) {
        await this.start();
      }

      if (!this.session) {
        this.session = await this.client!.createSession();
      }

      this.session.on('assistant.message_delta', (event) => {
        onChunk(messageId, event.data.deltaContent);
      });

      const unsubIdle = this.session.on('session.idle', () => {
        onDone(messageId);
        unsubIdle();
      });

      const unsubError = this.session.on('session.error', (event) => {
        onError(messageId, event.data.message);
        unsubError();
      });

      await this.session.send({ prompt });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(messageId, message);
    }
  }

  async stop(): Promise<void> {
    if (this.session) {
      await this.session.destroy().catch(() => {});
      this.session = null;
    }
    if (this.client) {
      await this.client.stop().catch(() => {});
      this.client = null;
    }
  }
}
