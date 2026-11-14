import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizEditorPage } from './QuizEditorPage';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../api', () => ({
  quizzesApi: api,
  getErrorMessage: () => 'Request failed',
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/spaces/space-1/quizzes/new']}>
      <Routes>
        <Route path="/spaces/:spaceId/quizzes/new" element={<QuizEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('QuizEditorPage points input', () => {
  beforeEach(() => {
    api.create.mockResolvedValue({ id: 'quiz-1' });
  });

  it('lets points be cleared and retyped, then submits a number', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Add MCQ' }));
    const points = screen.getByLabelText('Points');
    expect(points).toHaveValue(1);
    await user.clear(points);
    expect(points).toHaveValue(null);
    await user.type(points, '1.51');
    expect(points).toHaveValue(1.51);

    await user.type(screen.getByLabelText('Title'), 'Algebra check');
    await user.type(screen.getByLabelText('Prompt'), 'What is x?');
    await user.click(screen.getByRole('button', { name: 'Create quiz' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    expect(api.create).toHaveBeenCalledWith(
      'space-1',
      expect.objectContaining({
        questions: [expect.objectContaining({ points: 1.51 })],
      }),
    );
  });

  it('omits optional points when the field is empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Add MCQ' }));
    await user.clear(screen.getByLabelText('Points'));
    await user.type(screen.getByLabelText('Title'), 'Algebra check');
    await user.type(screen.getByLabelText('Prompt'), 'What is x?');
    await user.click(screen.getByRole('button', { name: 'Create quiz' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    const input = api.create.mock.calls[0][1] as {
      questions: Array<Record<string, unknown>>;
    };
    expect(input.questions[0]).not.toHaveProperty('points');
  });
});
