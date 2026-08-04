"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LikeButtonProps = {
  promptId: string;
  initialLiked: boolean;
  initialCount: number;
  canLike: boolean;
};

type LikeResponse = {
  liked?: boolean;
  likesCount?: number;
  error?: string;
  loginUrl?: string;
};

export function LikeButton({
  promptId,
  initialLiked,
  initialCount,
  canLike
}: LikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);

  async function toggleLike() {
    if (!canLike) {
      router.push("/login");
      return;
    }

    const previousLiked = liked;
    const previousCount = count;
    const optimisticLiked = !liked;

    setError("");
    setLoading(true);
    setLiked(optimisticLiked);
    setCount(Math.max(0, count + (optimisticLiked ? 1 : -1)));

    try {
      const response = await fetch(`/api/prompts/${promptId}/like`, {
        method: "POST"
      });
      const data = (await response.json()) as LikeResponse;

      if (response.status === 401) {
        setLiked(previousLiked);
        setCount(previousCount);
        router.push(data.loginUrl ?? "/login");
        return;
      }

      if (!response.ok || typeof data.liked !== "boolean") {
        throw new Error(data.error ?? "Не удалось обновить лайк. Попробуйте позже.");
      }

      setLiked(data.liked);
      setCount(data.likesCount ?? previousCount);
      router.refresh();
    } catch (requestError) {
      setLiked(previousLiked);
      setCount(previousCount);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обновить лайк. Попробуйте позже."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="like-control">
      <button
        aria-label={`${liked ? "Убрать лайк" : "Поставить лайк"}. Всего: ${count}`}
        aria-pressed={liked}
        className={`like-button${liked ? " like-button--active" : ""}`}
        disabled={loading}
        onClick={toggleLike}
        title={canLike ? undefined : "Войдите, чтобы поставить лайк"}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M7 10v11H3V10h4Zm4-8c1.1 0 2 .9 2 2v4h5.4a2.6 2.6 0 0 1 2.5 3.3l-2 7A3.7 3.7 0 0 1 15.3 21H9V9.2l2-3.5V2Z" />
        </svg>
        <span>{count}</span>
      </button>
      {error ? (
        <span className="like-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
