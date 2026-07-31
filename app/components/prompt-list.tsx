"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  sendPromptToFriends,
  type SendPromptState
} from "@/app/actions";

export type PromptItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type PromptListProps = {
  prompts: PromptItem[];
  friendCount: number;
};

export function PromptList({
  prompts,
  friendCount
}: PromptListProps) {
  const [selected, setSelected] = useState<PromptItem | null>(null);
  const [sendState, setSendState] = useState<SendPromptState>({
    status: "idle",
    message: ""
  });
  const [isSending, startSending] = useTransition();

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

  function closeModal() {
    setSelected(null);
    setSendState({ status: "idle", message: "" });
  }

  function sendToFriends() {
    if (!selected) {
      return;
    }

    setSendState({ status: "idle", message: "" });
    startSending(async () => {
      const result = await sendPromptToFriends(selected.id);
      setSendState(result);
    });
  }

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
          onMouseDown={closeModal}
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
              onClick={closeModal}
            >
              ×
            </button>
            <p className="eyebrow">Сохранённый промт</p>
            <h2 id="prompt-dialog-title">{selected.title}</h2>
            <div className="prompt-content">{selected.content}</div>

            <div className="modal-actions">
              {friendCount > 0 ? (
                <button
                  className="button"
                  type="button"
                  disabled={isSending}
                  onClick={sendToFriends}
                >
                  {isSending ? "Отправляем…" : "Отправить друзьям"}
                </button>
              ) : (
                <Link className="button" href="/friends">
                  Сначала добавьте друзей
                </Link>
              )}
              <button
                className="button button--secondary"
                type="button"
                onClick={closeModal}
              >
                Закрыть
              </button>
            </div>

            {sendState.message ? (
              <p
                className={`send-message send-message--${sendState.status}`}
                role="status"
                aria-live="polite"
              >
                {sendState.message}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
