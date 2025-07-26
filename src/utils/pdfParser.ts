import logger from './logger.js';

// Dynamic import to avoid the pdf-parse initialization issue
let pdfParse: any;

async function getPdfParser() {
  if (!pdfParse) {
    try {
      // Dynamically import pdf-parse to avoid the initialization error
      // @ts-ignore
      const module = await import('pdf-parse/lib/pdf-parse.js');
      pdfParse = module.default || module;
    } catch (error) {
      logger.error('Failed to load pdf-parse:', error);
      // Fallback: try regular import
      try {
        // @ts-ignore
        const fallbackModule = await import('pdf-parse');
        pdfParse = fallbackModule.default || fallbackModule;
      } catch (fallbackError) {
        logger.error('Failed to load pdf-parse fallback:', fallbackError);
        throw new Error('PDF parsing library not available');
      }
    }
  }
  return pdfParse;
}

export async function parsePdf(dataBuffer: Buffer): Promise<any> {
  const parser = await getPdfParser();
  return parser(dataBuffer);
}
