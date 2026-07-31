"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";

export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type SendPromptState = {
  status: "idle" | "success" | "error";
  message: string;
};

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function extractEmailAddress(sender: string) {
  const match = sender.match(/<([^>]+)>$/);
  return match?.[1]?.trim() ?? sender.trim();
}

export async function createPrompt(
  _previousState: FormState,
  formData: FormData
): Promise<FormState> {
  const title = readField(formData, "title");
  const content = readField(formData, "content");

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
    await getPrisma().note.create({
      data: { title, content }
    });
    revalidatePath("/");

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

export async function sendPromptToFriends(
  promptId: string
): Promise<SendPromptState> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      status: "error",
      message:
        "Отправка не настроена. Добавьте RESEND_API_KEY и RESEND_FROM_EMAIL в Vercel."
    };
  }

  try {
    const [prompt, friends] = await Promise.all([
      getPrisma().note.findUnique({
        where: { id: promptId },
        select: {
          id: true,
          title: true,
          content: true
        }
      }),
      getPrisma().friend.findMany({
        orderBy: { createdAt: "asc" },
        select: { email: true }
      })
    ]);

    if (!prompt) {
      return {
        status: "error",
        message: "Промт не найден."
      };
    }

    const recipients = [
      ...new Set(friends.map((friend) => friend.email.toLowerCase()))
    ];

    if (recipients.length === 0) {
      return {
        status: "error",
        message: "Сначала добавьте хотя бы одного друга."
      };
    }

    const senderAddress = extractEmailAddress(from);
    const batchSize = 49;

    for (let index = 0; index < recipients.length; index += batchSize) {
      const batch = recipients.slice(index, index + batchSize);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `probook-${prompt.id}-${crypto.randomUUID()}`
        },
        body: JSON.stringify({
          from,
          to: [senderAddress],
          bcc: batch,
          subject: `Промт ProBook: ${prompt.title}`,
          text: `${prompt.title}\n\n${prompt.content}\n\nОтправлено из ProBook.`
        })
      });

      if (!response.ok) {
        const providerError = await response.text();
        console.error("Resend rejected email:", {
          status: response.status,
          response: providerError
        });

        return {
          status: "error",
          message:
            "Почтовый сервис отклонил отправку. Проверьте API-ключ и подтверждение домена."
        };
      }
    }

    return {
      status: "success",
      message: `Письмо успешно отправлено: ${recipients.length} получател${recipients.length === 1 ? "ю" : "ям"}.`
    };
  } catch (error) {
    console.error("Failed to send prompt email:", error);
    return {
      status: "error",
      message: "Не удалось отправить письмо. Попробуйте ещё раз."
    };
  }
}
