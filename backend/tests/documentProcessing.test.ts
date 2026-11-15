import JSZip from 'jszip';
import { DocumentProcessingService } from '../src/services/DocumentProcessingService';
import { PayloadTooLargeError, ValidationError } from '../src/errors';

const createService = () =>
  new DocumentProcessingService(1_000_000, 10, 100_000, 200, 20, 100);

const file = (
  originalname: string,
  buffer: Buffer,
  mimetype = 'application/octet-stream',
) => ({ originalname, buffer, mimetype, size: buffer.length });

const buildDocx = async (paragraphs: string[]): Promise<Buffer> => {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${paragraphs
        .map((paragraph) => `<w:p><w:r><w:t>${escape(paragraph)}</w:t></w:r></w:p>`)
        .join('')}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
};

describe('DocumentProcessingService', () => {
  it('rejects unsupported extensions, mismatched MIME types and fake PDFs', () => {
    const service = createService();

    expect(() => service.validate(file('notes.exe', Buffer.from('text')))).toThrow(
      ValidationError,
    );
    expect(() =>
      service.validate(file('notes.txt', Buffer.from('text'), 'application/pdf')),
    ).toThrow(ValidationError);
    expect(() =>
      service.validate(file('paper.pdf', Buffer.from('not a pdf'), 'application/pdf')),
    ).toThrow(ValidationError);
    expect(() => service.validate(file('empty.txt', Buffer.alloc(0), 'text/plain'))).toThrow(
      ValidationError,
    );
  });

  it('enforces the configured upload size limit', () => {
    const service = new DocumentProcessingService(16, 10, 1000, 100, 10, 10);
    expect(() =>
      service.validate(
        file('large.txt', Buffer.from('x'.repeat(32)), 'text/plain'),
      ),
    ).toThrow(PayloadTooLargeError);
  });

  it('extracts and chunks Markdown with heading sections', async () => {
    const service = createService();
    const processed = await service.process(
      Buffer.from(
        '# Biology\nCells are the basic unit of life.\n\n## Respiration\nMitochondria produce ATP through cellular respiration.',
      ),
      'md',
    );

    expect(processed.characterCount).toBeGreaterThan(0);
    expect(processed.chunks.length).toBeGreaterThan(0);
    expect(processed.chunks.some((chunk) => chunk.section === 'Biology')).toBe(true);
    expect(
      processed.chunks.some((chunk) => chunk.section === 'Biology > Respiration'),
    ).toBe(true);
  });

  it('extracts plain text', async () => {
    const service = createService();
    const processed = await service.process(
      Buffer.from('Photosynthesis converts light energy into chemical energy.'),
      'txt',
    );

    expect(processed.pageCount).toBe(0);
    expect(processed.chunks[0]?.text).toContain('Photosynthesis');
  });

  it('extracts DOCX paragraphs', async () => {
    const service = createService();
    const buffer = await buildDocx([
      'Operating systems manage hardware.',
      'Scheduling decides which process runs next.',
    ]);
    const processed = await service.process(buffer, 'docx');

    expect(processed.chunks.map((chunk) => chunk.text).join(' ')).toContain(
      'Scheduling decides which process runs next.',
    );
  });

});
