import { AppHeader } from "@/app/components/layout/AppHeader";
import { RecordDetailView } from "./RecordDetailView";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <AppHeader title="記録詳細" backHref="/records" />
      <RecordDetailView id={id} />
    </>
  );
}
