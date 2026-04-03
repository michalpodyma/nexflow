"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { useLanguage } from "@/components/layout/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DEFAULT_SECTION_KEY = "nexflow-default-section";
const NOTIF_COMPLIANCE_KEY = "nexflow-notif-compliance";
const NOTIF_ASSIGNMENTS_KEY = "nexflow-notif-assignments";
const NOTIF_PROSPECTS_KEY = "nexflow-notif-prospects";

export default function SettingsPage() {
  const { lang, setLang, t } = useLanguage();

  const [defaultSection, setDefaultSection] = useState<"recruitment" | "b2b">("recruitment");
  const [notifCompliance, setNotifCompliance] = useState(true);
  const [notifAssignments, setNotifAssignments] = useState(true);
  const [notifProspects, setNotifProspects] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load stored preferences on mount
  useEffect(() => {
    const sec = localStorage.getItem(DEFAULT_SECTION_KEY);
    if (sec === "b2b") setDefaultSection("b2b");

    const nc = localStorage.getItem(NOTIF_COMPLIANCE_KEY);
    if (nc !== null) setNotifCompliance(nc === "true");

    const na = localStorage.getItem(NOTIF_ASSIGNMENTS_KEY);
    if (na !== null) setNotifAssignments(na === "true");

    const np = localStorage.getItem(NOTIF_PROSPECTS_KEY);
    if (np !== null) setNotifProspects(np === "true");
  }, []);

  function handleSave() {
    localStorage.setItem(DEFAULT_SECTION_KEY, defaultSection);
    localStorage.setItem(NOTIF_COMPLIANCE_KEY, String(notifCompliance));
    localStorage.setItem(NOTIF_ASSIGNMENTS_KEY, String(notifAssignments));
    localStorage.setItem(NOTIF_PROSPECTS_KEY, String(notifProspects));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title={t("settings.title")} />
      <main className="flex-1 p-6 max-w-2xl space-y-6">

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.language.heading")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("settings.language.description")}</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <LanguageButton
                active={lang === "pl"}
                onClick={() => setLang("pl")}
                label={t("settings.language.pl")}
              />
              <LanguageButton
                active={lang === "en"}
                onClick={() => setLang("en")}
                label={t("settings.language.en")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.defaultSection.heading")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("settings.defaultSection.description")}</p>
          </CardHeader>
          <CardContent>
            <select
              value={defaultSection}
              onChange={(e) => setDefaultSection(e.target.value as "recruitment" | "b2b")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="recruitment">{t("settings.defaultSection.recruitment")}</option>
              <option value="b2b">{t("settings.defaultSection.b2b")}</option>
            </select>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.notifications.heading")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("settings.notifications.description")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              id="notif-compliance"
              label={t("settings.notifications.compliance")}
              checked={notifCompliance}
              onChange={setNotifCompliance}
            />
            <Toggle
              id="notif-assignments"
              label={t("settings.notifications.assignments")}
              checked={notifAssignments}
              onChange={setNotifAssignments}
            />
            <Toggle
              id="notif-prospects"
              label={t("settings.notifications.prospects")}
              checked={notifProspects}
              onChange={setNotifProspects}
            />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave}>{t("settings.save")}</Button>
          {saved && (
            <span className="text-sm text-green-600">{t("settings.saved")}</span>
          )}
        </div>
      </main>
    </div>
  );
}

function LanguageButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-background text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
