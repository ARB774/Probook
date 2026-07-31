"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type PromptItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type PromptListProps = {
  prompts: PromptItem[];
  friendEmails: string[];
};

export function PromptList({
  prompts,
  friendEmails
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

  const shareHref = useMemo(() => {
    if (!selected || friendEmails.length === 0) {
      return "";
    }

    const params = new URLSearchParams({
      bcc: friendEmails.join(","),
      subject: `Промт ProBook: ${selected.title}`,
      body: `${selected.title}\n\n${selected.content}`
    });

    return `mailto:?${params.toString()}`;
  }, [friendEmails, selected]);

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
              {shareHref ? (
                <a className="button" href={shareHref}>
                  Отправить друзьям
                </a>
              ) : (
                <Link className="button" href="/friends">
                  Сначала добавьте друзей
                </Link>
              )}
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
