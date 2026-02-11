import { app } from 'electron';
import * as path from 'path';

export function getUserDataDir(): string {
  return app.getPath('userData');
}

export function getStateDir(): string {
  return path.join(getUserDataDir(), 'state');
}

export function getConversationsDir(): string {
  return path.join(getStateDir(), 'conversations');
}

export function getSessionPath(): string {
  return path.join(getStateDir(), 'session.json');
}

export function getLogsDir(): string {
  return path.join(getUserDataDir(), 'logs');
}

export function getCopilotChatLogPath(): string {
  return path.join(getLogsDir(), 'copilot-chat.log');
}

export function getCopilotLogsDir(): string {
  return path.join(getUserDataDir(), 'copilot', 'logs');
}
