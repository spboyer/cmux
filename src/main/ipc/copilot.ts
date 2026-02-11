import { ipcMain, BrowserWindow } from 'electron';
import { CopilotService } from '../services/CopilotService';
import { createOrchestratorTools, setOnAgentCreated, getActiveAgents, registerAgent, ORCHESTRATOR_SYSTEM_MESSAGE } from '../services/OrchestratorTools';

const copilotService = new CopilotService();
let toolsInitialized = false;

async function ensureToolsInitialized(mainWindow: BrowserWindow): Promise<void> {
  if (toolsInitialized) return;
  toolsInitialized = true;

  try {
    const tools = await createOrchestratorTools();
    copilotService.setTools(tools);
    copilotService.setSystemMessage(ORCHESTRATOR_SYSTEM_MESSAGE);
    copilotService.setAgentContextProvider(getActiveAgents);

    // When orchestrator creates an agent, notify renderer to add it to UI
    setOnAgentCreated((info) => {
      mainWindow.webContents.send('orchestrator:agent-created', info);
    });
  } catch (err) {
    console.error('Failed to initialize orchestrator tools:', err);
    toolsInitialized = false;
  }
}

export function setupCopilotIPC(mainWindow: BrowserWindow): void {
  ipcMain.handle('copilot:listModels', async () => {
    return copilotService.listModels();
  });

  ipcMain.handle('orchestrator:register-agent', (_event, agentId: string, label: string, cwd: string) => {
    registerAgent(agentId, label, cwd);
  });

  ipcMain.handle('copilot:send', async (_event, conversationId: string, message: string, messageId: string, model?: string) => {
    // Lazy-init tools on first send
    await ensureToolsInitialized(mainWindow);

    await copilotService.sendMessage(
      conversationId,
      message,
      messageId,
      (msgId, content) => {
        mainWindow.webContents.send('copilot:chunk', msgId, content);
      },
      (msgId) => {
        mainWindow.webContents.send('copilot:done', msgId);
      },
      (msgId, error) => {
        mainWindow.webContents.send('copilot:error', msgId, error);
      },
      model,
    );
  });

  ipcMain.handle('copilot:stop', async (_event, conversationId: string, messageId: string) => {
    await copilotService.cancelMessage(
      conversationId,
      messageId,
      (msgId) => {
        mainWindow.webContents.send('copilot:done', msgId);
      },
    );
  });
}

export function getCopilotService(): CopilotService {
  return copilotService;
}
