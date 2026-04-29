import type { FloodReport } from "../../types/FloodReport";
import type { FloodProneZonesFeatureCollection } from "../../types/FloodZone";
import type {
  GuwahatiRiskGridCell,
  RainfallObservation,
  RiskCellFeatureCollection,
} from "../../types/RainfallRisk";
import { toRiskGeoJson } from "../map/riskGeoJsonService";
import { buildRiskInputs } from "./riskInputBuilder";
import { computeRiskBatch } from "../../utils/riskEngine";

export function buildRiskGeoJson(params: {
  gridCells: GuwahatiRiskGridCell[];
  observations: RainfallObservation[];
  reports: FloodReport[];
  floodProneZones: FloodProneZonesFeatureCollection;
}): RiskCellFeatureCollection {
  const inputs = buildRiskInputs(params);
  const results = computeRiskBatch(inputs);
  return toRiskGeoJson(results);
}
