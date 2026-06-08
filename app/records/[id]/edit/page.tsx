import { RecordEditClient } from "./RecordEditClient";

export default async function RecordEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecordEditClient id={id} />;
}
