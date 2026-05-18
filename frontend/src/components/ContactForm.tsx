"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  type: "employer" | "worker" | "other";
  message: string;
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const initialState: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  type: "employer",
  message: "",
};

export default function ContactForm() {
  const t = useTranslations("ContactForm");
  const locale = useLocale();
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("send failed");

      // Fire-and-forget: sync lead to HubSpot CRM
      const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID;
      const formGuid = process.env.NEXT_PUBLIC_HUBSPOT_FORM_GUID;
      if (portalId && formGuid) {
        const nameParts = form.name.trim().split(/\s+/);
        const firstname = nameParts[0] ?? form.name;
        const lastname = nameParts.slice(1).join(" ") || "-";
        const typeLabel =
          form.type === "employer" ? "Pracodawca" : form.type === "worker" ? "Pracownik" : "Inne";
        const fields = [
          { name: "firstname", value: firstname },
          { name: "lastname", value: lastname },
          { name: "email", value: form.email },
          { name: "company", value: form.company || "" },
          { name: "phone", value: form.phone || "" },
          { name: "message", value: `[${typeLabel}] ${form.message}`.trim() },
        ];
        fetch(
          `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields,
              context: { pageUri: "https://nexflow.work/kontakt" },
            }),
          }
        ).catch(() => {});
      }

      setStatus("success");
      setForm(initialState);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-meadow-green/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-meadow-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-nexflow-navy mb-2">{t("success_heading")}</h3>
        <p className="text-slate text-sm">{t("success_desc")}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-nexflow-navy text-sm hover:underline"
        >
          {t("success_again")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Enquiry type */}
      <div>
        <label className="block text-sm font-medium text-graphite mb-2">{t("iam")}</label>
        <div className="flex gap-3 flex-wrap">
          {[
            { value: "employer", label: t("employer") },
            { value: "worker", label: t("worker") },
            { value: "other", label: t("other") },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm transition-all ${
                form.type === opt.value
                  ? "border-nexflow-cyan bg-nexflow-cyan/5 text-nexflow-navy font-semibold"
                  : "border-gray-200 text-slate hover:border-nexflow-cyan/50"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                checked={form.type === opt.value}
                onChange={handleChange}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Name + Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-graphite mb-1.5">
            {t("name")} <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Jan Kowalski"
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-graphite placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nexflow-cyan/30 focus:border-nexflow-cyan transition-colors"
          />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-graphite mb-1.5">
            {t("company")}{" "}
            {form.type === "employer" && <span className="text-red-400">*</span>}
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required={form.type === "employer"}
            value={form.company}
            onChange={handleChange}
            placeholder="Nexflow Sp. z o.o."
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-graphite placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nexflow-cyan/30 focus:border-nexflow-cyan transition-colors"
          />
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-graphite mb-1.5">
            {t("email")} <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="jan@firma.pl"
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-graphite placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nexflow-cyan/30 focus:border-nexflow-cyan transition-colors"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-graphite mb-1.5">
            {t("phone")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="+48 000 000 000"
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-graphite placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nexflow-cyan/30 focus:border-nexflow-cyan transition-colors"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-graphite mb-1.5">
          {t("message")} <span className="text-red-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder={
            form.type === "employer"
              ? t("placeholder_employer")
              : form.type === "worker"
                ? t("placeholder_worker")
                : t("placeholder_other")
          }
          className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-graphite placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nexflow-cyan/30 focus:border-nexflow-cyan transition-colors resize-none"
        />
      </div>

      {/* GDPR note */}
      <p className="text-xs text-slate">
        {t("gdpr")}{" "}
        <Link
          href={`/${locale}/polityka-prywatnosci`}
          className="underline hover:text-nexflow-navy transition-colors"
        >
          {t("privacy_link")}
        </Link>
        .
      </p>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-nexflow-cyan text-nexflow-navy font-semibold py-3 rounded-lg hover:bg-opacity-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>

      {status === "error" && (
        <p className="text-red-500 text-sm text-center">{t("error")}</p>
      )}
    </form>
  );
}
