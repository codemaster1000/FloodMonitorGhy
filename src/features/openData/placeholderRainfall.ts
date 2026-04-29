import type {
  ImdAdapterInput,
  NasaGpmAdapterInput,
  RainfallObservation,
} from "../../types/RainfallRisk";
import { imdAdapter, nasaGpmAdapter } from "./rainfallAdapters";

const now = Date.now();

export const placeholderNasaInput: NasaGpmAdapterInput = {
  timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
  sourceRef: "placeholder:nasa-gpm",
  temporalResolutionMinutes: 30,
  spatialResolutionMeters: 10000,
  points: [
    {
      id: "gpm-1",
      latitude: 26.153,
      longitude: 91.741,
      rainfallMm: 9.4,
      rainfallRateMmPerHr: 18.8,
      qualityFlag: "good",
    },
    {
      id: "gpm-2",
      latitude: 26.139,
      longitude: 91.724,
      rainfallMm: 6.8,
      rainfallRateMmPerHr: 13.6,
      qualityFlag: "good",
    },
  ],
};

export const placeholderImdInput: ImdAdapterInput = {
  bulletinId: "imd-guwahati-placeholder-001",
  issuedAt: new Date(now - 20 * 60 * 1000).toISOString(),
  sourceRef: "placeholder:imd",
  observations: [
    {
      id: "imd-1",
      latitude: 26.148,
      longitude: 91.739,
      rainfallMm: 14,
      validFrom: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      validTo: new Date(now).toISOString(),
      confidence: 0.9,
    },
  ],
};

export function getPlaceholderRainfallObservations(): RainfallObservation[] {
  return [
    ...nasaGpmAdapter.normalize(placeholderNasaInput),
    ...imdAdapter.normalize(placeholderImdInput),
  ];
}
