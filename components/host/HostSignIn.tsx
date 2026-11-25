"use client";

import { useState } from "react";
import { hostErrorText } from "./labels";
import { btn, field } from "@/components/ui/styles";

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
      <label htmlFor="host-pw" className="block font-black">Teacher password</label>
      <input
        id="host-pw"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={field}
      />
      {error && <p role="alert" className="rounded-xl bg-coral-700 p-2 font-semibold text-white">{error}</p>}
      <button type="submit" disabled={busy} className={btn("ocean")}>
        Sign in
      </button>
    </form>
  );
}
