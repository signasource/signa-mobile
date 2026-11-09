/** Spanish names of the exercise block types a course can use (`CourseDetail.exerciseTypes`). */
export const EXERCISE_LABELS: Record<string, string> = {
  SELECT_MEANING: "Elegir el significado",
  SELECT_SIGN: "Elegir la seña",
  CONTEXT_RESPONSE: "Responder en contexto",
  MATCH: "Unir pares",
  VISUAL_RECOGNITION: "Reconocer señas",
  PERFORM_SIGN: "Hacer la seña frente a la cámara",
  SPELL_NAME: "Deletrear tu nombre",
};

/** "Elegir la seña, unir pares y responder en contexto" — falls back to the raw type if unknown. */
export function describeExercises(types: string[]): string {
  const labels = types.map((t) => EXERCISE_LABELS[t] ?? t);
  if (labels.length === 0) return "";
  const lower = labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1)));
  if (lower.length === 1) return lower[0];
  return `${lower.slice(0, -1).join(", ")} y ${lower[lower.length - 1]}`;
}
