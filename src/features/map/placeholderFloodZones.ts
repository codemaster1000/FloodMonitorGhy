import type { FloodProneZonesFeatureCollection } from "../../types/FloodZone";

export const placeholderFloodProneZones: FloodProneZonesFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "zone-anil-nagar",
        name: "Anil Nagar Lowland",
        riskLevel: "high",
        note: "Recurring monsoon waterlogging corridor.",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [91.7475, 26.1522],
            [91.7551, 26.1522],
            [91.7551, 26.1465],
            [91.7475, 26.1465],
            [91.7475, 26.1522],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "zone-lachit-nagar",
        name: "Lachit Nagar Pocket",
        riskLevel: "moderate",
        note: "Short-duration flooding after heavy rainfall bursts.",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [91.7412, 26.1694],
            [91.7483, 26.1694],
            [91.7483, 26.1641],
            [91.7412, 26.1641],
            [91.7412, 26.1694],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "zone-janata-bhaskar",
        name: "Janata Bhaskar Belt",
        riskLevel: "high",
        note: "Drain congestion hotspot during prolonged rain.",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [91.7174, 26.1413],
            [91.7262, 26.1413],
            [91.7262, 26.1346],
            [91.7174, 26.1346],
            [91.7174, 26.1413],
          ],
        ],
      },
    },
  ],
};
