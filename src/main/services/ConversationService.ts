import * as fs from 'fs';
import * as path from 'path';
import { Conversation, ConversationData } from '../../shared/types';
import { getConversationsDir, getStateDir, getUserDataDir } from './AppPaths';

class ConversationService {
  private getConversationsDir(): string {
    return getConversationsDir();
  }

  private getLegacyConversationsDir(): string {
    return path.join(getUserDataDir(), 'conversations');
  }

  private async ensureDir(): Promise<string> {
    const dir = this.getConversationsDir();
    if (fs.existsSync(dir)) {
      return dir;
    }

    const legacyDir = this.getLegacyConversationsDir();
    if (fs.existsSync(legacyDir)) {
      await fs.promises.mkdir(getStateDir(), { recursive: true });
      try {
        await fs.promises.rename(legacyDir, dir);
        return dir;
      } catch (error) {
        console.warn('Failed to migrate legacy conversations directory, copying instead:', error);
        try {
          await fs.promises.mkdir(dir, { recursive: true });
          const legacyFiles = await fs.promises.readdir(legacyDir);
          await Promise.all(
            legacyFiles.map(file =>
              fs.promises.copyFile(path.join(legacyDir, file), path.join(dir, file))
            )
          );
          return dir;
        } catch (copyError) {
          console.warn('Failed to copy legacy conversations; using legacy directory:', copyError);
          return legacyDir;
        }
      }
    }

    await fs.promises.mkdir(dir, { recursive: true });
    return dir;
  }

  async list(): Promise<Conversation[]> {
    const dir = await this.ensureDir();

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
    const dir = await this.ensureDir();
    const filePath = path.join(dir, `${id}.json`);

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
    const dir = await this.ensureDir();
    const filePath = path.join(dir, `${data.id}.json`);
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
    const dir = await this.ensureDir();
    const filePath = path.join(dir, `${id}.json`);

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
