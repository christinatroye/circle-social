"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, undefined);
  return (
    <form className="host-login" action={action}>
      <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} disabled={pending} /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={pending} /></label>
      {error && <p className="host-error" role="alert">{error}</p>}
      <button className="host-button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
