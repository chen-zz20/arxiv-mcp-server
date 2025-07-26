#!/usr/bin/env node

// Simple wrapper to start the MCP server
// This avoids the pdf-parse initialization issue
import('./build/index.js').catch(console.error);
