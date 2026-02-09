import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Conversation, ConversationData } from '../../shared/types';

class ConversationService {
  private getConversationsDir(): string {
    return path.join(app.getPath('userData'), 'conversations');
  }

  private async ensureDir(): Promise<void> {
    await fs.promises.mkdir(this.getConversationsDir(), { recursive: true });
  }

  async list(): Promise<Conversation[]> {
    await this.ensureDir();
    const dir = this.getConversationsDir();

    try {
      const files = (await fs.promises.readdir(dir)).filter(f => f.endsWith('.json'));

      const results = await Promise.all(
        files.map(async (file): Promise<Conversation | null> => {
          try {
            const content = await fs.promises.readFile(path.join(dir, file), 'utf-8');
            const data = JSON.parse(content) as ConversationData;
            return {
              id: data.id,
              title: data.title,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          } catch {
            console.warn(`Failed to read conversation file: ${file}`);
            return null;
          }
        })
      );

      const conversations = results.filter((c): c is Conversation => c !== null);
      conversations.sort((a, b) => b.updatedAt - a.updatedAt);
      return conversations;
    } catch (error) {
      console.error('Failed to list conversations:', error);
      return [];
    }
  }

  async load(id: string): Promise<ConversationData | null> {
    await this.ensureDir();
    const filePath = path.join(this.getConversationsDir(), `${id}.json`);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ConversationData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to load conversation ${id}:`, error);
      }
      return null;
    }
  }

  async save(data: ConversationData): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.getConversationsDir(), `${data.id}.json`);
    const tmpPath = filePath + '.tmp';

    try {
      await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.promises.rename(tmpPath, filePath);
    } catch (error) {
      console.error(`Failed to save conversation ${data.id}:`, error);
      try { await fs.promises.unlink(tmpPath); } catch { /* ignore */ }
    }
  }

  async delete(id: string): Promise<void> {
    const filePath = path.join(this.getConversationsDir(), `${id}.json`);

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to delete conversation ${id}:`, error);
      }
    }
  }

  async rename(id: string, title: string): Promise<void> {
    const data = await this.load(id);
    if (data) {
      data.title = title;
      data.updatedAt = Date.now();
      await this.save(data);
    }
  }
}

export const conversationService = new ConversationService();
