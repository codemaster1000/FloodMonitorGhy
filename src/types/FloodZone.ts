import type { FeatureCollection, Polygon } from "geojson";

export type ZoneRiskLevel = "high" | "moderate";

export interface FloodProneZoneProperties {
  id: string;
  name: string;
  riskLevel: ZoneRiskLevel;
  note?: string;
}

export type FloodProneZonesFeatureCollection = FeatureCollection<
  Polygon,
  FloodProneZoneProperties
>;
