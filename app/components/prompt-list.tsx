"use client";

import { useEffect, useState } from "react";
import { LikeButton } from "@/app/components/like-button";

export type PromptItem = {
  id: string;
  title: string;
  content: string;
  visibility: "PRIVATE" | "PUBLIC";
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
};

type PromptListProps = {
  prompts: PromptItem[];
  canLike: boolean;
};

export function PromptList({
  prompts,
  canLike
}: PromptListProps) {
  const [selected, setSelected] = useState<PromptItem | null>(null);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected]);

  if (prompts.length === 0) {
    return (
      <p className="empty-state">
        Пока промтов нет. Добавьте первый промт через форму.
      </p>
    );
  }

  return (
    <>
      <ul className="prompt-list">
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <button
              className="prompt-title"
              type="button"
              onClick={() => setSelected(prompt)}
            >
              {prompt.title}
            </button>
            <span className="prompt-visibility">
              {prompt.visibility === "PRIVATE" ? "Приватный" : "Публичный"}
            </span>
            {prompt.visibility === "PUBLIC" ? (
              <LikeButton
                canLike={canLike}
                initialCount={prompt.likesCount}
                initialLiked={prompt.likedByMe}
                promptId={prompt.id}
              />
            ) : null}
            <time dateTime={prompt.createdAt}>
              {new Intl.DateTimeFormat("ru-RU", {
                dateStyle: "medium",
                timeStyle: "short"
              }).format(new Date(prompt.createdAt))}
            </time>
          </li>
        ))}
      </ul>

      {selected ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelected(null)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <p className="eyebrow">Сохранённый промт</p>
            <h2 id="prompt-dialog-title">{selected.title}</h2>
            <div className="prompt-content">{selected.content}</div>

            <div className="modal-actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Закрыть
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
