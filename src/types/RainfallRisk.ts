import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { WaterLevel } from "./FloodReport";
import type { ZoneRiskLevel } from "./FloodZone";

export type RainfallSource = "nasa_gpm" | "imd";

export interface RainfallObservation {
  source: RainfallSource;
  sourceRecordId: string;
  capturedAt: string;
  issuedAt?: string;
  validFrom: string;
  validTo: string;
  location: {
    latitude: number;
    longitude: number;
  };
  spatialResolutionMeters?: number;
  temporalResolutionMinutes?: number;
  rainfallMm: number;
  rainfallRateMmPerHr?: number;
  confidence?: number;
  quality: {
    isEstimated: boolean;
    isInterpolated: boolean;
    missingData: boolean;
  };
  rawSourceRef?: string;
  metadata?: Record<string, unknown>;
}

export interface GuwahatiRiskGridCell {
  cellId: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  terrain?: {
    elevationM?: number;
    slopePercent?: number;
    lowLying: boolean;
    drainageSusceptibility?: "low" | "medium" | "high";
  };
  floodContext?: {
    inFloodProneZone: boolean;
    zoneIds: string[];
    zoneRiskLevel?: ZoneRiskLevel;
  };
}

export interface GuwahatiRiskCellInput {
  cellId: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  rainfall: {
    totalMm: number;
    intensityMmPerHr: number;
    durationMinutes: number;
    peakIntensityMmPerHr?: number;
    maxRolling1hMm?: number;
    maxRolling3hMm?: number;
    sourceCount: number;
    sourceMix: RainfallSource[];
    lastUpdatedAt: string;
  };
  terrain: {
    elevationM?: number;
    slopePercent?: number;
    lowLying: boolean;
    drainageSusceptibility?: "low" | "medium" | "high";
  };
  floodContext: {
    inFloodProneZone: boolean;
    zoneIds: string[];
    zoneRiskLevel?: ZoneRiskLevel;
  };
  liveReports: {
    reportCount: number;
    confirmedCount: number;
    latestReportAt?: string;
    highestWaterLevel?: WaterLevel;
  };
  riverContext?: {
    nearestGaugeId?: string;
    riverStageM?: number;
    floodWarningLevel?: "normal" | "watch" | "warning" | "danger";
  };
}

export type RiskCategory = "low" | "moderate" | "high" | "confirmed";

export type RiskReasonCode =
  | "rainfall_intensity"
  | "rainfall_duration"
  | "flood_zone_overlap"
  | "live_reports"
  | "river_stage"
  | "terrain_lowland"
  | "time_decay";

export interface RiskReason {
  code: RiskReasonCode;
  weight: number;
  message: string;
}

export interface GuwahatiRiskScore {
  cellId: string;
  score: number;
  category: RiskCategory;
  reasons: RiskReason[];
  computedAt: string;
  expiresAt: string;
  confidence: number;
}

export interface GuwahatiRiskResult {
  input: GuwahatiRiskCellInput;
  risk: GuwahatiRiskScore;
}

export interface RiskCellFeatureProperties {
  cellId: string;
  score: number;
  category: RiskCategory;
  confidence: number;
  computedAt: string;
  expiresAt: string;
  topReasons: RiskReason[];
  sourceMix: RainfallSource[];
  rainfallTotalMm: number;
  rainfallIntensityMmPerHr: number;
  reportCount: number;
  highestWaterLevel?: WaterLevel;
}

export type RiskCellFeature = Feature<Polygon, RiskCellFeatureProperties>;

export type RiskCellFeatureCollection = FeatureCollection<
  Polygon,
  RiskCellFeatureProperties
>;

export interface RainfallAdapter<TInput = unknown> {
  source: RainfallSource;
  normalize(input: TInput): RainfallObservation[];
}

export interface NasaGpmAdapterInput {
  timestamp: string;
  points: Array<{
    id: string;
    latitude: number;
    longitude: number;
    rainfallMm: number;
    rainfallRateMmPerHr?: number;
    qualityFlag?: string;
  }>;
  temporalResolutionMinutes?: number;
  spatialResolutionMeters?: number;
  sourceRef?: string;
}

export interface ImdAdapterInput {
  bulletinId: string;
  issuedAt: string;
  observations: Array<{
    id: string;
    latitude: number;
    longitude: number;
    rainfallMm?: number;
    rainfallRateMmPerHr?: number;
    validFrom: string;
    validTo: string;
    confidence?: number;
  }>;
  sourceRef?: string;
}
