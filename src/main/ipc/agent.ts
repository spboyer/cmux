import { ipcMain, BrowserWindow } from 'electron';
import { agentService } from '../services/AgentService';
import { fileService } from '../services/FileService';

export function setupAgentIPC(mainWindow: BrowserWindow): void {
  // Track which agents have IPC handlers set up
  const agentsWithHandlers = new Set<string>();

  // Create a new agent
  ipcMain.handle('agent:create', (_event, id: string, cwd: string, initialCommand?: string) => {
    agentService.create(id, cwd, initialCommand);
    
    // Detect if this is a git worktree
    const isWorktree = agentService.isGitWorktree(cwd);
    
    // Register cwd as allowed root for file access
    fileService.addAllowedRoot(cwd);
    
    // Only set up handlers once per agent to prevent duplicate events
    if (!agentsWithHandlers.has(id)) {
      agentsWithHandlers.add(id);
      
      // Set up data handler to send output to renderer
      agentService.onData(id, (data) => {
        mainWindow.webContents.send('agent:data', id, data);
      });

      // Set up exit handler
      agentService.onExit(id, (exitCode) => {
        mainWindow.webContents.send('agent:exit', id, exitCode);
        agentsWithHandlers.delete(id);
      });
    }

    return { id, isWorktree };
  });

  // Write to agent
  ipcMain.handle('agent:write', (_event, id: string, data: string) => {
    agentService.write(id, data);
  });

  // Resize agent
  ipcMain.handle('agent:resize', (_event, id: string, cols: number, rows: number) => {
    agentService.resize(id, cols, rows);
  });

  // Kill agent
  ipcMain.handle('agent:kill', (_event, id: string) => {
    agentService.kill(id);
    agentsWithHandlers.delete(id);
  });
}
