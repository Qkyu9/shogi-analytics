import { AppHeader } from "@/app/components/layout/AppHeader";
import { VoiceRecorder } from "@/app/components/records/VoiceRecorder";

export default function NewRecordPage() {
  return (
    <>
      <AppHeader title="音声で記録" backHref="/" />
      <main>
        <VoiceRecorder />
      </main>
    </>
  );
}
