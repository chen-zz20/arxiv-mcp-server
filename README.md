# arXiv MCP Server

An enhanced Model Context Protocol (MCP) server that provides comprehensive access to arXiv for searching, downloading, reading, and analyzing scientific papers with AI-powered research prompts.

## Overview

This MCP server enables AI assistants to not only search and retrieve scientific papers from arXiv but also download them locally, extract content, and generate research-oriented analysis prompts. Perfect for researchers, students, and anyone working with academic literature.

## Features

### Core Features
- **Search papers** by title, author, abstract, category, or any combination
- **Retrieve papers** by their arXiv ID
- **Get recent papers** in specific categories
- **Find all papers** by a specific author
- **Rate limiting** compliance with arXiv API guidelines

### Enhanced Features (v1.1.0)
- **📥 Paper Download & Storage**: Download and store papers locally with metadata tracking
- **📖 PDF Content Reading**: Extract and read text content from downloaded papers
- **🔍 In-Paper Search**: Search for specific terms within downloaded papers
- **🤖 AI Research Prompts**: Pre-configured analysis prompts for paper summarization, methodology analysis, and more
- **📊 Storage Management**: Track storage usage and manage downloaded papers
- **🔧 Enhanced Error Handling**: Robust error handling with retry logic
- **📝 Structured Logging**: Winston-based logging with configurable levels

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Option 1: Install from npm

```bash
npm install -g @arxiv/mcp-server
```

Then run:
```bash
arxiv-mcp-server
```

### Option 2: Install from Source

1. Clone this repository:
```bash
git clone https://github.com/MaksPyn/arxiv-mcp-server.git
cd arxiv-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

### Option 3: Docker

1. Using Docker Compose:
```bash
cd docker
docker-compose up -d
```

2. Using Docker directly:
```bash
docker build -t arxiv-mcp-server -f docker/Dockerfile .
docker run -it --name arxiv-mcp-server arxiv-mcp-server
```

### Configuration

Copy the example environment file and customize as needed:
```bash
cp config/.env.example .env
```

Available configuration options:
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `STORAGE_DIR`: Directory for storing downloaded papers
- `MAX_STORAGE_SIZE_MB`: Maximum storage size for papers
- `RATE_LIMIT_DELAY_MS`: Delay between API requests (default: 3000ms)

## Usage

### Running the Server

Start the server using:
```bash
npm start
```

Or for development (build + run):
```bash
npm run dev
```

### Integrating with Claude Desktop

Add the following to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "arxiv": {
      "command": "node",
      "args": ["C:/path/to/arxiv-server/build/index.js"]
    }
  }
}
```

Replace `C:/path/to/arxiv-server` with the actual path to your arxiv-server directory.

## Available Tools

### 1. `search_papers`

Search for papers using various criteria.

**Parameters:**
- `query` (string, optional): Raw search query
- `title` (string, optional): Search in paper titles
- `author` (string, optional): Search by author name
- `abstract` (string, optional): Search in abstracts
- `category` (string, optional): Filter by category (e.g., "cs.AI", "math.CO")
- `all` (string, optional): Search in all fields
- `start` (number, optional): Starting index (default: 0)
- `maxResults` (number, optional): Maximum results to return, max 2000 (default: 10)
- `sortBy` (string, optional): Sort by "relevance", "lastUpdatedDate", or "submittedDate" (default: "relevance")
- `sortOrder` (string, optional): "ascending" or "descending" (default: "descending")

**Example:**
```json
{
  "title": "neural networks",
  "category": "cs.AI",
  "maxResults": 5
}
```

### 2. `get_paper_by_id`

Retrieve specific papers by their arXiv IDs.

**Parameters:**
- `ids` (array of strings, required): Array of arXiv IDs

**Example:**
```json
{
  "ids": ["2301.00001", "2312.12345"]
}
```

### 3. `get_recent_papers`

Get the most recent papers in a specific category.

**Parameters:**
- `category` (string, required): Category to filter by (e.g., "cs.AI", "physics.quant-ph")
- `maxResults` (number, optional): Maximum results (default: 10)

**Example:**
```json
{
  "category": "cs.LG",
  "maxResults": 20
}
```

### 4. `search_author`

Find all papers by a specific author.

**Parameters:**
- `author` (string, required): Author name to search for
- `maxResults` (number, optional): Maximum results (default: 20)
- `sortBy` (string, optional): "submittedDate" or "lastUpdatedDate" (default: "submittedDate")

**Example:**
```json
{
  "author": "Yann LeCun",
  "maxResults": 10
}
```

