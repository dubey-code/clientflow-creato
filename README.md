# Clientflow Creato

Я ITразработчик, и мне нужно создать платформу, в которой я, как администратор, смогу: — создавать проекты по запросам клиентов — описывать их и добавлять данные клиента — автоматически получать ссылку на бриф (в виде формы, которую можно редактировать) После заполнения брифа (ответы используются как переменные) должно автоматически формироваться красивое коммерческое предложение в формате небольшого лендинга для клиента. При этом я, как администратор, должен видеть все ответы, заявки и ссылки в удобной таблице для учёта. 2. Универсальный промпт для защиты персональных данных: Нужно реализовать систему безопасной обработки персональных данных в соответствии с 152ФЗ РФ. Когда клиент вводит свои данные ФИО, номер телефона, email), необходимо: - настроить механизм шифрования и защиты данных - исключить передачу персональных данных в ИИ-генерацию - на этапе генерации брифа и коммерческого предложения скрывать эти поля Персональные данные не должны отправляться в ИИ. Они должны только автоматически подставляться в итоговый бриф и коммерческое предложение после генерации. Также необходимо: - явно указать на сайте, что персональные данные защищены - подсветить, что данные не передаются в ИИ и используются только для подстановки в результат

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://clientflow-creato.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/575a3b82-a4bc-4528-8fb0-2f1db562aa37).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
