import { AppHeader } from "@/app/components/layout/AppHeader";
import { RecordsView } from "@/app/components/records/RecordsView";

export default function RecordsPage() {
  return (
    <>
      <AppHeader title="記録一覧" backHref="/" />
      <main className="px-4 py-6">
        <RecordsView />
      </main>
    </>
  );
}
