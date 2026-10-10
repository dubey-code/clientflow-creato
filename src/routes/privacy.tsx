import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика обработки персональных данных — Brieflow" },
      { name: "description", content: "Как мы защищаем персональные данные в соответствии с 152-ФЗ." },
      { property: "og:title", content: "Политика обработки персональных данных" },
      { property: "og:description", content: "Шифрование, запрет передачи в ИИ, права субъекта данных." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← На главную</Link>
      <h1 className="mt-6 text-4xl font-semibold">Политика обработки персональных данных</h1>
      <div className="mt-8 space-y-6 text-foreground/85 leading-relaxed">
        <section><h2 className="text-xl font-semibold text-foreground">Какие данные обрабатываются</h2><p className="mt-2">ФИО, номер телефона, email и название компании — исключительно для подготовки брифа и коммерческого предложения (ст. 6 152-ФЗ, обработка на основании согласия).</p></section>
        <section><h2 className="text-xl font-semibold text-foreground">Как данные защищены</h2><ul className="mt-2 list-disc space-y-1 pl-5"><li>Данные шифруются алгоритмом AES-256-GCM до сохранения; ключ хранится только на сервере.</li><li>Доступ к расшифрованным данным есть только у администратора.</li><li>Ссылки на бриф и предложение содержат длинный случайный идентификатор.</li></ul></section>
        <section><h2 className="text-xl font-semibold text-foreground">Данные не передаются в ИИ</h2><p className="mt-2">Перед генерацией текста все персональные данные заменяются на метки ({"{{CLIENT_NAME}}"}, {"{{PHONE}}"}, {"{{EMAIL}}"}). Дополнительно автоматический фильтр вырезает телефоны и email из свободных ответов. Реальные значения подставляются только в готовый документ.</p></section>
        <section><h2 className="text-xl font-semibold text-foreground">Ваши права</h2><p className="mt-2">Вы можете отозвать согласие и потребовать удаления данных, связавшись с исполнителем, отправившим вам ссылку.</p></section>
      </div>
    </div>
  );
}
