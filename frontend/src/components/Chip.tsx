import type { ReactNode } from 'react';

export type ChipTone = 'default' | 'accent' | 'warn';

export const Chip = ({ tone = 'default', children }: { tone?: ChipTone; children: ReactNode }) => (
  <span className={tone === 'default' ? 'chip' : `chip ${tone}`}>{children}</span>
);
