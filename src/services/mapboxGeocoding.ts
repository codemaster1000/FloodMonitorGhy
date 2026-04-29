const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

import {
  getCachedGeocodeResult,
  setCachedGeocodeResult,
} from "../utils/reverseGeocodeCache";

interface MapboxReverseGeocodeFeature {
  id?: string;
  place_type?: string[];
  text?: string;
  place_name?: string;
  bbox?: [number, number, number, number];
}

interface MapboxReverseGeocodeResponse {
  features?: MapboxReverseGeocodeFeature[];
}

export interface ReverseGeocodeResult {
  name: string | null;
  geofence: Array<Array<[number, number]>> | null;
  areaName: string | null;
}

async function fetchReverseFeatures(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [] as MapboxReverseGeocodeFeature[];
    }

    const data = (await response.json()) as MapboxReverseGeocodeResponse;
    return data.features ?? [];
  } catch (err) {
    console.error("Fetch reverse geocode failed:", err);
    return [] as MapboxReverseGeocodeFeature[];
  }
}

function findByType(
  features: MapboxReverseGeocodeFeature[],
  type: string,
): MapboxReverseGeocodeFeature | undefined {
  return features.find((feature) => feature.place_type?.includes(type));
}

function compactLabel(feature?: MapboxReverseGeocodeFeature) {
  if (!feature) {
    return null;
  }

  return feature.text ?? feature.place_name?.split(",")[0] ?? null;
}

function toBboxPolygon(
  bbox?: [number, number, number, number],
): Array<Array<[number, number]>> | null {
  if (!bbox || bbox.length !== 4) {
    return null;
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;

  return [
    [
      [minLongitude, minLatitude],
      [maxLongitude, minLatitude],
      [maxLongitude, maxLatitude],
      [minLongitude, maxLatitude],
      [minLongitude, minLatitude],
    ],
  ];
}

export async function reverseGeocodeLocality(
  latitude: number,
  longitude: number,
) {
  // Check cache first - reduces API calls by ~80%
  const cached = getCachedGeocodeResult(latitude, longitude);
  if (cached !== null) {
    return cached;
  }

  const result = await reverseGeocodeLocationWithGeofence(latitude, longitude);

  // Cache the result
  if (result.name) {
    setCachedGeocodeResult(latitude, longitude, result.name);
  }

  return result.name;
}

export async function reverseGeocodeLocationWithGeofence(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  if (!mapboxToken) {
    return { name: null, geofence: null, areaName: null };
  }

  // First pass: structured locality-style labels.
  let features = await fetchReverseFeatures(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=address,neighborhood,locality,place,district&language=en&country=IN&access_token=${mapboxToken}`,
  );

  // Fallback: broad reverse geocode if filtered lookup yields nothing.
  if (features.length === 0) {
    features = await fetchReverseFeatures(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?limit=3&language=en&access_token=${mapboxToken}`,
    );
  }

  if (features.length === 0) {
    return { name: null, geofence: null, areaName: null };
  }

  // Prefer neighborhood/locality-level labels to avoid overly granular names.
  const areaFeature =
    findByType(features, "neighborhood") ??
    findByType(features, "locality") ??
    findByType(features, "district") ??
    findByType(features, "place");

  const geofenceFeature =
    areaFeature ??
    findByType(features, "place") ??
    findByType(features, "district") ??
    findByType(features, "locality") ??
    features.find((feature) => Boolean(feature.bbox));

  // Use street/address only as context to keep names precise but not noisy.
  const streetFeature = findByType(features, "address");

  const areaLabel = compactLabel(areaFeature);
  const streetLabel = compactLabel(streetFeature);

  if (areaLabel && streetLabel && areaLabel !== streetLabel) {
    return {
      name: `${areaLabel} - ${streetLabel}`,
      geofence: toBboxPolygon(geofenceFeature?.bbox),
      areaName: areaLabel,
    };
  }

  if (areaLabel) {
    return {
      name: areaLabel,
      geofence: toBboxPolygon(geofenceFeature?.bbox),
      areaName: areaLabel,
    };
  }

  if (streetLabel) {
    return {
      name: streetLabel,
      geofence: toBboxPolygon(geofenceFeature?.bbox),
      areaName: compactLabel(geofenceFeature),
    };
  }

  return {
    name: compactLabel(features[0]),
    geofence: toBboxPolygon(geofenceFeature?.bbox),
    areaName: compactLabel(geofenceFeature),
  };
}
