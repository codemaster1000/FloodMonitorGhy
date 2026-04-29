import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";
import type {
  CreateFloodReportInput,
  FloodReport,
} from "../../types/FloodReport";
import { compressImage } from "../../utils/imageCompression";

const TABLE_NAME = "flood_reports";
const IMAGE_BUCKET = "flood-images";

export interface UploadedReportImage {
  imageUrl: string;
  imagePath: string;
}

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getRecentReports(hoursBack = 2): Promise<FloodReport[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch flood reports: ${error.message}`);
  }

  return (data ?? []) as FloodReport[];
}

export async function uploadReportImage(
  file: File,
  localityKey?: string | null,
): Promise<UploadedReportImage> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  // Compress image before upload to reduce storage bandwidth by 60-80%
  const { file: compressedFile } = await compressImage(file);

  const ext = compressedFile.name.split(".").pop() ?? "jpg";
  const normalizedLocalityKey = localityKey
    ? sanitizePathSegment(localityKey)
    : "unassigned";
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const filePath = `${normalizedLocalityKey}/${year}/${month}/${day}/report-${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(filePath, compressedFile, { upsert: false });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(data.path);
  return {
    imageUrl: urlData.publicUrl,
    imagePath: data.path,
  };
}

export async function submitReport(
  input: CreateFloodReportInput,
): Promise<FloodReport> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const payload = {
    latitude: input.latitude,
    longitude: input.longitude,
    locality_key: input.locality_key ?? null,
    locality_name: input.locality_name ?? null,
    ward_name: input.ward_name ?? null,
    district_name: input.district_name ?? null,
    pincode: input.pincode ?? null,
    locality_source: input.locality_source ?? null,
    locality_confidence: input.locality_confidence ?? null,
    water_level: input.water_level,
    image_url: input.image_url ?? null,
    image_path: input.image_path ?? null,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Report submission failed: ${error.message}`);
  }

  return data as FloodReport;
}
