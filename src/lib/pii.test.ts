import { describe, expect, it } from "vitest";
import { fillPlaceholders, maskDeep, maskPII } from "./pii";

const pii = { name: "Иванов Пётр Сергеевич", phone: "+7 913 555-12-34", email: "petr@acme.ru", company: "Акме" };

describe("maskPII", () => {
  it("removes the known full name", () => {
    expect(maskPII("Меня зовут Иванов Пётр Сергеевич", pii)).not.toContain("Иванов");
  });
  it("removes a surname mentioned alone", () => {
    expect(maskPII("Звоните Иванову? Нет, Иванов на связи", pii)).not.toMatch(/Иванов(?!у)/);
  });
  it("removes any email address, even unknown", () => {
    expect(maskPII("пишите на other@mail.com", {})).toBe("пишите на {{EMAIL}}");
  });
  it("removes any phone number, even unknown", () => {
    expect(maskPII("тел 8 (999) 123-45-67", {})).toBe("тел {{PHONE}}");
  });
  it("keeps short numbers like budgets", () => {
    expect(maskPII("бюджет 300000 руб", {})).toBe("бюджет 300000 руб");
  });
  it("masks nested answers", () => {
    const r = maskDeep({ a: ["petr@acme.ru"] }, pii);
    expect(r.a[0]).toBe("{{EMAIL}}");
  });
});

describe("fillPlaceholders", () => {
  it("substitutes the real name after generation", () => {
    expect(fillPlaceholders("Здравствуйте, {{CLIENT_NAME}}!", pii)).toBe("Здравствуйте, Иванов Пётр Сергеевич!");
  });
  it("falls back to neutral text without data", () => {
    expect(fillPlaceholders("Для {{COMPANY}}", {})).toBe("Для вашей компании");
  });
});
