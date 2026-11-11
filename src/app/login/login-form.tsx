"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="login-form">
      <div>
        <h1>Sign in</h1>
        <p className="muted" style={{ marginTop: 4 }}>Use the account set up for this panel.</p>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" autoComplete="username" required autoFocus />
      </label>
      <label className="field">
        <span>Password</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required />
      </label>
      <button className="btn primary" style={{ height: 40 }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
