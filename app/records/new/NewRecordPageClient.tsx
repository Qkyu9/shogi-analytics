"use client";

import { AppHeader } from "@/app/components/layout/AppHeader";
import { PasteTranscriptInput } from "@/app/components/records/PasteTranscriptInput";
import { VoiceRecorder } from "@/app/components/records/VoiceRecorder";

export function NewRecordPageClient() {
  return (
    <>
      <AppHeader title="対局を記録" backHref="/" />
      <main>
        <VoiceRecorder />
        <PasteTranscriptInput />
      </main>
    </>
  );
}
