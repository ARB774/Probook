import { PrismaNeon } from "@prisma/adapter-neon";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../app/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "seed@probook.local" },
    update: {},
    create: {
      email: "seed@probook.local",
      name: "ProBook Seed"
    }
  });

  const category = await prisma.category.upsert({
    where: { category: "Seed" },
    update: {},
    create: { category: "Seed" }
  });
  const title = "Первый промт из NeonDB";
  const existingPrompt = await prisma.txt.findFirst({
    where: { userId: owner.id, title }
  });

  const content =
    "Этот тестовый промт подтверждает, что ProBook читает данные из NeonDB.";
  const prompt = existingPrompt
    ? await prisma.txt.update({
        where: { id: existingPrompt.id },
        data: existingPrompt.content ? {} : { content }
      })
    : await prisma.txt.create({
        data: {
          title,
          content,
          userId: owner.id,
          categoryId: category.id
        }
      });

  console.log(`Seed prompt is ready: ${prompt.title}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
