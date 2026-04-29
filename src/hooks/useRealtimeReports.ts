import { useEffect } from "react";
import { subscribeToFloodReports } from "../features/floodReports/realtimeService";
import { supabase } from "../services/supabaseClient";
import type { FloodReport } from "../types/FloodReport";

interface UseRealtimeReportsParams {
  enabled: boolean;
  onInsert: (report: FloodReport) => void;
  onUpdate: (report: FloodReport) => void;
  onDelete: (reportId: string) => void;
  onError?: (message: string) => void;
}

export function useRealtimeReports({
  enabled,
  onInsert,
  onUpdate,
  onDelete,
  onError,
}: UseRealtimeReportsParams) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channel = subscribeToFloodReports({
      onInsert,
      onUpdate,
      onDelete,
      onError,
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, onDelete, onError, onInsert, onUpdate]);
}
