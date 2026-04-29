import type {
  GuwahatiRiskResult,
  RiskCellFeatureCollection,
} from "../../types/RainfallRisk";

export function toRiskGeoJson(
  results: GuwahatiRiskResult[],
): RiskCellFeatureCollection {
  return {
    type: "FeatureCollection",
    features: results.map(({ input, risk }) => ({
      type: "Feature",
      geometry: input.geometry,
      properties: {
        cellId: input.cellId,
        score: risk.score,
        category: risk.category,
        confidence: risk.confidence,
        computedAt: risk.computedAt,
        expiresAt: risk.expiresAt,
        topReasons: risk.reasons.slice(0, 3),
        sourceMix: input.rainfall.sourceMix,
        rainfallTotalMm: input.rainfall.totalMm,
        rainfallIntensityMmPerHr: input.rainfall.intensityMmPerHr,
        reportCount: input.liveReports.reportCount,
        highestWaterLevel: input.liveReports.highestWaterLevel,
      },
    })),
  };
}
