import { describe, expect, it } from "vitest";
import { isQuestionVisible, pruneHiddenAnswers } from "./conditions";
import type { Question } from "./types";

const qs: Question[] = [
  { id: "type", label: "Что нужно?", type: "checkbox", options: ["Сайт", "Приложение"] },
  { id: "store", label: "Какие сторы?", type: "text", showIf: { questionId: "type", values: ["Приложение"] } },
  { id: "push", label: "Пуши?", type: "text", showIf: { questionId: "store", values: ["iOS"] } },
];

describe("conditional questions", () => {
  it("hides a question when the parent answer does not match", () => {
    expect(isQuestionVisible(qs[1]!, qs, { type: ["Сайт"] })).toBe(false);
  });
  it("shows a question when the parent answer matches", () => {
    expect(isQuestionVisible(qs[1]!, qs, { type: ["Сайт", "Приложение"] })).toBe(true);
  });
  it("hides a child when its parent is hidden", () => {
    expect(isQuestionVisible(qs[2]!, qs, { type: ["Сайт"], store: "iOS" })).toBe(false);
  });
  it("drops answers of hidden questions", () => {
    expect(pruneHiddenAnswers(qs, { type: ["Сайт"], store: "iOS" })).toEqual({ type: ["Сайт"] });
  });
});
