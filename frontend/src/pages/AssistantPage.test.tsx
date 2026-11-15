import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantPage } from './AssistantPage';

const state = vi.hoisted(() => ({
  status: vi.fn(),
  spaces: vi.fn(),
  notes: vi.fn(),
  documents: vi.fn(),
  chat: vi.fn(),
  performance: vi.fn(),
  acceptRecommendation: vi.fn(),
}));

vi.mock('../api', () => ({
  aiAccessApi: { status: state.status },
  spacesApi: { list: state.spaces },
  notesApi: { listBySpace: state.notes },
  documentsApi: { listBySpace: state.documents },
  assistantApi: { chat: state.chat, performance: state.performance },
  analyticsApi: { acceptRecommendation: state.acceptRecommendation },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AssistantPage />
    </MemoryRouter>,
  );

describe('AssistantPage', () => {
  beforeEach(() => {
    state.status.mockReset();
    state.spaces.mockReset();
    state.notes.mockReset();
    state.documents.mockReset();
    state.chat.mockReset();
    state.performance.mockReset();
    state.acceptRecommendation.mockReset();
    state.spaces.mockResolvedValue([]);
    state.notes.mockResolvedValue([]);
    state.documents.mockResolvedValue([]);
  });

  it('shows invite-only messaging to accounts without access', async () => {
    state.status.mockResolvedValue({
      allowed: false,
      isAdmin: false,
      email: 'student@example.com',
      status: 'none',
    });

    renderPage();

    expect(await screen.findByText('Invite-only access')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ask the study assistant')).not.toBeInTheDocument();
  });

  it('selects space notes, sends grounded chat, and carries history forward', async () => {
    state.status.mockResolvedValue({
      allowed: true,
      isAdmin: false,
      email: 'student@example.com',
      status: 'active',
    });
    state.spaces.mockResolvedValue([
      { id: 'space-1', name: 'Biology', subject: 'Cell biology' },
    ]);
    state.notes.mockResolvedValue([
      { id: 'note-1', title: 'Cell structure', tags: ['cells'] },
    ]);
    state.chat
      .mockResolvedValueOnce({
        answer: 'Cells contain organelles that perform specialized jobs.',
        provider: 'gemini',
        citations: [{ id: 'note-1', title: 'Cell structure' }],
        usedExternalKnowledge: false,
        noteCount: 1,
      })
      .mockResolvedValueOnce({
        answer: 'A mitochondrion is one example.',
        provider: 'gemini',
        citations: [],
        usedExternalKnowledge: true,
        noteCount: 1,
      });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('1 of 1 selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cell structure/ })).toBeChecked();

    const composer = screen.getByLabelText('Ask the study assistant');
    await user.type(composer, 'Explain cells');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText('Cells contain organelles that perform specialized jobs.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cell structure' })).toHaveAttribute(
      'href',
      '/notes/note-1',
    );
    expect(screen.getByText('From your notes')).toBeInTheDocument();
    expect(state.chat).toHaveBeenNthCalledWith(1, {
      message: 'Explain cells',
      mode: 'answer',
      spaceId: 'space-1',
      noteIds: ['note-1'],
      documentIds: [],
      history: [],
    });

    await user.type(composer, 'Give an example');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('A mitochondrion is one example.')).toBeInTheDocument();
    expect(screen.getByText('General knowledge')).toBeInTheDocument();

    await waitFor(() => expect(state.chat).toHaveBeenCalledTimes(2));
    expect(state.chat).toHaveBeenNthCalledWith(2, {
      message: 'Give an example',
      mode: 'answer',
      spaceId: 'space-1',
      noteIds: ['note-1'],
      documentIds: [],
      history: [
        { role: 'user', content: 'Explain cells' },
        {
          role: 'assistant',
          content: 'Cells contain organelles that perform specialized jobs.',
        },
      ],
    });
  });

  it('selects ready documents and displays document source references', async () => {
    state.status.mockResolvedValue({
      allowed: true,
      isAdmin: false,
      email: 'student@example.com',
      status: 'active',
    });
    state.spaces.mockResolvedValue([
      { id: 'space-1', name: 'Biology', subject: 'Cell biology' },
    ]);
    state.notes.mockResolvedValue([]);
    state.documents.mockResolvedValue([
      {
        id: 'doc-1',
        originalName: 'Lecture 3.pdf',
        format: 'pdf',
        status: 'ready',
        pageCount: 12,
        chunkCount: 8,
      },
    ]);
    state.chat.mockResolvedValue({
      answer: 'Mitochondria produce ATP.',
      provider: 'mock',
      citations: [],
      documentCitations: [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          title: 'Lecture 3.pdf',
          pageNumber: 4,
          section: 'Cellular respiration',
          excerpt: 'Mitochondria produce ATP through respiration.',
        },
      ],
      usedExternalKnowledge: false,
      noteCount: 0,
      documentCount: 1,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('1 of 1 selected')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Lecture 3\.pdf/ }),
    ).toBeChecked();

    await user.type(screen.getByLabelText('Ask the study assistant'), 'How is ATP made?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Mitochondria produce ATP.')).toBeInTheDocument();
    expect(screen.getByText('Lecture 3.pdf · p. 4 · Cellular respiration')).toBeInTheDocument();
    expect(screen.getByText('From your documents')).toBeInTheDocument();
    expect(state.chat).toHaveBeenCalledWith({
      message: 'How is ATP made?',
      mode: 'answer',
      spaceId: 'space-1',
      noteIds: [],
      documentIds: ['doc-1'],
      history: [],
    });
  });
  it('requests a grounded performance interpretation and accepts a recommendation', async () => {
    state.status.mockResolvedValue({
      allowed: true,
      isAdmin: false,
      email: 'student@example.com',
      status: 'active',
    });
    state.spaces.mockResolvedValue([
      { id: 'space-1', name: 'Biology', subject: 'Cell biology' },
    ]);
    state.notes.mockResolvedValue([]);
    state.documents.mockResolvedValue([]);
    state.performance.mockResolvedValue({
      provider: 'mock',
      generatedAt: '2026-05-15T12:00:00.000Z',
      summary: 'You answered 5 graded questions with 40% accuracy.',
      strengths: ['Cell structure recall is improving.'],
      improvementAreas: ['Cell Biology accuracy is 40%.'],
      trendInterpretation: 'There is not enough history for a trend.',
      focusTopics: [
        {
          topicId: 'quiz-1',
          topicName: 'Cell Biology',
          accuracy: 40,
          answeredQuestions: 5,
          evidence: ['2/5 questions correct (40% accuracy).'],
        },
      ],
      practiceSuggestions: [
        {
          title: 'Practice Cell Biology',
          reason: '2/5 questions correct (40% accuracy).',
          topicId: 'quiz-1',
          topicName: 'Cell Biology',
        },
      ],
      recommendations: [
        {
          id: 'weak:quiz-1',
          type: 'weak-topic',
          title: 'Revise Cell Biology',
          description: 'A focused review fits your schedule.',
          reason: '2/5 questions correct (40% accuracy).',
          evidence: ['2/5 questions correct (40% accuracy).'],
          suggestedMinutes: 25,
          topicId: 'quiz-1',
          topicName: 'Cell Biology',
          priority: 'high',
          examDate: null,
          alreadyScheduled: false,
          addable: true,
        },
      ],
      dataQuality: {
        reliable: true,
        attemptCount: 1,
        answeredQuestions: 5,
        insufficientData: [],
        limitations: ['Quiz questions do not store curriculum topic tags.'],
      },
    });
    state.acceptRecommendation.mockResolvedValue({ created: true });

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Analyze my performance' }),
    );

    expect(
      await screen.findByText('You answered 5 graded questions with 40% accuracy.'),
    ).toBeInTheDocument();
    expect(state.performance).toHaveBeenCalledWith({ days: 90, spaceId: 'space-1' });
    expect(screen.getByText('Cell Biology · 40%')).toBeInTheDocument();
    expect(screen.getByText(/topic tags/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to revision' }));

    await waitFor(() =>
      expect(state.acceptRecommendation).toHaveBeenCalledWith('weak:quiz-1', {
        days: 90,
        spaceId: 'space-1',
      }),
    );
    expect(
      await screen.findByText('Added "Cell Biology" to your revision schedule.'),
    ).toBeInTheDocument();
  });
});
