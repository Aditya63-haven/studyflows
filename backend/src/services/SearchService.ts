import { ValidationError } from '../errors';
import { StudyItemType } from '../domain/base/StudyItem';
import { FlashcardDeckRepository } from '../repositories/FlashcardDeckRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { QuizRepository } from '../repositories/QuizRepository';

export interface SearchResult {
  id: string;
  type: StudyItemType;
  title: string;
  summary: string;
  spaceId: string;
}

/**
 * Global search across notes, quizzes and flashcard decks.
 *
 * OOP: SRP - one query service composes results from three repositories.
 */
export class SearchService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly quizRepository: QuizRepository,
    private readonly deckRepository: FlashcardDeckRepository,
  ) {}

  public async search(userId: string, rawQuery: string): Promise<SearchResult[]> {
    const query = rawQuery.trim();
    if (query.length === 0) {
      throw new ValidationError('Search query is required');
    }

    const pattern = new RegExp(this.escapeRegex(query), 'i');
    const [notes, quizzes, decks] = await Promise.all([
      this.noteRepository.findMany({
        owner: userId,
        $or: [{ title: pattern }, { content: pattern }, { tags: pattern }],
      }),
      this.quizRepository.findMany({
        owner: userId,
        $or: [{ title: pattern }, { description: pattern }],
      }),
      this.deckRepository.findMany({
        owner: userId,
        $or: [
          { title: pattern },
          { description: pattern },
          { 'cards.front': pattern },
          { 'cards.back': pattern },
        ],
      }),
    ]);

    return [
      ...notes.map((note) => ({
        id: note.getId(),
        type: 'note' as const,
        title: note.getTitle(),
        summary: this.truncate(note.summary()),
        spaceId: note.getSpaceId(),
      })),
      ...quizzes.map((quiz) => ({
        id: quiz.getId(),
        type: 'quiz' as const,
        title: quiz.getTitle(),
        summary: this.truncate(quiz.summary()),
        spaceId: quiz.getSpaceId(),
      })),
      ...decks.map((deck) => ({
        id: deck.getId(),
        type: 'flashcarddeck' as const,
        title: deck.getTitle(),
        summary: this.truncate(deck.summary()),
        spaceId: deck.getSpaceId(),
      })),
    ].slice(0, 50);
  }

  private truncate(value: string): string {
    return value.length > 160 ? `${value.slice(0, 157)}...` : value;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
