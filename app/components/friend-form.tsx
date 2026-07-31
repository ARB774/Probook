"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFriend, type FormState } from "@/app/actions";
import { SubmitButton } from "@/app/components/submit-button";

const initialFormState: FormState = {
  status: "idle",
  message: ""
};

export function FriendForm() {
  const [state, formAction] = useActionState(
    createFriend,
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
        <p className="eyebrow">Контакты</p>
        <h2>Добавить друга</h2>
      </div>

      <label className="field">
        <span>Имя</span>
        <input
          name="name"
          type="text"
          minLength={2}
          maxLength={100}
          placeholder="Анна"
          required
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          maxLength={254}
          placeholder="anna@example.com"
          required
        />
      </label>

      <div className="form-footer">
        <SubmitButton
          idleLabel="Добавить друга"
          pendingLabel="Добавляем…"
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
