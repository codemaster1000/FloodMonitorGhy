import { placeholderFloodProneZones } from "./placeholderFloodZones";
import type { FloodProneZonesFeatureCollection } from "../../types/FloodZone";

export async function getFloodProneZones(): Promise<FloodProneZonesFeatureCollection> {
  return placeholderFloodProneZones;
}
