import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Service card ─────────────────────────────────────────────────────── */
export function ServiceCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-hairline rounded-md p-6 flex flex-col gap-4",
        className,
      )}
      {...props}
    />
  );
}

/* ── Stat card ────────────────────────────────────────────────────────── */
export function StatCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-2 border border-hairline rounded-md p-6 flex flex-col gap-2",
        className,
      )}
      {...props}
    />
  );
}

/* ── Step card ────────────────────────────────────────────────────────── */
export function StepCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-hairline rounded-md p-6 flex flex-col gap-3",
        className,
      )}
      {...props}
    />
  );
}

/* ── Testimonial card ─────────────────────────────────────────────────── */
export function TestimonialCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      className={cn(
        "bg-surface-2 border border-hairline rounded-md p-6 flex flex-col gap-4",
        className,
      )}
      {...props}
    />
  );
}

/* ── Client logo tile ─────────────────────────────────────────────────── */
export function ClientLogoTile({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-hairline rounded-sm p-4 flex items-center justify-center",
        className,
      )}
      {...props}
    />
  );
}

/* ── CTA banner ───────────────────────────────────────────────────────── */
export function CtaBanner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "bg-surface-1 border border-hairline rounded-lg px-8 py-12 flex flex-col items-center gap-6 text-center",
        className,
      )}
      {...props}
    />
  );
}
