"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPrompt, type FormState } from "@/app/actions";
import { SubmitButton } from "@/app/components/submit-button";

const initialFormState: FormState = {
  status: "idle",
  message: ""
};

export function PromptForm() {
  const [state, formAction] = useActionState(
    createPrompt,
    initialFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="form-card">
      <div>
        <p className="eyebrow">Новый материал</p>
        <h2>Добавить промт</h2>
      </div>

      <label className="field">
        <span>Заголовок</span>
        <input
          name="title"
          type="text"
          minLength={2}
          maxLength={160}
          placeholder="Например: Разбор главы книги"
          required
        />
      </label>

      <label className="field">
        <span>Текст промта</span>
        <textarea
          name="content"
          minLength={2}
          maxLength={20_000}
          rows={8}
          placeholder="Введите промт, который хотите сохранить и отправлять друзьям…"
          required
        />
      </label>

      <div className="form-footer">
        <SubmitButton
          idleLabel="Сохранить промт"
          pendingLabel="Сохраняем…"
        />
        <p
          className={`form-message form-message--${state.status}`}
          aria-live="polite"
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
