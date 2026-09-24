export const WGS84_SRID = 4326;
export interface GeographicPoint {
  longitude: number;
  latitude: number;
}
export const isGeographicPoint = (point: GeographicPoint): boolean =>
  Number.isFinite(point.longitude) &&
  Number.isFinite(point.latitude) &&
  point.longitude >= -180 &&
  point.longitude <= 180 &&
  point.latitude >= -90 &&
  point.latitude <= 90;
export const assertGeographicPoint = (point: GeographicPoint): GeographicPoint => {
  if (!isGeographicPoint(point))
    throw new Error('Coordinates must use WGS84 longitude/latitude bounds.');
  return point;
};
export type GeographicId = string;
