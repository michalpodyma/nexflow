import type { Metadata } from "next";

import { CandidateIntakeForm } from "@/components/forms/CandidateIntakeForm";

export const metadata: Metadata = {
  title: "Aplikuj — Praca w magazynie i logistyce | Nexflow",
  description:
    "Wyślij zgłoszenie i dołącz do bazy kandydatów Nexflow. Praca tymczasowa w magazynach i logistyce w Polsce i Niemczech.",
  alternates: {
    canonical: "https://nexflow.work/aplikuj",
  },
};

export default function AplikujPage() {
  return <CandidateIntakeForm />;
}
