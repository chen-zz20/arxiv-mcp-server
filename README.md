# arXiv MCP Server

A Model Context Protocol (MCP) server that provides access to the arXiv API for searching and retrieving scientific papers.

## Overview

This MCP server enables AI assistants to search and retrieve scientific papers from arXiv, the open-access repository for scholarly articles in physics, mathematics, computer science, and other fields. The server provides structured access to arXiv's extensive database through simple, powerful tools.

## Features

- **Search papers** by title, author, abstract, category, or any combination
- **Retrieve papers** by their arXiv ID
- **Get recent papers** in specific categories
- **Find all papers** by a specific author
- **Rate limiting** compliance with arXiv API guidelines (3-second delay between requests)
- **Structured output** with paper metadata, summaries, and direct PDF links

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone this repository:
```bash
git clone <repository-url>
cd arxiv-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

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
│   └── index.ts        # Main server implementation
├── build/              # Compiled JavaScript files
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
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
