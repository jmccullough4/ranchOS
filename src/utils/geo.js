const EARTH_RADIUS_METERS = 6378137;
const SQUARE_METERS_PER_ACRE = 4046.8564224;

function projectToMeters([lon, lat], referenceLat) {
  const rad = Math.PI / 180;
  const x = EARTH_RADIUS_METERS * (lon * rad) * Math.cos(referenceLat * rad);
  const y = EARTH_RADIUS_METERS * (lat * rad);
  return [x, y];
}

export function polygonAreaInAcres(coords) {
  if (!coords || coords.length < 3) return 0;
  const referenceLat = coords.reduce((sum, point) => sum + point[1], 0) / coords.length;
  let area = 0;
  const points = coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1] ? coords : [...coords, coords[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = projectToMeters(points[index], referenceLat);
    const next = projectToMeters(points[index + 1], referenceLat);
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area / 2) / SQUARE_METERS_PER_ACRE;
}

export function distanceInMeters(a, b) {
  if (!a || !b) return 0;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_METERS * c;
}

export function distanceToFenceMeters(point, bounds) {
  if (!point || !bounds) return 0;
  const { lon, lat } = point;
  if (typeof lon !== "number" || typeof lat !== "number") return 0;
  const { minLon, maxLon, minLat, maxLat } = bounds;
  const distances = [
    distanceInMeters({ lon, lat }, { lon, lat: minLat }),
    distanceInMeters({ lon, lat }, { lon, lat: maxLat }),
    distanceInMeters({ lon, lat }, { lon: minLon, lat }),
    distanceInMeters({ lon, lat }, { lon: maxLon, lat }),
  ];
  return Math.min(...distances.filter((value) => Number.isFinite(value)));
}
