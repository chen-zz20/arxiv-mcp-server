import { AnalysisPrompt } from '../types/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readJsonFile, writeJsonFile, ensureDirectoryExists } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROMPTS_DIR = path.join(__dirname, '../../prompts');
const PROMPTS_FILE = path.join(PROMPTS_DIR, 'prompts.json');

export class PromptManager {
  private prompts: Map<string, AnalysisPrompt> = new Map();

  async initialize(): Promise<void> {
    await ensureDirectoryExists(PROMPTS_DIR);
    await this.loadPrompts();
    
    // If no prompts exist, create default ones
    if (this.prompts.size === 0) {
      await this.createDefaultPrompts();
    }
  }

  private async loadPrompts(): Promise<void> {
    const data = await readJsonFile<Record<string, AnalysisPrompt>>(PROMPTS_FILE);
    if (data) {
      this.prompts = new Map(Object.entries(data));
      logger.info(`Loaded ${this.prompts.size} analysis prompts`);
    }
  }

  private async savePrompts(): Promise<void> {
    const data = Object.fromEntries(this.prompts.entries());
    await writeJsonFile(PROMPTS_FILE, data);
  }

  private async createDefaultPrompts(): Promise<void> {
    const defaultPrompts: AnalysisPrompt[] = [
      {
        id: 'summary',
        name: 'Paper Summary',
        description: 'Generate a comprehensive summary of the paper',
        template: `Please provide a comprehensive summary of the following paper:

Title: {{title}}
Authors: {{authors}}
Abstract: {{abstract}}

Please include:
1. Main research question or problem addressed
2. Key methodology used
3. Principal findings and results
4. Main contributions to the field
5. Limitations and future work suggested

Keep the summary concise but informative, suitable for someone who wants to quickly understand the paper's essence.`,
        variables: ['title', 'authors', 'abstract']
      },
      {
        id: 'key_findings',
        name: 'Key Findings Extraction',
        description: 'Extract and highlight the key findings from the paper',
        template: `Based on this paper:

Title: {{title}}
Abstract: {{abstract}}

Please extract and list:
1. The 3-5 most important findings or results
2. For each finding, explain its significance
3. Any surprising or counterintuitive results
4. How these findings advance the current state of knowledge

Format as bullet points for easy reading.`,
        variables: ['title', 'abstract']
      },
      {
        id: 'methodology_analysis',
        name: 'Methodology Analysis',
        description: 'Analyze the research methodology used in the paper',
        template: `Analyze the methodology of this research paper:

Title: {{title}}
Abstract: {{abstract}}

Please provide:
1. Research design and approach (experimental, theoretical, computational, etc.)
2. Data collection methods (if applicable)
3. Analysis techniques used
4. Strengths of the methodology
5. Potential limitations or biases
6. How the methodology compares to standard practices in the field

Be specific and critical in your analysis.`,
        variables: ['title', 'abstract']
      },
      {
        id: 'literature_review',
        name: 'Literature Review Helper',
        description: 'Help create a literature review entry for this paper',
        template: `Create a literature review entry for:

Title: {{title}}
Authors: {{authors}}
Year: {{year}}
Abstract: {{abstract}}

Please provide:
1. A one-paragraph summary suitable for a literature review
2. Key concepts and theories introduced or used
3. How this work relates to and builds upon previous research
4. The gap in knowledge this paper addresses
5. Suggested citation format (APA style)

Make it suitable for inclusion in an academic literature review section.`,
        variables: ['title', 'authors', 'year', 'abstract']
      },
      {
        id: 'research_gaps',
        name: 'Research Gap Identifier',
        description: 'Identify research gaps and future directions suggested by the paper',
        template: `Identify research gaps from this paper:

Title: {{title}}
Abstract: {{abstract}}

Please analyze and list:
1. Explicitly mentioned limitations of the current work
2. Future research directions suggested by the authors
3. Implicit gaps that could be addressed
4. Potential follow-up studies or experiments
5. Interdisciplinary opportunities this work opens up

Format as actionable research questions or project ideas.`,
        variables: ['title', 'abstract']
      },
      {
        id: 'technical_deep_dive',
        name: 'Technical Deep Dive',
        description: 'Provide a detailed technical analysis of the paper',
        template: `Provide a technical deep dive for:

Title: {{title}}
Categories: {{categories}}
Abstract: {{abstract}}

Please analyze:
1. Core algorithms or techniques used (with complexity analysis if applicable)
2. Mathematical foundations and key equations
3. Implementation details mentioned
4. Experimental setup and parameters
5. Performance metrics and benchmarks
6. Reproducibility - what would be needed to replicate this work?

Be as technical and specific as possible.`,
        variables: ['title', 'categories', 'abstract']
      },
      {
        id: 'comparison',
        name: 'Comparative Analysis',
        description: 'Compare this paper with related work',
        template: `Perform a comparative analysis:

Title: {{title}}
Abstract: {{abstract}}

Please:
1. Identify 3-5 closely related papers or approaches (based on the abstract)
2. Compare the methodology with these related works
3. Highlight what makes this approach unique or novel
4. Discuss advantages and disadvantages compared to alternatives
5. Assess the significance of improvements claimed

Provide a balanced, objective comparison.`,
        variables: ['title', 'abstract']
      },
      {
        id: 'practical_applications',
        name: 'Practical Applications',
        description: 'Identify practical applications and real-world impact',
        template: `Analyze practical applications for:

Title: {{title}}
Abstract: {{abstract}}

Please identify:
1. Direct practical applications of this research
2. Industries or domains that could benefit
3. Potential products or services that could emerge
4. Timeline for practical implementation (near-term vs long-term)
5. Barriers to practical adoption
6. Societal impact (positive and potential negative)

Be specific and realistic in your assessment.`,
        variables: ['title', 'abstract']
      }
    ];

    for (const prompt of defaultPrompts) {
      this.prompts.set(prompt.id, prompt);
    }

    await this.savePrompts();
    logger.info('Created default analysis prompts');
  }

  getPrompt(promptId: string): AnalysisPrompt | undefined {
    return this.prompts.get(promptId);
  }

  getAllPrompts(): AnalysisPrompt[] {
    return Array.from(this.prompts.values());
  }

  applyPromptTemplate(prompt: AnalysisPrompt, variables: Record<string, string>): string {
    let result = prompt.template;
    
    for (const variable of prompt.variables) {
      const value = variables[variable] || `[${variable} not provided]`;
      result = result.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    }
    
    return result;
  }

  async addCustomPrompt(prompt: AnalysisPrompt): Promise<void> {
    this.prompts.set(prompt.id, prompt);
    await this.savePrompts();
    logger.info(`Added custom prompt: ${prompt.id}`);
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    // Don't allow deletion of default prompts
    const defaultIds = ['summary', 'key_findings', 'methodology_analysis', 'literature_review', 
                       'research_gaps', 'technical_deep_dive', 'comparison', 'practical_applications'];
    
    if (defaultIds.includes(promptId)) {
      logger.warn(`Cannot delete default prompt: ${promptId}`);
      return false;
    }

    if (this.prompts.delete(promptId)) {
      await this.savePrompts();
      logger.info(`Deleted prompt: ${promptId}`);
      return true;
    }
    
    return false;
  }
}

// Singleton instance
export const promptManager = new PromptManager();
