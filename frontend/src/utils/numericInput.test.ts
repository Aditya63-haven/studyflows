import { describe, expect, it } from 'vitest';
import { parseNumericInput } from './numericInput';

describe('parseNumericInput', () => {
  it('returns null for empty input instead of zero', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
  });

  it('parses valid numbers, including zero', () => {
    expect(parseNumericInput('2')).toBe(2);
    expect(parseNumericInput('45')).toBe(45);
    expect(parseNumericInput('0.5')).toBe(0.5);
    expect(parseNumericInput('0')).toBe(0);
  });

  it('returns null for non-finite values', () => {
    expect(parseNumericInput('not a number')).toBeNull();
  });
});
