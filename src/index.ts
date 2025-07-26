#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';
const RATE_LIMIT_DELAY = 3000; // 3 seconds as recommended by arXiv

interface ArxivEntry {
  id: string;
  updated: string;
  published: string;
  title: string;
  summary: string;
  authors: Array<{ name: string; affiliation?: string }>;
  categories: string[];
  primaryCategory: string;
  links: Array<{ href: string; type?: string; title?: string }>;
  comment?: string;
  journalRef?: string;
  doi?: string;
}

interface SearchResult {
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  entries: ArxivEntry[];
}

class ArxivServer {
  private server: Server;
  private lastRequestTime: number = 0;

  constructor() {
    this.server = new Server(
      {
        name: 'arxiv-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private parseArxivResponse(data: any): SearchResult {
    const feed = data.feed;
    const entries = feed.entry || [];
    
    return {
      totalResults: parseInt(feed['opensearch:totalResults']?.[0] || '0'),
      startIndex: parseInt(feed['opensearch:startIndex']?.[0] || '0'),
      itemsPerPage: parseInt(feed['opensearch:itemsPerPage']?.[0] || '0'),
      entries: (Array.isArray(entries) ? entries : [entries]).map((entry: any) => ({
        id: entry.id[0],
        updated: entry.updated[0],
        published: entry.published[0],
        title: entry.title[0].trim(),
        summary: entry.summary[0].trim(),
        authors: (entry.author || []).map((author: any) => ({
          name: author.name[0],
          affiliation: author['arxiv:affiliation']?.[0]?.['_'],
        })),
        categories: (entry.category || []).map((cat: any) => cat['$'].term),
        primaryCategory: entry['arxiv:primary_category']?.[0]?.['$']?.term || '',
        links: (entry.link || []).map((link: any) => ({
          href: link['$'].href,
          type: link['$'].type,
          title: link['$'].title,
        })),
        comment: entry['arxiv:comment']?.[0],
        journalRef: entry['arxiv:journal_ref']?.[0],
        doi: entry['arxiv:doi']?.[0],
      })),
    };
  }

  private formatSearchQuery(params: any): string {
    const parts: string[] = [];
    
    if (params.title) {
      parts.push(`ti:"${params.title}"`);
    }
    if (params.author) {
      parts.push(`au:"${params.author}"`);
    }
    if (params.abstract) {
      parts.push(`abs:"${params.abstract}"`);
    }
    if (params.category) {
      parts.push(`cat:${params.category}`);
    }
    if (params.all) {
      parts.push(`all:"${params.all}"`);
    }
    
    // If no specific fields, use the query parameter as-is
    if (parts.length === 0 && params.query) {
      return params.query;
    }
    
    return parts.join(' AND ');
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_papers',
          description: 'Search for papers on arXiv using various criteria',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Raw search query (use this OR the specific fields below)',
              },
              title: {
                type: 'string',
                description: 'Search in paper titles',
              },
              author: {
                type: 'string',
                description: 'Search by author name',
              },
              abstract: {
                type: 'string',
                description: 'Search in abstracts',
              },
              category: {
                type: 'string',
                description: 'Filter by category (e.g., cs.AI, math.CO)',
              },
              all: {
                type: 'string',
                description: 'Search in all fields',
              },
              start: {
                type: 'number',
                description: 'Starting index (0-based)',
                default: 0,
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results (max 2000)',
                default: 10,
              },
              sortBy: {
                type: 'string',
                enum: ['relevance', 'lastUpdatedDate', 'submittedDate'],
                description: 'Sort order for results',
                default: 'relevance',
              },
              sortOrder: {
                type: 'string',
                enum: ['ascending', 'descending'],
                description: 'Sort direction',
                default: 'descending',
              },
            },
          },
        },
        {
          name: 'get_paper_by_id',
          description: 'Get specific paper(s) by arXiv ID',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of arXiv IDs (e.g., ["2301.00001", "hep-th/9901001"])',
              },
            },
            required: ['ids'],
          },
        },
        {
          name: 'get_recent_papers',
          description: 'Get the most recent papers in a category',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Category to filter by (e.g., cs.AI, physics.quant-ph)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results',
                default: 10,
              },
            },
            required: ['category'],
          },
        },
        {
          name: 'search_author',
          description: 'Find all papers by a specific author',
          inputSchema: {
            type: 'object',
            properties: {
              author: {
                type: 'string',
                description: 'Author name to search for',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results',
                default: 20,
              },
              sortBy: {
                type: 'string',
                enum: ['submittedDate', 'lastUpdatedDate'],
                default: 'submittedDate',
              },
            },
            required: ['author'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_papers':
            return await this.searchPapers(args);
          case 'get_paper_by_id':
            return await this.getPaperById(args);
          case 'get_recent_papers':
            return await this.getRecentPapers(args);
          case 'search_author':
            return await this.searchAuthor(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async searchPapers(args: any) {
    await this.enforceRateLimit();

    const searchQuery = this.formatSearchQuery(args);
    const params = new URLSearchParams({
      search_query: searchQuery,
      start: String(args.start || 0),
      max_results: String(Math.min(args.maxResults || 10, 2000)),
    });

    if (args.sortBy) {
      params.append('sortBy', args.sortBy);
    }
    if (args.sortOrder) {
      params.append('sortOrder', args.sortOrder);
    }

    const response = await axios.get(`${ARXIV_API_BASE}?${params}`);
    const parsed = await parseStringPromise(response.data);
    const result = this.parseArxivResponse(parsed);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalResults: result.totalResults,
            showing: `${result.startIndex + 1}-${result.startIndex + result.entries.length}`,
            papers: result.entries.map(entry => ({
              id: entry.id.split('/').pop(),
              title: entry.title,
              authors: entry.authors.map(a => a.name).join(', '),
              published: entry.published.split('T')[0],
              categories: entry.categories,
              summary: entry.summary.substring(0, 200) + '...',
              pdfUrl: entry.links.find(l => l.type === 'application/pdf')?.href,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async getPaperById(args: any) {
    await this.enforceRateLimit();

    const ids = args.ids.join(',');
    const params = new URLSearchParams({
      id_list: ids,
    });

    const response = await axios.get(`${ARXIV_API_BASE}?${params}`);
    const parsed = await parseStringPromise(response.data);
    const result = this.parseArxivResponse(parsed);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            papers: result.entries.map(entry => ({
              id: entry.id.split('/').pop(),
              title: entry.title,
              authors: entry.authors,
              published: entry.published,
              updated: entry.updated,
              categories: entry.categories,
              primaryCategory: entry.primaryCategory,
              summary: entry.summary,
              comment: entry.comment,
              journalRef: entry.journalRef,
              doi: entry.doi,
              links: entry.links,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async getRecentPapers(args: any) {
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      search_query: `cat:${args.category}`,
      max_results: String(args.maxResults || 10),
      sortBy: 'submittedDate',
      sortOrder: 'descending',
    });

    const response = await axios.get(`${ARXIV_API_BASE}?${params}`);
    const parsed = await parseStringPromise(response.data);
    const result = this.parseArxivResponse(parsed);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            category: args.category,
            totalPapers: result.totalResults,
            recentPapers: result.entries.map(entry => ({
              id: entry.id.split('/').pop(),
              title: entry.title,
              authors: entry.authors.map(a => a.name).join(', '),
              submitted: entry.published.split('T')[0],
              summary: entry.summary.substring(0, 200) + '...',
              pdfUrl: entry.links.find(l => l.type === 'application/pdf')?.href,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async searchAuthor(args: any) {
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      search_query: `au:"${args.author}"`,
      max_results: String(args.maxResults || 20),
      sortBy: args.sortBy || 'submittedDate',
      sortOrder: 'descending',
    });

    const response = await axios.get(`${ARXIV_API_BASE}?${params}`);
    const parsed = await parseStringPromise(response.data);
    const result = this.parseArxivResponse(parsed);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            author: args.author,
            totalPapers: result.totalResults,
            papers: result.entries.map(entry => ({
              id: entry.id.split('/').pop(),
              title: entry.title,
              allAuthors: entry.authors.map(a => a.name).join(', '),
              published: entry.published.split('T')[0],
              categories: entry.categories,
              pdfUrl: entry.links.find(l => l.type === 'application/pdf')?.href,
            })),
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('arXiv MCP server running on stdio');
  }
}

const server = new ArxivServer();
server.run().catch(console.error);
