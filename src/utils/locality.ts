import type { FloodReport } from "../types/FloodReport";

export function normalizeLocalityLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function reportMatchesLocality(
  report: Pick<FloodReport, "locality_key" | "locality_name">,
  selectedLocalityId: string | null,
  selectedLocalityName: string | null | undefined,
): boolean {
  if (selectedLocalityId && report.locality_key === selectedLocalityId) {
    return true;
  }

  if (!selectedLocalityName) {
    return false;
  }

  const normalizedSelectedName = normalizeLocalityLabel(selectedLocalityName);

  return [report.locality_key, report.locality_name]
    .filter((value): value is string => Boolean(value))
    .some((value) => {
      const normalizedCandidate = normalizeLocalityLabel(value);

      if (normalizedCandidate === normalizedSelectedName) {
        return true;
      }

      // Reverse geocoding may return longer labels (e.g. lane + landmark).
      // Accept contains-based matches for meaningful locality strings.
      if (
        normalizedCandidate.length >= 6 &&
        normalizedSelectedName.includes(normalizedCandidate)
      ) {
        return true;
      }

      if (
        normalizedSelectedName.length >= 6 &&
        normalizedCandidate.includes(normalizedSelectedName)
      ) {
        return true;
      }

      return false;
    });
}
