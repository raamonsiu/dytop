import { HistoryList } from "@/components/HistoryList";

export function HistoryView() {
  return (
    <section className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 pb-10">
      <HistoryList />
    </section>
  );
}
