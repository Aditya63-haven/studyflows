import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantPage } from './AssistantPage';

const state = vi.hoisted(() => ({
  status: vi.fn(),
  spaces: vi.fn(),
  notes: vi.fn(),
  chat: vi.fn(),
}));

vi.mock('../api', () => ({
  aiAccessApi: { status: state.status },
  spacesApi: { list: state.spaces },
  notesApi: { listBySpace: state.notes },
  assistantApi: { chat: state.chat },
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
    state.chat.mockReset();
    state.spaces.mockResolvedValue([]);
    state.notes.mockResolvedValue([]);
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
      history: [
        { role: 'user', content: 'Explain cells' },
        {
          role: 'assistant',
          content: 'Cells contain organelles that perform specialized jobs.',
        },
      ],
    });
  });
});
