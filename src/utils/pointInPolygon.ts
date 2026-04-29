export interface LonLatPoint {
  longitude: number;
  latitude: number;
}

type Ring = Array<[number, number]>;

function isPointInRing(point: LonLatPoint, ring: Ring) {
  let isInside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [currentLng, currentLat] = ring[index];
    const [previousLng, previousLat] = ring[previous];

    const isIntersecting =
      currentLat > point.latitude !== previousLat > point.latitude &&
      point.longitude <
        ((previousLng - currentLng) * (point.latitude - currentLat)) /
          (previousLat - currentLat) +
          currentLng;

    if (isIntersecting) {
      isInside = !isInside;
    }
  }

  return isInside;
}

export function isPointInPolygon(
  point: LonLatPoint,
  polygon: Array<Array<[number, number]>>,
) {
  if (polygon.length === 0) {
    return false;
  }

  const [outerRing, ...holes] = polygon;

  if (!isPointInRing(point, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(point, hole));
}