### 5. `download_paper`

Download a paper PDF and store it locally.

**Parameters:**
- `arxivId` (string, required): arXiv ID of the paper to download

**Example:**
```json
{
  "arxivId": "2301.00001"
}
```

### 6. `list_downloaded_papers`

List all locally downloaded papers with metadata.

**Parameters:** None

### 7. `delete_paper`

Delete a downloaded paper from local storage.

**Parameters:**
- `arxivId` (string, required): arXiv ID of the paper to delete

### 8. `get_storage_stats`

Get storage statistics for downloaded papers.

**Parameters:** None

**Returns:**
- Total number of papers
- Total storage size
- Formatted size string

### 9. `read_paper_content`

Read and extract text content from a downloaded paper.

**Parameters:**
- `arxivId` (string, required): arXiv ID of the paper to read

**Returns:**
- Extracted sections (abstract, introduction, methodology, results, discussion, conclusion, references)
- Full text length

### 10. `search_in_paper`

Search for text within a downloaded paper.

**Parameters:**
- `arxivId` (string, required): arXiv ID of the paper to search in
- `searchTerm` (string, required): Text to search for
- `caseSensitive` (boolean, optional): Whether the search should be case sensitive (default: false)

**Returns:**
- Total matches found
- Matches organized by section with context

### 11. `get_analysis_prompts`

Get available research analysis prompts.

**Parameters:** None

**Returns:**
- List of available prompts with IDs, names, descriptions, and required variables

### 12. `analyze_paper`

Generate an analysis prompt for a paper.

**Parameters:**
- `arxivId` (string, required): arXiv ID of the paper to analyze
- `promptId` (string, required): ID of the analysis prompt to use

**Available Prompt IDs:**
- `summary`: Comprehensive paper summary
- `key_findings`: Extract key findings and results
- `methodology_analysis`: Analyze research methodology
- `literature_review`: Create literature review entry
- `research_gaps`: Identify research gaps and future directions
- `technical_deep_dive`: Technical analysis with algorithms and implementation details
- `comparison`: Compare with related work
- `practical_applications`: Identify real-world applications

**Example:**
```json
{
  "arxivId": "2301.00001",
  "promptId": "summary"
}
```

## arXiv Categories

Common arXiv category codes include:

### Computer Science
- `cs.AI` - Artificial Intelligence
- `cs.LG` - Machine Learning
- `cs.CV` - Computer Vision and Pattern Recognition
- `cs.CL` - Computation and Language
- `cs.NE` - Neural and Evolutionary Computing

### Physics
- `physics.gen-ph` - General Physics
- `physics.optics` - Optics
- `quant-ph` - Quantum Physics

### Mathematics
- `math.CO` - Combinatorics
- `math.PR` - Probability
- `math.ST` - Statistics Theory

For a complete list, visit [arXiv Category Taxonomy](https://arxiv.org/category_taxonomy).

## Response Format

All tools return structured JSON responses containing:
- Paper IDs
- Titles
- Authors (with affiliations when available)
- Publication/update dates
- Categories
- Summaries (truncated for search results, full for specific paper retrieval)
- Direct PDF links
- Additional metadata (DOI, journal references, comments)

## Rate Limiting

This server respects arXiv's API usage guidelines by implementing a 3-second delay between requests. This is handled automatically and ensures compliance with arXiv's terms of service.

## Error Handling

The server includes comprehensive error handling for:
- Network errors
- Invalid parameters
- Rate limiting
- arXiv API errors

Errors are returned in a structured format that can be easily parsed by the MCP client.

## Development

### Project Structure
```
arxiv-server/
├── src/
│   ├── index.ts              # Main server implementation
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions (logger, errors, file operations)
│   ├── storage/              # Storage management for downloaded papers
│   └── prompts/              # Research prompt management
├── build/                    # Compiled JavaScript files
├── storage/                  # Downloaded papers storage
├── prompts/                  # Prompt templates
├── logs/                     # Application logs
├── config/                   # Configuration files
├── docker/                   # Docker configuration
│   ├── Dockerfile
│   └── docker-compose.yml
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
├── .npmignore                # NPM publish ignore rules
└── README.md                 # This file
```

### Building from Source
```bash
npm run build
```

### Running in Development Mode
```bash
npm run dev
```

## License

MIT License - see package.json for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

This server uses the [arXiv API](https://arxiv.org/help/api/) to access scientific papers. Please respect arXiv's terms of service and usage guidelines when using this server.
