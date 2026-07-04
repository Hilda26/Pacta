import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-emerald-700 text-white hover:bg-emerald-800",
        variant === "secondary" && "border border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50",
        variant === "danger" && "bg-rose-700 text-white hover:bg-rose-800",
        className
      )}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={clsx(
        "inline-flex size-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function TextField({
  label,
  hint,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: string; hint?: string }) {
  return (
    <label className={clsx("grid gap-2 text-sm font-medium text-stone-800", className)}>
      <span>{label}</span>
      <input
        className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & { label: string; hint?: string }) {
  return (
    <label className={clsx("grid gap-2 text-sm font-medium text-stone-800", className)}>
      <span>{label}</span>
      <textarea
        className="min-h-28 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"select"> & { label: string; children: ReactNode }) {
  return (
    <label className={clsx("grid gap-2 text-sm font-medium text-stone-800", className)}>
      <span>{label}</span>
      <select
        className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Panel({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return <section className={clsx("rounded-lg border border-stone-200 bg-white p-5 shadow-sm", className)} {...props} />;
}
