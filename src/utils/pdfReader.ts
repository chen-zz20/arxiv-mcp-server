import fs from 'fs/promises';
import { PaperContent } from '../types/index.js';
import logger from './logger.js';
import { parsePdf } from './pdfParser.js';

export class PdfReader {
  async readPaperContent(filePath: string, paperId: string, title: string): Promise<PaperContent> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await parsePdf(dataBuffer);
      
      const fullText = data.text;
      const sections = this.extractSections(fullText);
      
      return {
        id: paperId,
        title,
        sections,
        fullText
      };
    } catch (error) {
      logger.error(`Error reading PDF ${filePath}:`, error);
      throw new Error(`Failed to read PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractSections(text: string): PaperContent['sections'] {
    const sections: PaperContent['sections'] = {};
    
    // Common section patterns in academic papers
    const sectionPatterns = [
      { name: 'abstract', patterns: [/abstract\s*\n/i, /summary\s*\n/i] },
      { name: 'introduction', patterns: [/introduction\s*\n/i, /\n1\.\s*introduction/i] },
      { name: 'methodology', patterns: [/methodology\s*\n/i, /methods\s*\n/i, /approach\s*\n/i] },
      { name: 'results', patterns: [/results\s*\n/i, /findings\s*\n/i, /experiments\s*\n/i] },
      { name: 'discussion', patterns: [/discussion\s*\n/i, /analysis\s*\n/i] },
      { name: 'conclusion', patterns: [/conclusion\s*\n/i, /conclusions\s*\n/i, /summary\s*\n/i] },
      { name: 'references', patterns: [/references\s*\n/i, /bibliography\s*\n/i] }
    ];

    const lines = text.split('\n');
    let currentSection: string | null = null;
    let currentContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let foundSection = false;
      
      // Check if this line marks the start of a new section
      for (const section of sectionPatterns) {
        for (const pattern of section.patterns) {
          if (pattern.test(line)) {
            // Save previous section if exists
            if (currentSection && currentContent.length > 0) {
              sections[currentSection] = currentContent.join('\n').trim();
            }
            
            currentSection = section.name;
            currentContent = [];
            foundSection = true;
            break;
          }
        }
        if (foundSection) break;
      }
      
      // If we're in a section and didn't find a new section header, add to current content
      if (currentSection && !foundSection) {
        currentContent.push(line);
      }
    }
    
    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    
    // Try to extract abstract from the beginning if not found
    if (!sections.abstract) {
      const abstractMatch = text.match(/abstract[:\s]*(.+?)(?=\n\s*\n|\nintroduction|\n1\.|keywords)/is);
      if (abstractMatch) {
        sections.abstract = abstractMatch[1].trim();
      }
    }
    
    return sections;
  }

  searchInPaper(content: PaperContent, searchTerm: string, caseSensitive: boolean = false): Array<{
    section: string;
    matches: Array<{ text: string; position: number }>
  }> {
    const results: Array<{
      section: string;
      matches: Array<{ text: string; position: number }>
    }> = [];
    
    const flags = caseSensitive ? 'g' : 'gi';
    const searchRegex = new RegExp(searchTerm, flags);
    
    // Search in sections
    for (const [sectionName, sectionContent] of Object.entries(content.sections)) {
      if (!sectionContent) continue;
      
      const matches: Array<{ text: string; position: number }> = [];
      let match;
      
      while ((match = searchRegex.exec(sectionContent)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(sectionContent.length, match.index + searchTerm.length + 50);
        const context = sectionContent.substring(start, end);
        
        matches.push({
          text: context,
          position: match.index
        });
      }
      
      if (matches.length > 0) {
        results.push({
          section: sectionName,
          matches
        });
      }
    }
    
    return results;
  }

  extractCitations(content: PaperContent): string[] {
    const citations: Set<string> = new Set();
    
    // Look for references section
    const referencesText = content.sections.references || '';
    
    // Common citation patterns
    const citationPatterns = [
      /\[(\d+)\]\s+(.+?)(?=\[\d+\]|$)/g,  // [1] Author et al...
      /^\d+\.\s+(.+?)(?=^\d+\.|$)/gm,     // 1. Author et al...
      /^(.+?)\s*\(\d{4}\)/gm              // Author et al. (2023)
    ];
    
    for (const pattern of citationPatterns) {
      let match;
      while ((match = pattern.exec(referencesText)) !== null) {
        const citation = match[1] || match[0];
        if (citation.length > 10 && citation.length < 500) {
          citations.add(citation.trim());
        }
      }
    }
    
    // Also look for DOIs
    const doiPattern = /10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+/g;
    let doiMatch;
    while ((doiMatch = doiPattern.exec(content.fullText)) !== null) {
      citations.add(`DOI: ${doiMatch[0]}`);
    }
    
    return Array.from(citations);
  }
}

// Singleton instance
export const pdfReader = new PdfReader();
