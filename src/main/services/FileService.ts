import * as fs from 'fs';
import * as path from 'path';
import type { FileEntry } from '../../shared/types';

export type { FileEntry };

class FileService {
  private allowedRoots: Set<string> = new Set();

  addAllowedRoot(rootPath: string): void {
    const normalized = path.resolve(rootPath);
    this.allowedRoots.add(normalized);
  }

  isPathAllowed(targetPath: string): boolean {
    const normalized = path.resolve(targetPath);
    for (const root of this.allowedRoots) {
      if (normalized === root || normalized.startsWith(root + path.sep)) {
        return true;
      }
    }
    return false;
  }

  async readDirectory(dirPath: string, options?: { showHidden?: boolean }): Promise<FileEntry[]> {
    if (!this.isPathAllowed(dirPath)) {
      console.error('Access denied: path outside allowed roots:', dirPath);
      return [];
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      const fileEntries: FileEntry[] = entries
        .filter(entry => options?.showHidden || !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
          isDirectory: entry.isDirectory(),
        }))
        .sort((a, b) => {
          // Directories first, then alphabetically
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

      return fileEntries;
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: path outside allowed roots');
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

}

export const fileService = new FileService();
