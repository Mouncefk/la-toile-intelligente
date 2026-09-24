import { createDatabase } from './index.js';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required.');
const pool = createDatabase(url);
const countries = [
  {
    code: 'MA',
    name: 'Maroc',
    capital: 'Rabat',
    places: [
      ['Casablanca', -7.5898, 33.5731],
      ['Rabat', -6.8498, 34.0209],
      ['Marrakesh', -8.0089, 31.6295],
    ],
  },
  { code: 'FR', name: 'France', capital: 'Paris', places: [['Paris', 2.3522, 48.8566]] },
  { code: 'ES', name: 'Espagne', capital: 'Madrid', places: [['Seville', -5.9845, 37.3891]] },
] as const;
for (const country of countries) {
  const result = await pool.query<{ id: string }>(
    'INSERT INTO countries(code,name,capital) VALUES($1,$2,$3) ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, capital=EXCLUDED.capital RETURNING id',
    [country.code, country.name, country.capital],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error('Country upsert failed.');
  for (const [name, longitude, latitude] of country.places)
    await pool.query(
      "INSERT INTO places(country_id,name,kind,location) VALUES($1,$2,'city',ST_SetSRID(ST_MakePoint($3,$4),4326)) ON CONFLICT(country_id,name,kind) DO UPDATE SET location=EXCLUDED.location",
      [id, name, longitude, latitude],
    );
}
await pool.end();
