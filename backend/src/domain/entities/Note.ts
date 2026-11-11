import { ValidationError } from '../../errors';
import { StudyItem, StudyItemProps, StudyItemType } from '../base/StudyItem';
import { requireNonEmpty, requireString, uniqueIds } from '../base/helpers';

export interface NoteProps extends StudyItemProps {
  spaceId: string;
  content?: string;
  aiSummary?: string | null;
  tags?: string[];
}

/**
 * Markdown study note.
 *
 * OOP: Inheritance - Note is a StudyItem.
 * OOP: Association - belongs to a StudySpace through `spaceId`.
 * OOP: Aggregation - a StudySpace aggregates notes (the note can exist independently).
 */
export class Note extends StudyItem {
  private _spaceId: string;
  private _content: string;
  private _aiSummary: string | null;
  private _tags: string[];

  constructor(props: NoteProps) {
    super(props);
    this._spaceId = requireNonEmpty(props.spaceId, 'spaceId');
    this._content = requireString(props.content ?? '', 'content');
    this._aiSummary = props.aiSummary?.trim() || null;
    this._tags = Note.normalizeTags(props.tags ?? []);
  }

  public get itemType(): StudyItemType {
    return 'note';
  }

  public getSpaceId(): string {
    return this._spaceId;
  }

  public setSpaceId(spaceId: string): void {
    this._spaceId = requireNonEmpty(spaceId, 'spaceId');
    this.touch();
  }

  public getContent(): string {
    return this._content;
  }

  public setContent(content: string): void {
    this._content = requireString(content, 'content');
    this.touch();
  }

  public getAiSummary(): string | null {
    return this._aiSummary;
  }

  public setAiSummary(summary: string | null | undefined): void {
    if (summary != null && typeof summary !== 'string') {
      throw new ValidationError('aiSummary must be a string or null');
    }
    this._aiSummary = summary?.trim() || null;
    this.touch();
  }

  public getTags(): string[] {
    return [...this._tags];
  }

  public setTags(tags: string[]): void {
    this._tags = Note.normalizeTags(tags);
    this.touch();
  }

  /**
   * OOP: Polymorphism - Note overrides the abstract StudyItem.summary().
   */
  public summary(): string {
    if (this._aiSummary) {
      return this._aiSummary;
    }

    const condensed = this._content.replace(/\s+/g, ' ').trim();
    if (!condensed) {
      return 'Empty note';
    }

    return condensed.length > 160 ? `${condensed.slice(0, 157)}...` : condensed;
  }

  private static normalizeTags(tags: string[]): string[] {
    if (!Array.isArray(tags)) {
      throw new ValidationError('tags must be an array of strings');
    }
    return uniqueIds(tags.map((tag) => tag.trim())).filter(Boolean);
  }
}
