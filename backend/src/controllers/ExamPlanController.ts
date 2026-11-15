import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  CreateExamPlanInput,
  ExamPlanService,
  UpdateExamPlanInput,
} from '../services/ExamPlanService';
import {
  ApprovePreparationInput,
  ExamPreparationService,
  PreparationSelection,
} from '../services/ExamPreparationService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

interface MarkTopicBody {
  dayId?: string;
}

/**
 * HTTP adapter for exam plan use cases.
 */
export class ExamPlanController {
  constructor(
    private readonly examPlanService: ExamPlanService,
    private readonly examPreparationService: ExamPreparationService,
  ) {}

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const plans = await this.examPlanService.list(userId);
    res.status(200).json({ examPlans: plans.map(Serializer.examPlan) });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const plan = await this.examPlanService.create(
      userId,
      req.body as CreateExamPlanInput,
    );
    res.status(201).json({ examPlan: Serializer.examPlan(plan) });
  });

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const plan = await this.examPlanService.getOwned(userId, req.params.id);
    res.status(200).json({ examPlan: Serializer.examPlan(plan) });
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const plan = await this.examPlanService.update(
      userId,
      req.params.id,
      req.body as UpdateExamPlanInput,
    );
    res.status(200).json({ examPlan: Serializer.examPlan(plan) });
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.examPlanService.delete(userId, req.params.id);
    res.status(204).send();
  });

  public markTopicComplete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const body = req.body as MarkTopicBody | undefined;
    const plan = await this.examPlanService.markTopicComplete(
      userId,
      req.params.id,
      req.params.topicId,
      body?.dayId,
    );
    res.status(200).json({ examPlan: Serializer.examPlan(plan) });
  });

  public getPreparation = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const preparation = await this.examPreparationService.getOverview(
      userId,
      req.params.id,
      req.query as PreparationSelection,
    );
    res.status(200).json({ preparation });
  });

  public previewPreparation = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const preparation = await this.examPreparationService.preview(
      userId,
      req.params.id,
      req.body as PreparationSelection,
    );
    res.status(200).json({ preparation });
  });

  public approvePreparation = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const result = await this.examPreparationService.approve(
      userId,
      req.params.id,
      req.body as ApprovePreparationInput,
    );
    res.status(200).json({
      examPlan: Serializer.examPlan(result.plan),
      schedule: result.schedule,
      created: result.created,
    });
  });
}
