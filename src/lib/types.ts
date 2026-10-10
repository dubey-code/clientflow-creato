export type QuestionType = "text" | "textarea" | "select" | "checkbox";

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  /** Show only when the answer to another question matches one of `values`. */
  showIf?: { questionId: string; values: string[] };
};

export type Clarification = { missing: string[]; questions: Question[] };

export type Offer = {
  headline: string;
  subtitle: string;
  understanding: string;
  solution: { title: string; text: string }[];
  stages: { title: string; duration: string; text: string }[];
  price: { total: string; items: { name: string; price: string }[] };
  why: string[];
  cta: string;
};

export type Answers = Record<string, string | string[]>;

export const STATUS_LABEL: Record<string, string> = {
  created: "Ожидает брифа",
  submitted: "Бриф заполнен",
  ready: "КП готово",
  error: "Ошибка генерации",
};

export const DEFAULT_QUESTIONS: Question[] = [
  { id: "goal", label: "Какую задачу должен решить проект?", type: "textarea", required: true },
  { id: "audience", label: "Кто ваша целевая аудитория?", type: "textarea" },
  {
    id: "type",
    label: "Что нужно сделать?",
    type: "checkbox",
    options: ["Сайт / лендинг", "Веб-приложение", "Мобильное приложение", "Интеграции / API", "Дизайн", "Поддержка"],
  },
  { id: "features", label: "Ключевые функции", type: "textarea" },
  { id: "references", label: "Примеры, которые нравятся (ссылки)", type: "textarea" },
  { id: "budget", label: "Ориентировочный бюджет", type: "select", options: ["до 200 тыс. ₽", "200–500 тыс. ₽", "500 тыс. – 1 млн ₽", "более 1 млн ₽", "Нужна оценка"] },
  { id: "deadline", label: "Желаемые сроки", type: "text" },
];
