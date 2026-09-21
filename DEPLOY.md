# SchemaLab — нотатки з розгортання

Проєкт повністю самостійний: жодної залежності від Grok чи будь-якої іншої
платформи. Звичайний TanStack Start (React) застосунок + Postgres, який
можна розгорнути де завгодно (Vercel, Railway, власний сервер із Node.js).

## Що нового (від оригінального проєкту)

- Ролі (`teacher`/`student`), групи, запрошення за кодом
- Прогрес і результат контрольної зберігаються в Postgres, а не в localStorage
- Завдання генеруються під кожного студента окремо (8 варіантів на тему ×10 тем) — `src/lib/task-generator.ts`
- Кабінет викладача: `/teacher` (групи) → `/teacher/:groupId` (звіт)
- Вхід через власний Google OAuth-клієнт (не через жодного стороннього брокера)
- Прибрано весь код, специфічний для платформи Grok: брокер автентифікації,
  popup-вхід, PWA/OG-плагін (який вантажив сторонній скрипт з grok.com на
  кожну сторінку), внутрішні QA-скрипти білдера — залишилось лише те, що
  реально працює у вашому застосунку

## 1. Завантажити на GitHub

```bash
cd schemalab   # розпакований архів
git init
git add .
git commit -m "SchemaLab: ролі, групи, звіт, варіативні завдання"
git branch -M main
git remote add origin https://github.com/<ваш-акаунт>/schemalab.git
git push -u origin main
```

`.gitignore` вже виключає `node_modules/`, `.vercel/`, `.env`.

## 2. Google OAuth (вхід через акаунт коледжу)

1. https://console.cloud.google.com → створіть проєкт (або використайте наявний)
2. **APIs & Services → OAuth consent screen** — заповніть назву застосунку
3. **Credentials → Create Credentials → OAuth client ID**, тип **Web application**
4. **Authorized redirect URI**: `https://<ваш-домен>/api/auth/callback/google`
   (для локальної перевірки додайте також `http://localhost:8080/api/auth/callback/google`)
5. Скопіюйте **Client ID** і **Client secret**

## 3. База даних

Потрібен Postgres. Найпростіше — безкоштовний проєкт на https://neon.tech (Serverless Postgres), скопіювати `DATABASE_URL`.

## 4. Змінні середовища

```
VITE_AUTH_ENABLED=true
DATABASE_URL=postgres://...            # з Neon
BETTER_AUTH_SECRET=<будь-який довгий випадковий рядок>
BETTER_AUTH_URL=https://<ваш-домен>     # для локальної перевірки: http://localhost:8080
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_HOSTED_DOMAIN=zac.org.ua         # необов'язково: обмежити вхід доменом коледжу
TEACHER_EMAILS=mitin@zac.org.ua         # хто отримає роль викладача при першому вході
```

`GOOGLE_HOSTED_DOMAIN` — це підказка Google (`hd`), не жорстка заборона: технічно клієнт може її обійти.
Якщо потрібен справжній захист "тільки пошта коледжу", скажіть — додам перевірку домену на сервері при вході.

## 5. Локальний запуск

```bash
npm install
npm run dev     # http://localhost:8080
```

Міграції (`migrations/0001_auth.sql`, `migrations/0002_schemalab.sql`) застосовуються автоматично:
локально — до вбудованої PGLite, при `npm run build` з заданим `DATABASE_URL` — до реальної Neon-бази.

## 6. Як це працюватиме для студентів

1. Ви створюєте групу в `/teacher` → отримуєте 6-символьний код
2. Даєте код студентам → вони заходять через Google, тиснуть "Приєднатись до групи" в шапці, вводять код і ПІБ
3. Кожен студент бачить свій набір чисел у завданнях (той самий тип задачі, інші операнди)
4. У `/teacher/:groupId` — таблиця студент × тема з кількістю зарахованих задач і найкращим результатом контрольної

## Відомі обмеження

- Роль викладача призначається лише через `TEACHER_EMAILS` (лист пошт через кому) при першому вході. Додати другого викладача — дописати його пошту туди.
- Один студент = один акаунт Google = один запис прогресу. Якщо студент зайде з іншого акаунта, це буде "новий" студент.
- `docs/` тут немає — усе, що потрібно, у цьому файлі.
