 import React from "react";

export function Container({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle, right }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur",
        "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function Badge({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-xl px-4 py-2 font-medium",
        "bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950",
        "hover:opacity-95 active:opacity-90 disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-xl px-4 py-2 font-medium",
        "border border-white/10 bg-white/5 text-slate-100",
        "hover:bg-white/10 active:bg-white/15 disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2",
        "text-slate-100 placeholder:text-slate-400 outline-none",
        "focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20",
        className,
      ].join(" ")}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2",
        "text-slate-100 outline-none",
        "focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}

/* Backward-compatible aliases for older files */
export const Btn = PrimaryButton;