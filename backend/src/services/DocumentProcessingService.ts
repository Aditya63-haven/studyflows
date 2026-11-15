import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import {
  DocumentFormat,
  DOCUMENT_FORMATS,
  DOCUMENT_MIME_TYPES,
} from '../domain/entities/StudyDocument';
import { PayloadTooLargeError, ValidationError } from '../errors';

export interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ValidatedDocumentUpload {
  originalName: string;
  format: DocumentFormat;
  mimeType: string;
  sizeBytes: number;
}

export interface ExtractedSection {
  text: string;
  pageNumber: number | null;
  section: string | null;
}

export interface ProcessedChunkData {
  text: string;
  pageNumber: number | null;
  section: string | null;
}

export interface ProcessedDocument {
  format: DocumentFormat;
  pageCount: number;
  characterCount: number;
  chunks: ProcessedChunkData[];
}

interface ExtractedContent {
  sections: ExtractedSection[];
  pageCount: number;
}

const DECLARED_MIME_TYPES: Record<DocumentFormat, string[]> = {
  pdf: ['application/pdf'],
  docx: [DOCUMENT_MIME_TYPES.docx],
  txt: ['text/plain', 'text/markdown'],
  md: ['text/markdown', 'text/plain', 'text/x-markdown'],
};

const MARKDOWN_HEADING = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const HTML_HEADING = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;

/**
 * Validates, extracts and chunks uploaded academic documents.
 *
 * OOP: SRP - owns file-format concerns and leaves persistence and ownership to
 * the document service.
 * OOP: Encapsulation - library-specific parsing never leaks outside this class.
 */
export class DocumentProcessingService {
  constructor(
    private readonly maxBytes: number,
    private readonly maxPages: number,
    private readonly maxExtractedChars: number,
    private readonly chunkSize: number,
    private readonly chunkOverlap: number,
    private readonly maxChunks: number,
  ) {}

  public validate(file: UploadedDocumentFile): ValidatedDocumentUpload {
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new ValidationError('Choose a non-empty document to upload');
    }

    const originalName = DocumentProcessingService.sanitizeFileName(file.originalname);
    const format = DocumentProcessingService.formatFromName(originalName);
    const sizeBytes = file.buffer.length;
    if (sizeBytes > this.maxBytes) {
      throw new PayloadTooLargeError(
        `Document must be ${DocumentProcessingService.formatMegabytes(this.maxBytes)} or smaller`,
      );
    }

    const declaredMime = file.mimetype?.trim().toLowerCase() ?? '';
    if (
      declaredMime &&
      declaredMime !== 'application/octet-stream' &&
      !DECLARED_MIME_TYPES[format].includes(declaredMime)
    ) {
      throw new ValidationError('The uploaded file type does not match its extension');
    }

