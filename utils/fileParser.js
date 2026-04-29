const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts text from a file buffer (PDF or DOCX).
 * @param {Buffer} buffer - File buffer.
 * @param {string} mimeType - Mime type of the file.
 * @returns {Promise<string>} - Extracted text.
 */
async function extractTextFromBuffer(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return result.text;
        } finally {
            await parser.destroy();
        }
    } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword'
    ) {
        const result = await mammoth.extractRawText({ buffer: buffer });
        return result.value;
    } else {
        // Fallback for text files
        return buffer.toString('utf8');
    }
}

module.exports = { extractTextFromBuffer };
