/**
 * Parses a controlled numeric input value without turning an empty field into 0.
 * Returns null when the field is empty or not a finite number.
 */
export const parseNumericInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};
