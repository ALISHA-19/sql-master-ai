"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* shadcn/ui-style primitives, hand-rolled to keep the dependency
   surface small while matching the same API and visual language. */

type ButtonVariant = "default" | "outline" | "ghost" | "gradient" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className, variant = "default", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer select-none",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
      "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
      {
        default: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
        outline: "border border-[var(--border)] card-surface hover:border-brand-400/60 hover:text-brand-500",
        ghost: "hover:bg-zinc-500/10",
        gradient:
          "text-white bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 hover:shadow-lg hover:shadow-brand-500/30 bg-[length:150%_100%] hover:bg-right",
        destructive: "bg-red-600 text-white hover:bg-red-700",
      }[variant],
      {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      }[size],
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("card-surface rounded-2xl shadow-sm transition-shadow hover:shadow-md", className)}
      {...props}
    />
  );
}

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-2xl shadow-sm", className)} {...props} />;
}

const badgeTones = {
  brand: "bg-brand-500/12 text-brand-600 dark:text-brand-300 border-brand-500/25",
  green: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-500/25",
  amber: "bg-amber-500/12 text-amber-600 dark:text-amber-300 border-amber-500/25",
  red: "bg-red-500/12 text-red-600 dark:text-red-300 border-red-500/25",
  zinc: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300 border-zinc-500/25",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300 border-violet-500/25",
  cyan: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 border-cyan-500/25",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  tone = "brand",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

export function difficultyTone(d: string): BadgeTone {
  if (/easy|beginner/i.test(d)) return "green";
  if (/medium|intermediate/i.test(d)) return "amber";
  if (/hard|advanced|expert/i.test(d)) return "red";
  return "zinc";
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--border)] card-surface px-3.5 text-sm outline-none",
        "placeholder:text-[var(--muted)] focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-[var(--border)] card-surface px-3.5 py-2.5 text-sm outline-none font-mono",
      "placeholder:text-[var(--muted)] focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all resize-y",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-500/15", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  subtitle,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        {icon}
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-sm text-[var(--muted)]">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-3 font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-[var(--border)] bg-zinc-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
      {children}
    </kbd>
  );
}
