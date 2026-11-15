import { DocumentProcessingService } from '../src/services/DocumentProcessingService';
import { ValidationError } from '../src/errors';

interface PdfMockState {
  info: { total: number };
  pages: Array<{ num: number; text: string }>;
  error: Error | null;
}

jest.mock('pdf-parse', () => {
  const state: PdfMockState = {
    info: { total: 0 },
    pages: [],
    error: null,
  };

  return {
    __esModule: true,
    __pdfState: state,
    PDFParse: class {
      public async getInfo() {
        if (state.error) {
          throw state.error;
        }
        return state.info;
      }

      public async getText() {
        if (state.error) {
          throw state.error;
        }
        return { pages: state.pages, text: state.pages.map((page) => page.text).join('') };
      }

      public async destroy() {
        return undefined;
      }
    },
  };
});

const pdfState = (jest.requireMock('pdf-parse') as { __pdfState: PdfMockState })
  .__pdfState;

const createService = () =>
  new DocumentProcessingService(1_000_000, 10, 100_000, 200, 20, 100);

describe('DocumentProcessingService PDF page references', () => {
  beforeEach(() => {
    pdfState.info = { total: 2 };
    pdfState.pages = [
      { num: 1, text: 'Alpha page explains graph traversal.' },
      { num: 2, text: 'Beta page explains binary search.' },
    ];
    pdfState.error = null;
  });

  it('keeps the PDF page number on every chunk', async () => {
    const processed = await createService().process(
      Buffer.from('%PDF-1.4 mocked'),
      'pdf',
    );

    expect(processed.pageCount).toBe(2);
    expect(processed.chunks).toEqual([
      expect.objectContaining({ pageNumber: 1, text: 'Alpha page explains graph traversal.' }),
      expect.objectContaining({ pageNumber: 2, text: 'Beta page explains binary search.' }),
    ]);
  });

  it('rejects PDFs whose pages contain no text', async () => {
    pdfState.pages = [{ num: 1, text: '   ' }];

    await expect(
      createService().process(Buffer.from('%PDF-1.4 mocked'), 'pdf'),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('turns parser failures into a validation error', async () => {
    pdfState.error = new Error('damaged document');

    await expect(
      createService().process(Buffer.from('%PDF-1.4 mocked'), 'pdf'),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: expect.stringContaining('could not be read'),
    });
  });
});
