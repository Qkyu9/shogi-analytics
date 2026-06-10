"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { backfillOutdatedKishinInsights } from "@/app/lib/kishin-insight-backfill";
import { syncCloudRecords } from "@/app/lib/record-storage";

export function AuthBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current) return;
    synced.current = true;
    syncCloudRecords()
      .then(() => backfillOutdatedKishinInsights())
      .catch((err) => {
        console.error("Cloud sync failed:", err);
        synced.current = false;
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
