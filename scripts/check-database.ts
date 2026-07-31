import { PrismaNeon } from "@prisma/adapter-neon";
import { config as loadEnv } from "dotenv";
import {
  PrismaClient,
  Visibility
} from "../app/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "db-check@probook.local" },
    update: { name: "Проверочный пользователь" },
    create: {
      email: "db-check@probook.local",
      name: "Проверочный пользователь"
    }
  });

  const category = await prisma.category.upsert({
    where: { category: "Проверка базы" },
    update: {},
    create: { category: "Проверка базы" }
  });

  const tag = await prisma.tag.upsert({
    where: { name: "test" },
    update: {},
    create: { name: "test" }
  });

  const existingPrompt = await prisma.txt.findFirst({
    where: {
      ownerId: user.id,
      title: "Тестовый публичный промт"
    }
  });

  const prompt = existingPrompt
    ? await prisma.txt.update({
        where: { id: existingPrompt.id },
        data: {
          content: "Проверочный текст промта для схемы ProBook.",
          categoryId: category.id,
          visibility: Visibility.PUBLIC,
          publishedAt: existingPrompt.publishedAt ?? new Date(),
          tags: { connect: { id: tag.id } }
        }
      })
    : await prisma.txt.create({
        data: {
          ownerId: user.id,
          title: "Тестовый публичный промт",
          content: "Проверочный текст промта для схемы ProBook.",
          categoryId: category.id,
          visibility: Visibility.PUBLIC,
          publishedAt: new Date(),
          tags: { connect: { id: tag.id } }
        }
      });

  const vote = await prisma.vote.upsert({
    where: {
      userId_promptId: {
        userId: user.id,
        promptId: prompt.id
      }
    },
    update: { value: 1 },
    create: {
      userId: user.id,
      promptId: prompt.id,
      value: 1
    }
  });

  console.log("Database check passed", {
    userId: user.id,
    promptId: prompt.id,
    voteId: vote.id
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Database check failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
