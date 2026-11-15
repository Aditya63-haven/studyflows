import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ExamPlan,
  ExamPreparationOverview,
  ExamPreparationPreview,
} from '../api/types';
import { ExamPlanDetailPage } from './ExamPlanDetailPage';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  markTopicComplete: vi.fn(),
  getPreparation: vi.fn(),
  previewPreparation: vi.fn(),
  approvePreparation: vi.fn(),
}));

const spacesApi = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('../api', () => ({
  examPlansApi: api,
  spacesApi,
  getErrorMessage: () => 'Request failed',
}));

const examDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

const basePlan: ExamPlan = {
  id: 'plan-1',
  name: 'Biology Final',
  examDate,
  dailyStudyHours: 1,
  daysRemaining: 6,
  progress: 0,
  spaceId: null,
  documentIds: [],
  preparation: null,
  topics: [
    {
      id: 'topic-1',
      name: 'Cell Biology',
      description: 'Membranes and organelles',
      estimatedMinutes: 60,
    },
    {
      id: 'topic-2',
      name: 'Genetics',
      description: 'Inheritance and DNA',
      estimatedMinutes: 60,
    },
  ],
  studyDays: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const overview: ExamPreparationOverview = {
  planId: 'plan-1',
  examName: 'Biology Final',
  examDate,
  daysRemaining: 6,
  dailyStudyHours: 1,
  space: { id: 'space-1', name: 'Biology', subject: 'Biology' },
  documents: [
    {
      id: 'doc-1',
      title: 'syllabus.txt',
      format: 'txt',
      chunkCount: 2,
      selected: true,
    },
  ],
  selectedDocumentIds: ['doc-1'],
  topics: [
    {
      id: 'topic-1',
      name: 'Cell Biology',
      description: 'Membranes and organelles',
      estimatedMinutes: 60,
      completed: false,
      status: 'weak',
      priorityRank: 0,
      evidence: ['Quiz accuracy is 40%.'],
      performance: {
        accuracy: 40,
        answeredQuestions: 5,
        classification: 'weak',
        trendDirection: 'declining',
        evidence: ['Recent quiz accuracy is 40%.'],
      },
      revision: null,
      sources: [
        {
          chunkId: 'chunk-1',
          documentId: 'doc-1',
          documentTitle: 'syllabus.txt',
          pageNumber: 1,
          section: 'Cells',
          excerpt: 'Cell membranes and organelles are covered in this syllabus.',
        },
      ],
    },
    {
      id: 'topic-2',
      name: 'Genetics',
      description: 'Inheritance and DNA',
      estimatedMinutes: 60,
      completed: false,
      status: 'due',
      priorityRank: 1,
      evidence: ['Revision is due today.'],
      performance: null,
      revision: {
        memoryStrength: 48,
        status: 'due',
        nextReviewAt: new Date().toISOString(),
      },
      sources: [],
    },
  ],
  topicOrder: ['topic-1', 'topic-2'],
  schedule: {
    days: [
      {
        date: new Date().toISOString(),
        topicIds: ['topic-1'],
        plannedMinutes: 60,
      },
      {
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        topicIds: ['topic-2'],
        plannedMinutes: 60,
      },
    ],
    requiredMinutes: 120,
    availableMinutes: 360,
    scheduledMinutes: 120,
    shortfallMinutes: 0,
    unscheduledTopicIds: [],
    warnings: [],
  },
  availability: { source: 'default', weeklyMinutes: 600 },
  dataQuality: {
    reliable: true,
    attemptCount: 2,
    answeredQuestions: 10,
    insufficientData: [],
    limitations: [],
  },
  existingPreparation: null,
};

const preview: ExamPreparationPreview = {
  ...overview,
  strategy: {
    provider: 'mock',
    summary: 'Start with Cell Biology because recent accuracy is weak.',
    items: [
      {
        topicId: 'topic-1',
        topicName: 'Cell Biology',
        reason: 'Recent quiz accuracy is 40%.',
        practiceActivity: 'Review the source excerpt, then answer practice questions.',
        source: 'ai',
      },
      {
        topicId: 'topic-2',
        topicName: 'Genetics',
        reason: 'Revision is due today.',
        practiceActivity: 'Use active recall before the next review.',
        source: 'ai',
      },
    ],
    cautions: ['Verify the source excerpt still matches your course outline.'],
    usedChunkIds: ['chunk-1'],
    fallback: false,
    warning: null,
  },
  conflicts: [],
  requiresAcknowledgement: false,
  approvalFingerprint: 'abcdef1234567890abcdef1234567890',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/exam-plans/plan-1']}>
      <Routes>
        <Route path="/exam-plans/:planId" element={<ExamPlanDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ExamPlanDetailPage preparation workflow', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.getPreparation.mockReset();
    api.previewPreparation.mockReset();
    api.approvePreparation.mockReset();
    api.markTopicComplete.mockReset();
    spacesApi.list.mockReset();

    api.get.mockResolvedValue(basePlan);
    api.getPreparation.mockResolvedValue(overview);
    spacesApi.list.mockResolvedValue([
      { id: 'space-1', name: 'Biology', subject: 'Biology' },
    ]);
  });

  it('previews evidence and approves the unchanged schedule with its fingerprint', async () => {
    const user = userEvent.setup();
    const approvedPlan: ExamPlan = {
      ...basePlan,
      spaceId: 'space-1',
      documentIds: ['doc-1'],
      preparation: {
        provider: 'mock',
        strategySummary: preview.strategy.summary,
        approvedAt: new Date().toISOString(),
        approvalFingerprint: preview.approvalFingerprint,
        requiredMinutes: 120,
        scheduledMinutes: 120,
        shortfallMinutes: 0,
      },
      studyDays: [
        {
          id: 'day-1',
          date: new Date().toISOString(),
          topicIds: ['topic-1'],
          completedTopicIds: [],
          plannedMinutes: 60,
          isComplete: false,
          progress: 0,
        },
      ],
    };
    api.previewPreparation.mockResolvedValue(preview);
    api.approvePreparation.mockResolvedValue({
      plan: approvedPlan,
      schedule: preview.schedule,
      created: true,
    });

    renderPage();

    expect(await screen.findByText('syllabus.txt')).toBeInTheDocument();
    expect(screen.getByText('Quiz accuracy is 40%.')).toBeInTheDocument();
    expect(
      screen.getByText('Cell membranes and organelles are covered in this syllabus.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate AI preview' }));

    await waitFor(() =>
      expect(api.previewPreparation).toHaveBeenCalledWith('plan-1', {
        spaceId: 'space-1',
        documentIds: ['doc-1'],
      }),
    );
    expect(
      await screen.findByText('Start with Cell Biology because recent accuracy is weak.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Review the source excerpt, then answer practice questions.'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Approve preparation schedule' }),
    );

    await waitFor(() =>
      expect(api.approvePreparation).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({
          spaceId: 'space-1',
          documentIds: ['doc-1'],
          topicOrder: ['topic-1', 'topic-2'],
          approvalFingerprint: preview.approvalFingerprint,
          strategySummary: preview.strategy.summary,
          provider: 'mock',
        }),
      ),
    );
    expect(
      await screen.findByText(
        'Preparation schedule approved. Your study days now match the preview.',
      ),
    ).toBeInTheDocument();
  });

  it('requires explicit acknowledgement before approving a schedule with a shortfall', async () => {
    const user = userEvent.setup();
    const shortfallPreview: ExamPreparationPreview = {
      ...preview,
      conflicts: ['1 hour of required study time does not fit before the exam.'],
      requiresAcknowledgement: true,
      schedule: {
        ...preview.schedule,
        scheduledMinutes: 60,
        shortfallMinutes: 60,
        unscheduledTopicIds: ['topic-2'],
        warnings: ['1 hour of required study time does not fit before the exam.'],
      },
    };
    api.previewPreparation.mockResolvedValue(shortfallPreview);
    api.approvePreparation.mockResolvedValue({
      plan: basePlan,
      schedule: shortfallPreview.schedule,
      created: true,
    });

    renderPage();

    await screen.findByText('syllabus.txt');
    await user.click(screen.getByRole('button', { name: 'Generate AI preview' }));

    const approve = await screen.findByRole('button', {
      name: 'Approve preparation schedule',
    });
    expect(approve).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /cannot fit before the exam/i }));
    expect(approve).toBeEnabled();

    await user.click(approve);

    await waitFor(() =>
      expect(api.approvePreparation).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({
          approvalFingerprint: shortfallPreview.approvalFingerprint,
          acknowledgeConflicts: true,
        }),
      ),
    );
  });
});
