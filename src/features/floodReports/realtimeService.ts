import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "../../services/supabaseClient";
import type { FloodReport } from "../../types/FloodReport";

const TABLE_NAME = "flood_reports";

interface RealtimeReportHandlers {
  onInsert: (report: FloodReport) => void;
  onUpdate: (report: FloodReport) => void;
  onDelete: (reportId: string) => void;
  onError?: (message: string) => void;
}

function getPayloadRecord(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) {
  return payload.new as FloodReport;
}

export function subscribeToFloodReports(
  handlers: RealtimeReportHandlers,
): RealtimeChannel {
  return supabase
    .channel("flood_reports_realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE_NAME },
      (payload) => {
        handlers.onInsert(getPayloadRecord(payload));
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: TABLE_NAME },
      (payload) => {
        handlers.onUpdate(getPayloadRecord(payload));
      },
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE_NAME },
      (payload) => {
        const record = payload.old as { id?: string };
        if (record.id) {
          handlers.onDelete(record.id);
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        handlers.onError?.("Realtime connection failed for flood reports.");
      }
    });
}
