"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workerRequestOtp, workerVerifyOtp } from "@/lib/worker-api";
import { getWorkerLocale, setWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";

type Step = "phone" | "code";

const MESSAGES = {
  pl: {
    title: "Portal Pracownika",
    subtitle: "Zaloguj się za pomocą numeru telefonu",
    phoneLabel: "Numer telefonu",
    phonePlaceholder: "+48501234567",
    sendCode: "Wyślij kod SMS",
    sending: "Wysyłanie...",
    codeSent: (phone: string) => `Kod wysłany na ${phone}. Ważny 10 minut.`,
    codeLabel: "Kod SMS (6 cyfr)",
    codePlaceholder: "123456",
    verify: "Zaloguj się",
    verifying: "Logowanie...",
    resend: "Wyślij ponownie",
    errors: {
      phoneRequired: "Podaj numer telefonu",
      phoneInvalid: "Podaj numer w formacie E.164, np. +48501234567",
      codeRequired: "Podaj 6-cyfrowy kod SMS",
      invalidCode: "Nieprawidłowy lub wygasły kod. Spróbuj ponownie.",
      tooManyAttempts: "Za dużo prób. Spróbuj ponownie za godzinę.",
      generic: "Wystąpił błąd. Spróbuj ponownie.",
    },
  },
  uk: {
    title: "Портал Працівника",
    subtitle: "Увійдіть за допомогою номера телефону",
    phoneLabel: "Номер телефону",
    phonePlaceholder: "+48501234567",
    sendCode: "Надіслати SMS-код",
    sending: "Надсилання...",
    codeSent: (phone: string) => `Код надіслано на ${phone}. Дійсний 10 хвилин.`,
    codeLabel: "SMS-код (6 цифр)",
    codePlaceholder: "123456",
    verify: "Увійти",
    verifying: "Вхід...",
    resend: "Надіслати знову",
    errors: {
      phoneRequired: "Введіть номер телефону",
      phoneInvalid: "Введіть номер у форматі E.164, напр. +48501234567",
      codeRequired: "Введіть 6-значний SMS-код",
      invalidCode: "Неправильний або прострочений код. Спробуйте ще раз.",
      tooManyAttempts: "Забагато спроб. Спробуйте знову через годину.",
      generic: "Виникла помилка. Спробуйте ще раз.",
    },
  },
} as const;

const E164_RE = /^\+[1-9]\d{7,14}$/;

export default function WorkerLoginPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<WorkerLocale>(() =>
    typeof window !== "undefined" ? getWorkerLocale() : "pl"
  );
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = MESSAGES[locale];

  function toggleLocale() {
    const next: WorkerLocale = locale === "pl" ? "uk" : "pl";
    setWorkerLocale(next);
    setLocale(next);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) { setError(t.errors.phoneRequired); return; }
    if (!E164_RE.test(phone.trim())) { setError(t.errors.phoneInvalid); return; }

    setLoading(true);
    try {
      await workerRequestOtp(phone.trim());
      setStep("code");
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429) setError(t.errors.tooManyAttempts);
      else setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim() || code.trim().length !== 6) { setError(t.errors.codeRequired); return; }

    setLoading(true);
    try {
      await workerVerifyOtp(phone.trim(), code.trim());
      router.replace("/worker/dashboard");
    } catch {
      setError(t.errors.invalidCode);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-blue-700 to-blue-900">
      {/* Language toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLocale}
          className="text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 rounded px-3 py-1.5 transition-colors"
        >
          {locale === "pl" ? "🇺🇦 Українська" : "🇵🇱 Polski"}
        </button>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👷</div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {step === "phone" && (
          <form onSubmit={handleSendCode} noValidate>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.phoneLabel}
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                autoFocus
                autoComplete="tel"
                className="w-full text-lg py-3"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 text-base font-semibold rounded-xl"
            >
              {loading ? t.sending : t.sendCode}
            </Button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerify} noValidate>
            <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-4 text-center">
              {t.codeSent(phone)}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.codeLabel}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t.codePlaceholder}
                autoFocus
                autoComplete="one-time-code"
                className="w-full text-2xl tracking-widest text-center py-3 font-mono"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 text-base font-semibold rounded-xl mb-3"
            >
              {loading ? t.verifying : t.verify}
            </Button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setCode(""); setError(null); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              ← {t.resend}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
