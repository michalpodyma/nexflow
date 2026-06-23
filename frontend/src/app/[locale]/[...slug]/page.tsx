import { notFound } from "next/navigation";

// Catch-all for unmatched paths under /{locale}/* — triggers app/[locale]/not-found.tsx
export default function LocaleCatchAll() {
  notFound();
}
