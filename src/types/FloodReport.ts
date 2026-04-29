export const waterLevels = ["ankle", "knee", "waist", "severe"] as const;

export type WaterLevel = (typeof waterLevels)[number];

export type RiskLevel = "confirmed" | "high" | "moderate" | "low";

export interface FloodReport {
  id: string;
  latitude: number;
  longitude: number;
  locality_key?: string | null;
  locality_name?: string | null;
  ward_name?: string | null;
  district_name?: string | null;
  pincode?: string | null;
  locality_source?: string | null;
  locality_confidence?: number | null;
  water_level: WaterLevel;
  image_url: string | null;
  image_path: string | null;
  created_at: string;
  user_id: string | null;
}

export interface CreateFloodReportInput {
  latitude: number;
  longitude: number;
  locality_key?: string | null;
  locality_name?: string | null;
  ward_name?: string | null;
  district_name?: string | null;
  pincode?: string | null;
  locality_source?: string | null;
  locality_confidence?: number | null;
  water_level: WaterLevel;
  image_url?: string | null;
  image_path?: string | null;
}

export interface MapCenter {
  latitude: number;
  longitude: number;
  zoom: number;
}
