-- CreateTable
CREATE TABLE "PromptLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptLike_promptId_idx" ON "PromptLike"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptLike_userId_promptId_key" ON "PromptLike"("userId", "promptId");

-- AddForeignKey
ALTER TABLE "PromptLike" ADD CONSTRAINT "PromptLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptLike" ADD CONSTRAINT "PromptLike_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Txt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
