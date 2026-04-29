import type { GuwahatiRiskGridCell } from "../../types/RainfallRisk";

export const placeholderRiskGrid: GuwahatiRiskGridCell[] = [
  {
    cellId: "grid-001",
    centroid: { latitude: 26.1495, longitude: 91.7425 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [91.739, 26.152],
          [91.746, 26.152],
          [91.746, 26.147],
          [91.739, 26.147],
          [91.739, 26.152],
        ],
      ],
    },
    terrain: {
      lowLying: true,
      drainageSusceptibility: "high",
    },
  },
  {
    cellId: "grid-002",
    centroid: { latitude: 26.1375, longitude: 91.7225 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [91.719, 26.141],
          [91.726, 26.141],
          [91.726, 26.134],
          [91.719, 26.134],
          [91.719, 26.141],
        ],
      ],
    },
    terrain: {
      lowLying: true,
      drainageSusceptibility: "medium",
    },
  },
];
