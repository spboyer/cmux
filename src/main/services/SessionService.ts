import * as fs from 'fs';
import * as path from 'path';
import { getSessionPath, getStateDir, getUserDataDir } from './AppPaths';

const SESSION_FILE = 'session.json';
const SESSION_VERSION = 5;

export interface SessionAgent {
  id: string;
  label: string;
  cwd: string;
  openFiles: SessionFile[];
  hasSession?: boolean;
}

export interface SessionFile {
  id: string;
  path: string;
  name: string;
  parentAgentId: string;
}

export interface SessionData {
  version: number;
  agents: SessionAgent[];
  activeItemId: string | null;
  activeAgentId: string | null;
  activeConversationId: string | null;
  agentNotes?: Record<string, string>;
  showHiddenFiles?: boolean;
}

// Legacy v1 types for migration
interface LegacySessionDataV1 {
  version: 1;
  terminals: Array<{
    id: string;
    label: string;
    cwd: string;
    openFiles: Array<{
      id: string;
      path: string;
      name: string;
      parentTerminalId: string;
    }>;
  }>;
  activeItemId: string | null;
  activeTerminalId: string | null;
}

class SessionService {
  private getSessionPath(): string {
    return getSessionPath();
  }

  private getLegacySessionPath(): string {
    return path.join(getUserDataDir(), SESSION_FILE);
  }

  private ensureStateDir(): void {
    fs.mkdirSync(getStateDir(), { recursive: true });
  }

  private migrateLegacySessionIfNeeded(): void {
    const sessionPath = this.getSessionPath();
    const legacyPath = this.getLegacySessionPath();

    if (!fs.existsSync(sessionPath) && fs.existsSync(legacyPath)) {
      this.ensureStateDir();
      try {
        fs.renameSync(legacyPath, sessionPath);
      } catch (error) {
        console.warn('Failed to migrate legacy session file, copying instead:', error);
        try {
          fs.copyFileSync(legacyPath, sessionPath);
        } catch (copyError) {
          console.warn('Failed to copy legacy session file:', copyError);
        }
      }
    }
  }

  private getReadableSessionPath(): string | null {
    const sessionPath = this.getSessionPath();
    if (fs.existsSync(sessionPath)) {
      return sessionPath;
    }

    const legacyPath = this.getLegacySessionPath();
    if (fs.existsSync(legacyPath)) {
      return legacyPath;
    }

    return null;
  }

  save(data: Omit<SessionData, 'version'>): void {
    const sessionData: SessionData = {
      version: SESSION_VERSION,
      ...data,
    };

    try {
      this.ensureStateDir();
      const sessionPath = this.getSessionPath();
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private migrateV1ToV2(data: LegacySessionDataV1): SessionData {
    return {
      version: 2,
      agents: data.terminals.map(t => ({
        id: t.id,
        label: t.label,
        cwd: t.cwd,
        openFiles: t.openFiles.map(f => ({
          id: f.id,
          path: f.path,
          name: f.name,
          parentAgentId: f.parentTerminalId,
        })),
      })),
      activeItemId: data.activeItemId,
      activeAgentId: data.activeTerminalId,
      activeConversationId: null,
    };
  }

  private migrateV2ToV3(data: Omit<SessionData, 'activeConversationId'> & { version: 2 }): SessionData {
    return {
      ...data,
      version: 3,
      activeConversationId: null,
    };
  }

  private migrateV3ToV4(data: SessionData & { version: 3 }): SessionData {
    return {
      ...data,
      version: 4,
      agentNotes: {},
    };
  }

  private migrateV4ToV5(data: SessionData & { version: 4 }): SessionData {
    return {
      ...data,
      version: 5,
      showHiddenFiles: false,
    };
  }

  load(): SessionData | null {
    try {
      this.migrateLegacySessionIfNeeded();
      const sessionPath = this.getReadableSessionPath();

      if (!sessionPath) {
        return null;
      }

      const content = fs.readFileSync(sessionPath, 'utf-8');
      let data = JSON.parse(content);

      // Migrate v1 to v2
      if (data.version === 1) {
        console.log('Migrating session data from v1 to v2');
        data = this.migrateV1ToV2(data as LegacySessionDataV1);
      }

      // Migrate v2 to v3
      if (data.version === 2) {
        console.log('Migrating session data from v2 to v3');
        data = this.migrateV2ToV3(data);
      }

      // Migrate v3 to v4
      if (data.version === 3) {
        console.log('Migrating session data from v3 to v4');
        data = this.migrateV3ToV4(data);
      }

      // Migrate v4 to v5
      if (data.version === 4) {
        console.log('Migrating session data from v4 to v5');
        data = this.migrateV4ToV5(data);
      }

      // Validate version
      if (data.version !== SESSION_VERSION) {
        console.warn('Session version mismatch, starting fresh');
        return null;
      }

      // Validate structure
      if (!Array.isArray(data.agents)) {
        return null;
      }

      // Filter out agents with non-existent directories
      data.agents = data.agents.filter((agent: SessionAgent) => {
        if (!fs.existsSync(agent.cwd)) {
          console.warn(`Agent directory no longer exists: ${agent.cwd}`);
          return false;
        }
        return true;
      });

      // Filter out non-existent files from each agent
      data.agents = data.agents.map((agent: SessionAgent) => ({
        ...agent,
        openFiles: agent.openFiles.filter(file => {
          if (!fs.existsSync(file.path)) {
            console.warn(`File no longer exists: ${file.path}`);
            return false;
          }
          return true;
        }),
      }));

      // Fix activeAgentId if it points to a removed agent
      if (data.activeAgentId && !data.agents.find((a: SessionAgent) => a.id === data.activeAgentId)) {
        data.activeAgentId = data.agents[0]?.id ?? null;
      }

      // Fix activeItemId if it points to a removed item
      if (data.activeItemId) {
        const isValidAgent = data.agents.some((a: SessionAgent) => a.id === data.activeItemId);
        const isValidFile = data.agents.some((a: SessionAgent) => 
          a.openFiles.some(f => f.id === data.activeItemId)
        );
        if (!isValidAgent && !isValidFile) {
          data.activeItemId = data.activeAgentId;
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }
}

export const sessionService = new SessionService();
