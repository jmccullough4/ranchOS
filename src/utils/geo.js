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
