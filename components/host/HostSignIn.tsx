"use client";

import { useState } from "react";
import { hostErrorText } from "./labels";

const PASSWORD_MAX = 200;

/** Teacher password form for getting a fresh host token for an existing game. */
export function HostSignIn({
  code,
  login,
  onSignedIn,
}: {
  code: string;
  login: (code: string, password: string) => Promise<unknown>;
  onSignedIn: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length === 0) return setError("Enter the teacher password.");
    if (password.length > PASSWORD_MAX) return setError(`The password is too long (at most ${PASSWORD_MAX} characters).`);
    const pw = password;
    setPassword("");
    setBusy(true);
    setError(null);
    try {
      await login(code, pw);
      onSignedIn();
    } catch (err) {
      const c = err && typeof err === "object" && "code" in err ? (err as { code: unknown }).code : "";
      setError(c === "UNAUTHORIZED" ? "That teacher password was not accepted." : hostErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2" noValidate>
      <label htmlFor="host-pw" className="block font-bold">Teacher password</label>
      <input
        id="host-pw"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg bg-white p-3 text-black"
      />
      {error && <p role="alert" className="rounded-lg bg-red-800 p-2 font-semibold">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-3 font-bold disabled:opacity-50">
        Sign in
      </button>
    </form>
  );
}
