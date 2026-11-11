import { ForbiddenError, NotFoundError } from '../errors';
import { StudySession } from '../domain/entities/StudySession';
import { StudySessionRepository } from '../repositories/StudySessionRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';

export interface CreateStudySessionInput {
  spaceId?: string | null;
  subject?: string;
  durationMinutes: number;
  startedAt?: Date;
  endedAt?: Date | null;
}

/**
 * Study session use cases.
 *
 * OOP: Association - sessions optionally reference a StudySpace.
 */
export class StudySessionService {
  constructor(
    private readonly sessionRepository: StudySessionRepository,
    private readonly spaceRepository: StudySpaceRepository,
  ) {}

  public async create(
    userId: string,
    input: CreateStudySessionInput,
  ): Promise<StudySession> {
    let subject = input.subject?.trim() ?? '';

    if (input.spaceId) {
      const space = await this.spaceRepository.findById(input.spaceId);
      if (!space) {
        throw new NotFoundError('Study space not found');
      }
      if (space.getOwnerId() !== userId) {
        throw new ForbiddenError('You do not own this study space');
      }
      subject = subject || space.getSubject();
    }

    const session = new StudySession({
      userId,
      spaceId: input.spaceId ?? null,
      subject,
      durationMinutes: input.durationMinutes,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    });
    return this.sessionRepository.create(session);
  }

  public async list(userId: string): Promise<StudySession[]> {
    const sessions = await this.sessionRepository.findByUser(userId);
    return sessions.sort(
      (left, right) => right.getStartedAt().getTime() - left.getStartedAt().getTime(),
    );
  }
}
