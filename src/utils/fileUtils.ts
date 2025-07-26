import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const STORAGE_DIR = path.join(__dirname, '../../storage');
export const METADATA_FILE = path.join(STORAGE_DIR, 'metadata.json');

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are invalid in filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200); // Limit filename length
}

export function getArxivIdFromUrl(url: string): string | null {
  // Extract arXiv ID from various URL formats
  const patterns = [
    /arxiv\.org\/abs\/(\d{4}\.\d{4,5})/,
    /arxiv\.org\/pdf\/(\d{4}\.\d{4,5})/,
    /arxiv\.org\/abs\/([a-z-]+\/\d{7})/,
    /arxiv\.org\/pdf\/([a-z-]+\/\d{7})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      logger.error(`Error reading JSON file ${filePath}:`, error);
    }
    return null;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
}

export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    logger.error(`Error getting file size for ${filePath}:`, error);
    return 0;
  }
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
