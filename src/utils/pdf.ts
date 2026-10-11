/**
 * Utility for parsing text from PDF and text documents
 */

export async function extractTextFromPdf(file: File): Promise<string> {
  // If plain text / markdown
  if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    return await file.text();
  }

  try {
    // Dynamic import to keep bundle light
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source to unpkg cdn or inline if needed
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = pdf.numPages; // Limitless document parsing defined by full document

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => item.str || '')
        .filter(Boolean);
      fullText += `\n--- Page ${i} ---\n` + pageStrings.join(' ');
    }

    return fullText.trim();
  } catch (err) {
    console.warn('PDF parsing error, attempting raw text read:', err);
    // Fallback if binary extraction fails
    const raw = await file.text();
    // Filter printable ascii characters as best effort
    const printable = raw.replace(/[^\x20-\x7E\t\r\n]/g, ' ');
    if (printable.length > 100) {
      return printable.substring(0, 10000);
    }
    throw new Error('Could not parse PDF file directly. Please copy & paste the text content into the notes box.');
  }
}
