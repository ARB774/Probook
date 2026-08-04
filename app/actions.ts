"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createPrompt(
  _previousState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const title = readField(formData, "title");
  const content = readField(formData, "content");
  const visibility =
    readField(formData, "visibility") === "PUBLIC" ? "PUBLIC" : "PRIVATE";

  if (title.length < 2 || title.length > 160) {
    return {
      status: "error",
      message: "Заголовок должен содержать от 2 до 160 символов."
    };
  }

  if (content.length < 2 || content.length > 20_000) {
    return {
      status: "error",
      message: "Текст промта должен содержать от 2 до 20 000 символов."
    };
  }

  try {
    const prisma = getPrisma();
    const category = await prisma.category.upsert({
      where: { category: "Без категории" },
      update: {},
      create: { category: "Без категории" }
    });

    await prisma.txt.create({
      data: {
        title,
        content,
        userId: user.id,
        categoryId: category.id,
        visibility,
        publishedAt: visibility === "PUBLIC" ? new Date() : null
      }
    });
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/my-prompts");

    return {
      status: "success",
      message: "Промт добавлен."
    };
  } catch (error) {
    console.error("Failed to create prompt:", error);
    return {
      status: "error",
      message: "Не удалось сохранить промт. Попробуйте ещё раз."
    };
  }
}

export async function createFriend(
  _previousState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();
  const name = readField(formData, "name");
  const email = readField(formData, "email").toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2 || name.length > 100) {
    return {
      status: "error",
      message: "Имя должно содержать от 2 до 100 символов."
    };
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return {
      status: "error",
      message: "Введите корректный email."
    };
  }

  try {
    await getPrisma().friend.create({
      data: { name, email }
    });
    revalidatePath("/");
    revalidatePath("/friends");

    return {
      status: "success",
      message: "Друг добавлен."
    };
  } catch (error) {
    console.error("Failed to create friend:", error);
    return {
      status: "error",
      message: "Не удалось добавить друга. Возможно, такой email уже есть."
    };
  }
}
