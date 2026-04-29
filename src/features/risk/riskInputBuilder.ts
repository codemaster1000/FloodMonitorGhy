import type { FloodReport } from "../../types/FloodReport";
import type { FloodProneZonesFeatureCollection } from "../../types/FloodZone";
import type {
  GuwahatiRiskCellInput,
  GuwahatiRiskGridCell,
  RainfallObservation,
  RainfallSource,
} from "../../types/RainfallRisk";

function isPointInRing(
  point: { latitude: number; longitude: number },
  ring: number[][],
) {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude <
        ((xj - xi) * (point.latitude - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: number[][][],
) {
  if (!polygon.length) {
    return false;
  }

  if (!isPointInRing(point, polygon[0])) {
    return false;
  }

  // Holes: if inside hole, treat as outside.
  for (let i = 1; i < polygon.length; i += 1) {
    if (isPointInRing(point, polygon[i])) {
      return false;
    }
  }

  return true;
}

function toWaterLevelWeight(level: FloodReport["water_level"]) {
  const map = {
    ankle: 1,
    knee: 2,
    waist: 3,
    severe: 4,
  } as const;

  return map[level];
}

export function buildRiskInputs(params: {
  gridCells: GuwahatiRiskGridCell[];
  observations: RainfallObservation[];
  reports: FloodReport[];
  floodProneZones: FloodProneZonesFeatureCollection;
}): GuwahatiRiskCellInput[] {
  const { gridCells, observations, reports, floodProneZones } = params;

  return gridCells.map<GuwahatiRiskCellInput>((cell) => {
    const inCellObservations = observations.filter((observation) =>
      isPointInPolygon(observation.location, cell.geometry.coordinates),
    );

    const totalMm = inCellObservations.reduce(
      (sum, observation) => sum + observation.rainfallMm,
      0,
    );

    const starts = inCellObservations.map((item) =>
      new Date(item.validFrom).getTime(),
    );
    const ends = inCellObservations.map((item) =>
      new Date(item.validTo).getTime(),
    );

    const minStart = starts.length ? Math.min(...starts) : Date.now();
    const maxEnd = ends.length ? Math.max(...ends) : Date.now();

    const durationMinutes = Math.max(
      1,
      Math.round((maxEnd - minStart) / (1000 * 60)) || 1,
    );

    const intensityMmPerHr = (totalMm / durationMinutes) * 60;

    const sourceMix = [
      ...new Set(inCellObservations.map((item) => item.source)),
    ] as RainfallSource[];
    const latestObservationTs = inCellObservations.length
      ? Math.max(
          ...inCellObservations.map((item) =>
            new Date(item.capturedAt).getTime(),
          ),
        )
      : Date.now();

    const inCellReports = reports.filter((report) =>
      isPointInPolygon(
        { latitude: report.latitude, longitude: report.longitude },
        cell.geometry.coordinates,
      ),
    );

    const highestReport = inCellReports.sort(
      (a, b) =>
        toWaterLevelWeight(b.water_level) - toWaterLevelWeight(a.water_level),
    )[0];

    const latestReportAt = inCellReports.length
      ? inCellReports.reduce(
          (latest, report) =>
            new Date(report.created_at).getTime() > new Date(latest).getTime()
              ? report.created_at
              : latest,
          inCellReports[0].created_at,
        )
      : undefined;

    const overlappingZones = floodProneZones.features.filter((feature) =>
      isPointInPolygon(cell.centroid, feature.geometry.coordinates),
    );

    const zoneRiskLevel = overlappingZones.some(
      (zone) => zone.properties.riskLevel === "high",
    )
      ? "high"
      : overlappingZones[0]?.properties.riskLevel;

    return {
      cellId: cell.cellId,
      centroid: cell.centroid,
      geometry: cell.geometry,
      rainfall: {
        totalMm,
        intensityMmPerHr,
        durationMinutes,
        maxRolling1hMm: totalMm,
        maxRolling3hMm: totalMm,
        sourceCount: sourceMix.length,
        sourceMix,
        lastUpdatedAt: new Date(latestObservationTs).toISOString(),
      },
      terrain: {
        elevationM: cell.terrain?.elevationM,
        slopePercent: cell.terrain?.slopePercent,
        lowLying: cell.terrain?.lowLying ?? false,
        drainageSusceptibility: cell.terrain?.drainageSusceptibility,
      },
      floodContext: {
        inFloodProneZone:
          overlappingZones.length > 0 ||
          cell.floodContext?.inFloodProneZone === true,
        zoneIds:
          overlappingZones.map((zone) => zone.properties.id) ??
          cell.floodContext?.zoneIds ??
          [],
        zoneRiskLevel,
      },
      liveReports: {
        reportCount: inCellReports.length,
        confirmedCount: inCellReports.length,
        latestReportAt,
        highestWaterLevel: highestReport?.water_level,
      },
    };
  });
}
