import { IObserver } from '../../domain/interfaces/IObserver';
import { DomainEvent } from './events';

/**
 * In-process publish/subscribe hub.
 *
 * OOP: Observer - AnalyticsService and RevisionService subscribe to QuizCompleted
 * events without QuizService knowing about them.
 * OOP: Loose coupling - subjects publish events; observers react independently.
 */
export class EventBus {
  private readonly listeners = new Map<DomainEvent['type'], Set<IObserver<DomainEvent>>>();

  public subscribe(eventType: DomainEvent['type'], observer: IObserver<DomainEvent>): void {
    const observers = this.listeners.get(eventType) ?? new Set<IObserver<DomainEvent>>();
    observers.add(observer);
    this.listeners.set(eventType, observers);
  }

  public unsubscribe(eventType: DomainEvent['type'], observer: IObserver<DomainEvent>): void {
    this.listeners.get(eventType)?.delete(observer);
  }

  public async publish(event: DomainEvent): Promise<void> {
    const observers = this.listeners.get(event.type);
    if (!observers) {
      return;
    }

    await Promise.all([...observers].map((observer) => observer.update(event)));
  }

  public clear(): void {
    this.listeners.clear();
  }

  public getObserverCount(eventType: DomainEvent['type']): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }
}
