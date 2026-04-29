import type {
  ImdAdapterInput,
  NasaGpmAdapterInput,
  RainfallAdapter,
  RainfallObservation,
} from "../../types/RainfallRisk";

function getDurationMinutes(validFrom: string, validTo: string) {
  const diffMs = new Date(validTo).getTime() - new Date(validFrom).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return undefined;
  }

  return Math.round(diffMs / (1000 * 60));
}

export const nasaGpmAdapter: RainfallAdapter<NasaGpmAdapterInput> = {
  source: "nasa_gpm",
  normalize(input) {
    return input.points.map<RainfallObservation>((point) => ({
      source: "nasa_gpm",
      sourceRecordId: point.id,
      capturedAt: input.timestamp,
      validFrom: input.timestamp,
      validTo: input.timestamp,
      location: {
        latitude: point.latitude,
        longitude: point.longitude,
      },
      spatialResolutionMeters: input.spatialResolutionMeters ?? 10000,
      temporalResolutionMinutes: input.temporalResolutionMinutes ?? 30,
      rainfallMm: point.rainfallMm,
      rainfallRateMmPerHr: point.rainfallRateMmPerHr,
      confidence: point.qualityFlag === "good" ? 0.9 : 0.75,
      quality: {
        isEstimated: true,
        isInterpolated: false,
        missingData: point.rainfallMm < 0,
      },
      rawSourceRef: input.sourceRef,
      metadata: {
        qualityFlag: point.qualityFlag,
      },
    }));
  },
};

export const imdAdapter: RainfallAdapter<ImdAdapterInput> = {
  source: "imd",
  normalize(input) {
    return input.observations.map<RainfallObservation>((item) => {
      const rainfallMm =
        item.rainfallMm ??
        (item.rainfallRateMmPerHr ?? 0) *
          ((getDurationMinutes(item.validFrom, item.validTo) ?? 60) / 60);

      return {
        source: "imd",
        sourceRecordId: item.id,
        capturedAt: item.validTo,
        issuedAt: input.issuedAt,
        validFrom: item.validFrom,
        validTo: item.validTo,
        location: {
          latitude: item.latitude,
          longitude: item.longitude,
        },
        temporalResolutionMinutes: getDurationMinutes(
          item.validFrom,
          item.validTo,
        ),
        rainfallMm,
        rainfallRateMmPerHr: item.rainfallRateMmPerHr,
        confidence: item.confidence ?? 0.85,
        quality: {
          isEstimated: item.rainfallMm == null,
          isInterpolated: false,
          missingData: rainfallMm <= 0,
        },
        rawSourceRef: input.sourceRef,
        metadata: {
          bulletinId: input.bulletinId,
        },
      };
    });
  },
};
