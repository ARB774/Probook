import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type LikeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: LikeRouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Войдите, чтобы поставить лайк.", loginUrl: "/login" },
      { status: 401 }
    );
  }

  const { id: promptId } = await context.params;

  try {
    const prisma = getPrisma();
    const prompt = await prisma.txt.findFirst({
      where: { id: promptId, visibility: "PUBLIC" },
      select: { id: true }
    });

    if (!prompt) {
      return NextResponse.json(
        { error: "Публичная книга не найдена." },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(
      async (transaction) => {
        const existingLike = await transaction.promptLike.findUnique({
          where: {
            userId_promptId: {
              userId: session.user.id,
              promptId
            }
          },
          select: { id: true }
        });

        let liked: boolean;

        if (existingLike) {
          await transaction.promptLike.delete({
            where: { id: existingLike.id }
          });
          liked = false;
        } else {
          await transaction.promptLike.create({
            data: { userId: session.user.id, promptId }
          });
          liked = true;
        }

        const likesCount = await transaction.promptLike.count({
          where: { promptId }
        });

        return { liked, likesCount };
      },
      { isolationLevel: "Serializable" }
    );

    revalidatePath("/");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to toggle prompt like:", error);
    return NextResponse.json(
      { error: "Не удалось обновить лайк. Попробуйте позже." },
      { status: 503 }
    );
  }
}
