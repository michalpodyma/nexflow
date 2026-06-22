import FlowMark from "@/components/FlowMark";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-nexflow-navy flex flex-col items-center justify-center text-center px-4">
      <FlowMark variant="full" colorScheme="reversed" height={40} />
      <p className="text-white text-4xl font-bold mt-8 mb-4">
        404 — strona nie znaleziona
      </p>
      <a
        href="https://nexflow.work/pl"
        className="text-nexflow-cyan underline text-lg hover:opacity-80 transition-opacity"
      >
        Wróć na stronę główną
      </a>
    </div>
  );
}