    this.assertSignature(file.buffer, format);
    return {
      originalName,
      format,
      mimeType: DOCUMENT_MIME_TYPES[format],
      sizeBytes,
    };
  }

  public async process(buffer: Buffer, format: DocumentFormat): Promise<ProcessedDocument> {
    const extracted: ExtractedContent =
      format === 'pdf'
        ? await this.extractPdf(buffer)
        : {
            sections:
              format === 'docx'
                ? await this.extractDocx(buffer)
                : format === 'md'
                  ? this.extractMarkdown(buffer)
                  : this.extractText(buffer),
            pageCount: 0,
          };

    const normalizedSections = extracted.sections
      .map((section) => ({
        text: DocumentProcessingService.normalizeText(section.text),
        pageNumber: section.pageNumber,
        section: section.section?.trim() || null,
      }))
      .filter((section) => section.text.length > 0);

    const characterCount = normalizedSections.reduce(
      (total, section) => total + section.text.length,
      0,
    );
    if (characterCount === 0) {
      throw new ValidationError(
        'No readable text could be extracted. Scanned PDFs and OCR are not supported yet.',
      );
    }
    if (characterCount > this.maxExtractedChars) {
      throw new PayloadTooLargeError(
        `Extracted text is too large. Keep documents under ${this.maxExtractedChars.toLocaleString()} characters.`,
      );
    }

    const chunks: ProcessedChunkData[] = [];
    for (const section of normalizedSections) {
      for (const text of this.chunkText(section.text)) {
        chunks.push({
          text,
          pageNumber: section.pageNumber,
          section: section.section,
        });
        if (chunks.length > this.maxChunks) {
          throw new PayloadTooLargeError(
            `Document creates too many chunks. The limit is ${this.maxChunks}.`,
          );
        }
      }
    }

    return {
      format,
      pageCount: extracted.pageCount,
      characterCount,
      chunks,
    };
  }

  private async extractPdf(buffer: Buffer): Promise<ExtractedContent> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const info = await parser.getInfo();
      if (info.total > this.maxPages) {
        throw new PayloadTooLargeError(
          `PDFs must have ${this.maxPages} pages or fewer`,
        );
      }

      const result = await parser.getText({ pageJoiner: '' });
      const sections = result.pages
        .filter((page) => page.text.trim().length > 0)
        .map((page) => ({
          text: page.text,
          pageNumber: page.num,
          section: null,
        }));

      if (sections.length === 0) {
        throw new ValidationError(
          'This PDF contains no extractable text. Scanned PDFs and OCR are not supported yet.',
        );
      }
      return { sections, pageCount: info.total };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof PayloadTooLargeError) {
        throw error;
      }
      throw new ValidationError(
        'This PDF could not be read. It may be damaged, encrypted or unsupported.',
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  private async extractDocx(buffer: Buffer): Promise<ExtractedSection[]> {
    let html: string;
    try {
      const result = await mammoth.convertToHtml(
        { buffer },
        {
          convertImage: mammoth.images.imgElement(async () => ({ src: '' })),
        },
      );
      html = result.value;
    } catch {
      throw new ValidationError(
        'This DOCX file could not be read. It may be damaged or unsupported.',
      );
    }

    if (!html.trim()) {
      throw new ValidationError('This DOCX file contains no readable text.');
    }
    return DocumentProcessingService.extractHtmlSections(html);
  }

  private extractMarkdown(buffer: Buffer): ExtractedSection[] {
    const text = DocumentProcessingService.decodeText(buffer);
    const sections: ExtractedSection[] = [];
    let currentSection: string | null = null;
    let currentLines: string[] = [];
    let headingStack: string[] = [];
    let fence: string | null = null;

    const flush = () => {
      const content = currentLines.join('\n').trim();
      if (content) {
        sections.push({
          text: content,
          pageNumber: null,
          section: currentSection,
        });
      }
      currentLines = [];
    };

    for (const line of text.split(/\r?\n/)) {
      const fenceMatch = line.trim().match(/^(```|~~~)/);
      if (fenceMatch) {
        if (fence === null) {
          fence = fenceMatch[1];
        } else if (fence === fenceMatch[1]) {
          fence = null;
        }
        currentLines.push(line);
        continue;
      }

      const heading = fence === null ? MARKDOWN_HEADING.exec(line) : null;
      if (!heading) {
        currentLines.push(line);
        continue;
      }

      flush();
      const level = heading[1].length;
      headingStack = headingStack.slice(0, level - 1);
      while (headingStack.length < level - 1) {
        headingStack.push('');
      }
      headingStack[level - 1] = DocumentProcessingService.normalizeInline(heading[2]);
      currentSection = headingStack.filter(Boolean).join(' > ');
    }

    flush();
    return sections;
  }

  private extractText(buffer: Buffer): ExtractedSection[] {
    const text = DocumentProcessingService.decodeText(buffer);
    return [{ text, pageNumber: null, section: null }];
  }

  private chunkText(text: string): string[] {
    if (text.length <= this.chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + this.chunkSize, text.length);
      if (end < text.length) {
        const window = text.slice(start, end);
        const lastBreak = Math.max(
          window.lastIndexOf('\n'),
          window.lastIndexOf('. '),
          window.lastIndexOf(' '),
        );
        if (lastBreak >= Math.floor(this.chunkSize * 0.6)) {
          end = start + lastBreak + 1;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }
      if (end >= text.length) {
        break;
      }
      start = Math.max(end - this.chunkOverlap, start + 1);
    }
    return chunks;
  }

  private assertSignature(buffer: Buffer, format: DocumentFormat): void {
    if (format === 'pdf') {
      if (!buffer.subarray(0, 1_024).toString('latin1').includes('%PDF-')) {
        throw new ValidationError('The uploaded file is not a valid PDF');
      }
      return;
    }

    if (format === 'docx') {
      const looksLikeZip = buffer.subarray(0, 2).toString('latin1') === 'PK';
      const hasWordDocument = buffer.includes(Buffer.from('word/document.xml'));
      if (!looksLikeZip || !hasWordDocument) {
        throw new ValidationError('The uploaded file is not a valid DOCX document');
      }
      return;
    }

    const text = DocumentProcessingService.decodeText(buffer);
    if (text.trim().length === 0) {
      throw new ValidationError('The uploaded document is empty');
    }
  }

  private static extractHtmlSections(html: string): ExtractedSection[] {
    const sections: ExtractedSection[] = [];
    let currentSection: string | null = null;
    let lastIndex = 0;
    let headingStack: string[] = [];

    const flush = (segment: string) => {
      const text = DocumentProcessingService.htmlToText(segment);
      if (text) {
        sections.push({
          text,
          pageNumber: null,
          section: currentSection,
        });
      }
    };

    HTML_HEADING.lastIndex = 0;
    for (let match = HTML_HEADING.exec(html); match; match = HTML_HEADING.exec(html)) {
      flush(html.slice(lastIndex, match.index));
      const level = Number(match[1]);
      headingStack = headingStack.slice(0, level - 1);
      while (headingStack.length < level - 1) {
        headingStack.push('');
      }
      headingStack[level - 1] = DocumentProcessingService.htmlToText(match[2]);
      currentSection = headingStack.filter(Boolean).join(' > ');
      lastIndex = HTML_HEADING.lastIndex;
    }
    flush(html.slice(lastIndex));
    return sections;
  }

  private static htmlToText(html: string): string {
    const withoutHidden = html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<img\b[^>]*>/gi, ' ');
    const withBreaks = withoutHidden
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');
    return DocumentProcessingService.decodeEntities(withBreaks)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static decodeText(buffer: Buffer): string {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (text.includes('\u0000')) {
        throw new Error('Binary content');
      }
      return text.replace(/^\uFEFF/, '');
    } catch {
      throw new ValidationError('This file is not valid UTF-8 text');
    }
  }

  private static normalizeText(text: string): string {
    return text
      .replace(/\r\n?/g, '\n')
      .replaceAll('\u000c', '\n')
      .replaceAll('\u00a0', ' ')
      .replace(/[\u200b-\u200d\ufeff]/g, '')
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static normalizeInline(text: string): string {
    return DocumentProcessingService.decodeEntities(
      text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
  }

  private static decodeEntities(text: string): string {
    const named: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"',
    };
    return text.replace(/&(#x?[a-f0-9]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith('#x') || entity.startsWith('#X')) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return named[entity.toLowerCase()] ?? match;
    });
  }

  private static sanitizeFileName(value: string): string {
    const base = value.replace(/\\/g, '/').split('/').pop() ?? '';
    const cleaned = Array.from(base.normalize('NFKC'))
      .map((char) => {
        const code = char.codePointAt(0) ?? 0;
        const unsafe = code < 0x20 || code === 0x7f || '<>:"/\\|?*'.includes(char);
        return unsafe ? '_' : char;
      })
      .join('')
      .replace(/\s+/g, ' ')
      .replace(/^\.+/, '')
      .trim()
      .slice(0, 180);
    if (!cleaned) {
      throw new ValidationError('Document filename is required');
    }
    return cleaned;
  }

  private static formatFromName(name: string): DocumentFormat {
    const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
    if (extension && DOCUMENT_FORMATS.includes(extension as DocumentFormat)) {
      return extension as DocumentFormat;
    }
    throw new ValidationError('Upload a PDF, DOCX, TXT or Markdown file');
  }

  private static formatMegabytes(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
