import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { DownloadedPaper } from '../types/index.js';
import { 
  STORAGE_DIR, 
  METADATA_FILE, 
  ensureDirectoryExists, 
  sanitizeFilename,
  readJsonFile,
  writeJsonFile,
  getFileSize,
  formatFileSize
} from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export class StorageManager {
  private metadata: Map<string, DownloadedPaper> = new Map();

  async initialize(): Promise<void> {
    await ensureDirectoryExists(STORAGE_DIR);
    await this.loadMetadata();
  }

  private async loadMetadata(): Promise<void> {
    const data = await readJsonFile<Record<string, DownloadedPaper>>(METADATA_FILE);
    if (data) {
      this.metadata = new Map(Object.entries(data));
      logger.info(`Loaded metadata for ${this.metadata.size} papers`);
    }
  }

  private async saveMetadata(): Promise<void> {
    const data = Object.fromEntries(this.metadata.entries());
    await writeJsonFile(METADATA_FILE, data);
  }

  async downloadPaper(
    arxivId: string,
    pdfUrl: string,
    paperInfo: {
      title: string;
      authors: string[];
      categories: string[];
      abstract: string;
    }
  ): Promise<DownloadedPaper> {
    try {
      // Check if already downloaded
      const existing = this.metadata.get(arxivId);
      if (existing) {
        // Check if file still exists
        try {
          await fs.access(existing.filePath);
          logger.info(`Paper ${arxivId} already downloaded`);
          return existing;
        } catch {
          // File doesn't exist, re-download
          logger.info(`Re-downloading paper ${arxivId} (file not found)`);
        }
      }

      // Download the PDF
      logger.info(`Downloading paper ${arxivId} from ${pdfUrl}`);
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      
      // Create filename
      const filename = `${arxivId.replace('/', '_')}_${sanitizeFilename(paperInfo.title)}.pdf`;
      const filePath = path.join(STORAGE_DIR, filename);
      
      // Save the file
      await fs.writeFile(filePath, buffer);
      
      // Get file size
      const fileSize = await getFileSize(filePath);
      
      // Create metadata entry
      const downloadedPaper: DownloadedPaper = {
        id: arxivId,
        title: paperInfo.title,
        authors: paperInfo.authors,
        downloadDate: new Date().toISOString(),
        filePath,
        fileSize,
        categories: paperInfo.categories,
        abstract: paperInfo.abstract
      };
      
      // Update metadata
      this.metadata.set(arxivId, downloadedPaper);
      await this.saveMetadata();
      
      logger.info(`Successfully downloaded paper ${arxivId} (${formatFileSize(fileSize)})`);
      return downloadedPaper;
      
    } catch (error) {
      logger.error(`Error downloading paper ${arxivId}:`, error);
      throw error;
    }
  }

  async listDownloadedPapers(): Promise<DownloadedPaper[]> {
    const papers: DownloadedPaper[] = [];
    
    for (const [id, paper] of this.metadata.entries()) {
      try {
        // Check if file still exists
        await fs.access(paper.filePath);
        papers.push(paper);
      } catch {
        // File doesn't exist, remove from metadata
        logger.warn(`Removing metadata for missing file: ${paper.filePath}`);
        this.metadata.delete(id);
      }
    }
    
    // Save updated metadata if any files were removed
    if (papers.length !== this.metadata.size) {
      await this.saveMetadata();
    }
    
    return papers;
  }

  async deletePaper(arxivId: string): Promise<boolean> {
    const paper = this.metadata.get(arxivId);
    if (!paper) {
      return false;
    }

    try {
      await fs.unlink(paper.filePath);
      this.metadata.delete(arxivId);
      await this.saveMetadata();
      logger.info(`Deleted paper ${arxivId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting paper ${arxivId}:`, error);
      return false;
    }
  }

  async getStorageStats(): Promise<{
    totalPapers: number;
    totalSize: number;
    formattedSize: string;
  }> {
    const papers = await this.listDownloadedPapers();
    const totalSize = papers.reduce((sum, paper) => sum + paper.fileSize, 0);
    
    return {
      totalPapers: papers.length,
      totalSize,
      formattedSize: formatFileSize(totalSize)
    };
  }

  async cleanupOldPapers(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    const papers = await this.listDownloadedPapers();
    
    for (const paper of papers) {
      const downloadDate = new Date(paper.downloadDate);
      if (downloadDate < cutoffDate) {
        const deleted = await this.deletePaper(paper.id);
        if (deleted) {
          deletedCount++;
        }
      }
    }
    
    logger.info(`Cleaned up ${deletedCount} papers older than ${daysOld} days`);
    return deletedCount;
  }
}

// Singleton instance
export const storageManager = new StorageManager();
