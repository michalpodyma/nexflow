import { Header } from "@/components/layout/Header";

export default function CompliancePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Compliance" />
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700">Coming Soon</h2>
          <p className="mt-2 text-gray-500">Compliance tracking is under construction.</p>
        </div>
      </main>
    </div>
  );
}
