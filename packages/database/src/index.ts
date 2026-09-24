import { Pool, type PoolConfig } from 'pg';
import type { Country, Place } from '@la-toile-intelligente/contracts';

export const createDatabase = (connectionString: string): Pool => new Pool({ connectionString });
type CountryRow = { id: string; code: string; name: string; capital: string | null };
type PlaceRow = {
  id: string;
  country_id: string;
  name: string;
  kind: Place['kind'];
  longitude: number;
  latitude: number;
};
export class GeographyRepository {
  public constructor(private readonly pool: Pool) {}
  async listCountries(query?: string): Promise<Country[]> {
    const { rows } = await this.pool.query<CountryRow>(
      "SELECT id, code, name, capital FROM countries WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%') ORDER BY name",
      [query ?? null],
    );
    return rows;
  }
  async getCountry(id: string): Promise<Country | null> {
    const { rows } = await this.pool.query<CountryRow>(
      'SELECT id, code, name, capital FROM countries WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }
  async listPlaces(countryId?: string, query?: string): Promise<Place[]> {
    const { rows } = await this.pool.query<PlaceRow>(
      "SELECT id, country_id, name, kind, ST_X(location) AS longitude, ST_Y(location) AS latitude FROM places WHERE ($1::uuid IS NULL OR country_id = $1) AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%') ORDER BY name",
      [countryId ?? null, query ?? null],
    );
    return rows.map(toPlace);
  }
  async getPlace(id: string): Promise<Place | null> {
    const { rows } = await this.pool.query<PlaceRow>(
      'SELECT id, country_id, name, kind, ST_X(location) AS longitude, ST_Y(location) AS latitude FROM places WHERE id = $1',
      [id],
    );
    return rows[0] ? toPlace(rows[0]) : null;
  }
}
const toPlace = (row: PlaceRow): Place => ({
  id: row.id,
  countryId: row.country_id,
  name: row.name,
  kind: row.kind,
  location: { longitude: Number(row.longitude), latitude: Number(row.latitude) },
});
export type DatabaseOptions = PoolConfig;
