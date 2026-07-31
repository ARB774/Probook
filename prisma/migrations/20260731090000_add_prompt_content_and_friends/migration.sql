-- AlterTable
ALTER TABLE "Note"
ADD COLUMN "content" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Friend" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Friend_email_key" ON "Friend"("email");
