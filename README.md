# ProBook

Минимальный проект на Next.js (App Router), Prisma и Neon PostgreSQL,
подготовленный для деплоя на Vercel.

## Команды создания с нуля

Проект в этом репозитории уже создан. Эквивалентный минимальный scaffold:

```bash
pnpm create next-app@latest probook --ts --app --no-tailwind --no-eslint --use-pnpm
cd probook
pnpm add @prisma/client @prisma/adapter-neon dotenv
pnpm add -D prisma tsx typescript@^6 @types/node @types/react @types/react-dom
pnpm exec prisma init --datasource-provider postgresql --output ../app/generated/prisma
```

## Требования

- Node.js 20.19+ (поддерживаются также Node.js 22.12+ и 24+)
- pnpm
- проект и база данных в Neon

## 1. Установка

```bash
pnpm install
```

## 2. Переменные окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

В Neon Console откройте **Connect** и добавьте две строки:

```dotenv
# Pooled URL с `-pooler` в имени хоста — для Next.js/Vercel.
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# Direct URL без `-pooler` — для Prisma Migrate.
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
```

Если используется Neon Vercel Integration, прямой URL может быть добавлен
автоматически как `DATABASE_URL_UNPOOLED`; `prisma.config.ts` поддерживает и это
имя.

Файл `.env` исключён из Git. Не коммитьте реальные строки подключения.

### Вход по email и паролю

Добавьте в `.env.local` и в Vercel секрет Auth.js:

```dotenv
AUTH_SECRET="случайная-длинная-строка"
```

`AUTH_SECRET` можно сгенерировать командой `npx auth secret`. При первом входе
пользователь вводит свой email и общий начальный пароль:

```text
friend
```

Если email ещё не зарегистрирован, приложение создаёт пользователя. Пароль
хранится в PostgreSQL только в виде `scrypt`-хеша. После входа пользователь
может изменить пароль в личном кабинете. Auth.js хранит подписанную сервером
сессию в защищённой cookie; стабильный идентификатор пользователя включён в
сессию и проверяется на сервере.

## 3. Миграция и начальные данные

Для новой базы:

```bash
pnpm db:deploy
pnpm db:seed
```

Во время разработки после изменения `prisma/schema.prisma`:

```bash
pnpm db:migrate -- --name describe_change
```

## 4. Локальный запуск

```bash
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000). Главная страница —
серверный компонент App Router, который выполняет `prisma.note.findMany()` и
показывает записи из Neon PostgreSQL.

## 5. Деплой на Vercel

1. Импортируйте GitHub-репозиторий в Vercel.
2. Добавьте `DATABASE_URL`, `DIRECT_URL` и `AUTH_SECRET` в
   **Project Settings → Environment Variables**.
   При Neon Vercel Integration вместо `DIRECT_URL` можно использовать
   автоматически созданную `DATABASE_URL_UNPOOLED`.
3. До первого запуска примените миграцию к Neon:

   ```bash
   pnpm db:deploy
   pnpm db:seed
   ```

4. Запустите Deploy. Vercel автоматически определит Next.js.

Скрипт `postinstall` генерирует Prisma Client при каждой установке зависимостей
на Vercel. Миграции не запускаются автоматически во время сборки, чтобы
production-схема не менялась неожиданно.

## Полезные команды

```bash
pnpm dev          # локальная разработка
pnpm build        # production-сборка
pnpm start        # запуск production-сборки
pnpm typecheck    # проверка TypeScript
pnpm db:generate  # генерация Prisma Client
pnpm db:migrate   # новая dev-миграция
pnpm db:deploy    # применение готовых миграций
pnpm db:seed      # минимальные начальные данные
pnpm db:studio    # Prisma Studio
```

## Локальный View DB

Диагностическая страница `/view-db` доступна только в режиме разработки и не
публикует CRUD-интерфейс на Vercel. Она использует:

```dotenv
LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/probook"
DATABASE_URL="postgresql://...Neon..."
```

Запустите `pnpm dev`, откройте
[http://localhost:3000/view-db](http://localhost:3000/view-db), выберите базу и
нажмите **Показать таблицы**. Из интерфейса можно просматривать строки с
пагинацией, создавать их, изменять и удалять. Изменение и удаление доступны
только таблицам с первичным ключом. Строки подключения не передаются в браузер.
