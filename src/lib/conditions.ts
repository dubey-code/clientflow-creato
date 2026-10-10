import type { Answers, Question } from "./types";

/** A question is visible when it has no condition, or its parent question is visible
 * and the client's answer to the parent matches one of the condition values. */
export function isQuestionVisible(q: Question, questions: Question[], answers: Answers, seen = new Set<string>()): boolean {
  const c = q.showIf;
  if (!c || !c.questionId || !c.values?.length) return true;
  if (seen.has(q.id)) return false; // cycle guard
  seen.add(q.id);
  const parent = questions.find((x) => x.id === c.questionId);
  if (!parent) return true; // parent removed — condition ignored
  if (!isQuestionVisible(parent, questions, answers, seen)) return false;
  const a = answers[parent.id];
  const picked = Array.isArray(a) ? a : a ? [a] : [];
  return picked.some((v) => c.values.includes(v));
}

export function visibleQuestions(questions: Question[], answers: Answers) {
  return questions.filter((q) => isQuestionVisible(q, questions, answers));
}

/** Drops answers to questions that are hidden. */
export function pruneHiddenAnswers(questions: Question[], answers: Answers): Answers {
  const ids = new Set(visibleQuestions(questions, answers).map((q) => q.id));
  return Object.fromEntries(Object.entries(answers).filter(([k]) => ids.has(k)));
}
