"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Icon } from "./icons";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  const masked = value.length > 12 ? `${value.slice(0, 8)}${"•".repeat(14)}${value.slice(-4)}` : "••••••••";
  return (
    <div className="copyfield">
      <code aria-label={label}>{shown ? value : masked}</code>
      <button type="button" className="btn" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
        {shown ? "Hide" : "Reveal"}
      </button>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setShown(true);
          }
        }}
      >
        <Icon name={copied ? "check" : "copy"} sm />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** Plain-text snippet with a copy button (no masking). */
export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <pre className="snippet">{code}</pre>
      <button
        type="button"
        className="btn sm"
        style={{ position: "absolute", top: 8, right: 8 }}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked: the text is still selectable */
          }
        }}
      >
        <Icon name={copied ? "check" : "copy"} sm />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** A submit button that asks first. Used for block, suspend, rotate and delete. */
export function ConfirmButton({
  message, className = "btn", children,
}: { message: string; className?: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Keeps the dashboard honest without a reload: re-reads server data every minute. */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      className="btn icon theme-toggle"
      aria-label="Toggle light and dark theme"
      onClick={() => {
        const root = document.documentElement;
        const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
        const next = dark ? "light" : "dark";
        root.dataset.theme = next;
        try {
          localStorage.setItem("sa-theme", next);
        } catch {
          /* private mode: the choice just won't persist */
        }
      }}
    >
      <span className="ti-moon"><Icon name="moon" /></span>
      <span className="ti-sun"><Icon name="sun" /></span>
    </button>
  );
}

type TokenState = { error?: string; token?: string };

/** Creates an API token and shows it exactly once. */
export function TokenCreator({ action }: { action: (prev: TokenState, fd: FormData) => Promise<TokenState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <form action={formAction} className="actions">
        <label className="field" style={{ minWidth: 240 }}>
          <span className="sr-only">Token name</span>
          <input className="input" name="name" placeholder="Name, e.g. Deploy script" required maxLength={60} />
        </label>
        <button className="btn primary" disabled={pending}>
          <Icon name="plus" sm />
          Create token
        </button>
      </form>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.token && (
        <div className="form-ok" role="status">
          <p style={{ marginBottom: 8 }}>Copy this token now. It is not shown again.</p>
          <CopyField value={state.token} label="New API token" />
        </div>
      )}
    </div>
  );
}
