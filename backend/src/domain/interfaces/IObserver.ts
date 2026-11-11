/**
 * Minimal observer contract used by the event bus.
 *
 * OOP: ISP - observers only need an update method.
 */
export interface IObserver<T = unknown> {
  update(event: T): void | Promise<void>;
}
