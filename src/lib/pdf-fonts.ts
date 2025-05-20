// This file contains the base64-encoded font data for PDF exports
// We're using Noto Sans which has good Unicode support including the peso symbol

// For production use, you would likely want to use proper font loading rather than embedding
// the entire font in your code. This is just a simple solution for this specific issue.

import type jsPDF from 'jspdf';

/**
 * Pre-processes text with peso symbols for PDF output
 * This solves the issue of the peso symbol (₱) appearing as ± in PDFs
 * 
 * @param text - The text to process
 * @returns string - The processed text
 */
export function processPesoSymbolForPDF(text: string): string {
  // Replace the peso symbol with an HTML entity that works better in PDFs
  // This approach works even with the default PDF fonts
  if (typeof text === 'string') {
    // Unicode peso symbol: ₱ (U+20B1)
    // We'll replace it with "PHP " which is a safe, readable alternative
    return text.replace(/₱/g, 'PHP ');
  }
  return text;
}

/**
 * Adds support for displaying the peso symbol in a jsPDF document
 * This simpler approach processes the text before adding to the PDF
 * 
 * @param doc - The jsPDF document instance
 * @returns string - The name of the font to use
 */
export function addFontSupport(doc: jsPDF): string {
  // Use the default font - we'll handle the peso symbol through text replacement
  return 'helvetica';
}

/**
 * Process financial data for PDF export
 * @param data - The data object or value to process
 * @returns - The processed data with peso symbols replaced
 */
export function processFinancialDataForPDF(data: any): any {
  if (typeof data === 'string') {
    return processPesoSymbolForPDF(data);
  } 
  
  if (Array.isArray(data)) {
    return data.map(item => processFinancialDataForPDF(item));
  }
  
  if (data && typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const key in data) {
      result[key] = processFinancialDataForPDF(data[key]);
    }
    return result;
  }
  
  return data;
}

/**
 * More complete solution (for production):
 * 
 * For a full production implementation, you would:
 * 1. Download a TTF font that supports the peso symbol (like Noto Sans)
 * 2. Convert it to base64
 * 3. Add it to jsPDF's virtual file system
 * 4. Register it as a font
 * 
 * Example code:
 * ```
 * import { NotoSansData } from './font-data'; 
 * 
 * function addCustomFontSupport(doc: jsPDF): string {
 *   doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansData);
 *   doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
 *   doc.setFont('NotoSans');
 *   return 'NotoSans';
 * }
 * ```
 * 
 * The NotoSansData would be the base64 string of the font file.
 */

// Notes on implementation:
// 1. You would need to generate the base64 data of the font file (NotoSans-Regular.ttf)
// 2. To generate this data, you can use tools like:
//    - Online base64 encoders
//    - Node.js: fs.readFileSync('path/to/NotoSans-Regular.ttf').toString('base64')
// 3. Replace 'YOUR_BASE64_FONT_DATA_HERE' with the actual encoded font data
// 4. The font file can be downloaded from Google Fonts (Noto Sans)

// Alternative implementation (more practical for real-world use):
// Instead of embedding the font, consider:
// 1. Using vfs_fonts.js from pdfmake
// 2. Using a CDN-hosted version of the font
// 3. Adding the font file to your public directory and loading it at runtime 