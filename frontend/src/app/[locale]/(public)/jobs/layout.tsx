import { LangOverride } from "@/components/LangOverride";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LangOverride lang="de" />
      {children}
    </>
  );
}
