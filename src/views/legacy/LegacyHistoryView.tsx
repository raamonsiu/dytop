import { HistoryList } from "@/components/HistoryList";

/** Legacy's own history page, so switching tabs never switches visual mode. */
export function LegacyHistoryView() {
  return (
    <section className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 pb-24 pt-24">
      <HistoryList rounded />
    </section>
  );
}
