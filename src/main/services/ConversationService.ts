import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Conversation, ConversationData } from '../../shared/types';

class ConversationService {
  private getConversationsDir(): string {
    return path.join(app.getPath('userData'), 'conversations');
  }

  private ensureDir(): void {
    const dir = this.getConversationsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  list(): Conversation[] {
    this.ensureDir();
    const dir = this.getConversationsDir();

    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      const conversations: Conversation[] = [];

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          const data = JSON.parse(content) as ConversationData;
          conversations.push({
            id: data.id,
            title: data.title,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        } catch {
          console.warn(`Failed to read conversation file: ${file}`);
        }
      }

      // Sort by updatedAt descending (most recent first)
      conversations.sort((a, b) => b.updatedAt - a.updatedAt);
      return conversations;
    } catch (error) {
      console.error('Failed to list conversations:', error);
      return [];
    }
  }

  load(id: string): ConversationData | null {
    this.ensureDir();
    const filePath = path.join(this.getConversationsDir(), `${id}.json`);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ConversationData;
    } catch (error) {
      console.error(`Failed to load conversation ${id}:`, error);
      return null;
    }
  }

  save(data: ConversationData): void {
    this.ensureDir();
    const filePath = path.join(this.getConversationsDir(), `${data.id}.json`);
    const tmpPath = filePath + '.tmp';

    try {
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (error) {
      console.error(`Failed to save conversation ${data.id}:`, error);
      // Clean up temp file if rename failed
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }

  delete(id: string): void {
    const filePath = path.join(this.getConversationsDir(), `${id}.json`);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete conversation ${id}:`, error);
    }
  }

  rename(id: string, title: string): void {
    const data = this.load(id);
    if (data) {
      data.title = title;
      data.updatedAt = Date.now();
      this.save(data);
    }
  }
}

export const conversationService = new ConversationService();
