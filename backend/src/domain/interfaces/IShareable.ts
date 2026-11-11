/**
 * Contract for study items that can be shared through a public read-only link.
 */
export interface IShareable {
  getShareToken(): string | null;
  makeShareable(token: string): void;
  revokeSharing(): void;
  isShared(): boolean;
}
