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
2. Добавьте `DATABASE_URL` и `DIRECT_URL` в **Project Settings → Environment Variables**.
   При Neon Vercel Integration вместо `DIRECT_URL` можно использовать
   автоматически созданную `DATABASE_URL_UNPOOLED`.
   Для реальной отправки писем также добавьте:

   ```dotenv
   RESEND_API_KEY="re_xxxxxxxxx"
   RESEND_FROM_EMAIL="ProBook <prompts@ваш-подтверждённый-домен.ru>"
   ```

   Перед этим создайте API-ключ и подтвердите домен отправителя в Resend.
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
