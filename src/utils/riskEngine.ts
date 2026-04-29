import type {
  GuwahatiRiskCellInput,
  GuwahatiRiskResult,
  GuwahatiRiskScore,
  RiskCategory,
  RiskReason,
} from "../types/RainfallRisk";
import type { WaterLevel } from "../types/FloodReport";

interface RiskEngineConfig {
  staleAfterMinutes: number;
  expiryMinutes: number;
}

const defaultConfig: RiskEngineConfig = {
  staleAfterMinutes: 180,
  expiryMinutes: 60,
};

const waterLevelWeight: Record<WaterLevel, number> = {
  ankle: 8,
  knee: 14,
  waist: 20,
  severe: 30,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getCategory(score: number, hasLiveReports: boolean): RiskCategory {
  if (hasLiveReports) {
    return "confirmed";
  }

  if (score >= 70) {
    return "high";
  }

  if (score >= 40) {
    return "moderate";
  }

  return "low";
}

function withReason(reasons: RiskReason[], reason: RiskReason) {
  reasons.push(reason);
  return reason.weight;
}

export function computeGuwahatiRisk(
  input: GuwahatiRiskCellInput,
  config: Partial<RiskEngineConfig> = {},
): GuwahatiRiskScore {
  const resolvedConfig = { ...defaultConfig, ...config };
  const reasons: RiskReason[] = [];

  const rainfallIntensityWeight = clamp(
    input.rainfall.intensityMmPerHr * 1.4,
    0,
    35,
  );
  const rainfallDurationWeight = clamp(
    (input.rainfall.durationMinutes / 60) * 4,
    0,
    16,
  );
  const rainfallTotalWeight = clamp(input.rainfall.totalMm * 0.45, 0, 24);

  let baseScore = 0;

  if (rainfallIntensityWeight > 0) {
    baseScore += withReason(reasons, {
      code: "rainfall_intensity",
      weight: rainfallIntensityWeight,
      message: `Rainfall intensity is ${input.rainfall.intensityMmPerHr.toFixed(1)} mm/h.`,
    });
  }

  if (rainfallDurationWeight > 0 || rainfallTotalWeight > 0) {
    baseScore += withReason(reasons, {
      code: "rainfall_duration",
      weight: rainfallDurationWeight + rainfallTotalWeight,
      message: `Rainfall duration is ${input.rainfall.durationMinutes} minutes with total ${input.rainfall.totalMm.toFixed(1)} mm.`,
    });
  }

  if (input.floodContext.inFloodProneZone) {
    const zoneWeight = input.floodContext.zoneRiskLevel === "high" ? 20 : 12;
    baseScore += withReason(reasons, {
      code: "flood_zone_overlap",
      weight: zoneWeight,
      message: `Cell overlaps flood-prone zone (${input.floodContext.zoneRiskLevel ?? "moderate"}).`,
    });
  }

  if (input.terrain.lowLying) {
    baseScore += withReason(reasons, {
      code: "terrain_lowland",
      weight: 8,
      message: "Cell terrain is marked low-lying.",
    });
  }

  if (
    input.riverContext?.floodWarningLevel &&
    input.riverContext.floodWarningLevel !== "normal"
  ) {
    const riverWeight =
      input.riverContext.floodWarningLevel === "danger"
        ? 18
        : input.riverContext.floodWarningLevel === "warning"
          ? 12
          : 6;

    baseScore += withReason(reasons, {
      code: "river_stage",
      weight: riverWeight,
      message: `Nearby gauge indicates ${input.riverContext.floodWarningLevel} status.`,
    });
  }

  let reportWeight = 0;

  if (input.liveReports.reportCount > 0) {
    reportWeight += Math.min(20, input.liveReports.reportCount * 6);

    if (input.liveReports.highestWaterLevel) {
      reportWeight += waterLevelWeight[input.liveReports.highestWaterLevel];
    }

    baseScore += withReason(reasons, {
      code: "live_reports",
      weight: reportWeight,
      message: `Live reports observed (${input.liveReports.reportCount}), highest level ${input.liveReports.highestWaterLevel ?? "ankle"}.`,
    });
  }

  const ageMinutes = Math.max(
    0,
    (Date.now() - new Date(input.rainfall.lastUpdatedAt).getTime()) /
      (1000 * 60),
  );

  if (ageMinutes > resolvedConfig.staleAfterMinutes) {
    const decay = clamp(
      (ageMinutes - resolvedConfig.staleAfterMinutes) * 0.08,
      0,
      30,
    );
    baseScore = clamp(baseScore - decay);
    withReason(reasons, {
      code: "time_decay",
      weight: -decay,
      message: `Risk decayed because rainfall data is ${Math.round(ageMinutes)} minutes old.`,
    });
  }

  const score = clamp(baseScore);

  const sourceConfidence = clamp((input.rainfall.sourceCount / 2) * 0.5, 0, 1);
  const recencyConfidence = clamp(1 - ageMinutes / 360, 0, 1);
  const reportConfidence = clamp(input.liveReports.confirmedCount * 0.3, 0, 1);

  const confidence = Number(
    clamp(
      sourceConfidence * 0.5 + recencyConfidence * 0.3 + reportConfidence * 0.2,
      0,
      1,
    ).toFixed(2),
  );

  const computedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + resolvedConfig.expiryMinutes * 60 * 1000,
  ).toISOString();

  return {
    cellId: input.cellId,
    score,
    category: getCategory(score, input.liveReports.reportCount > 0),
    reasons,
    computedAt,
    expiresAt,
    confidence,
  };
}

export function computeRiskBatch(
  inputs: GuwahatiRiskCellInput[],
  config?: Partial<RiskEngineConfig>,
): GuwahatiRiskResult[] {
  return inputs.map((input) => ({
    input,
    risk: computeGuwahatiRisk(input, config),
  }));
}
