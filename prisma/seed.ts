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

  const title = "Первая заметка из NeonDB";
  const existingNote = await prisma.note.findFirst({ where: { title } });

  const content =
    "Этот тестовый промт подтверждает, что ProBook читает данные из NeonDB.";
  const note = existingNote
    ? await prisma.note.update({
        where: { id: existingNote.id },
        data: existingNote.content ? {} : { content }
      })
    : await prisma.note.create({
        data: { title, content, ownerId: owner.id }
      });

  console.log(`Seed note is ready: ${note.title}`);
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
