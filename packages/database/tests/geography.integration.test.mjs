import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
test(
  'PostGIS geography migration and seed are available',
  { skip: !process.env.DATABASE_URL },
  async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const extensions = await pool.query(
        "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pgcrypto', 'citext')",
      );
      assert.equal(extensions.rowCount, 3);
      const places = await pool.query(
        "SELECT name FROM places WHERE name IN ('Casablanca', 'Rabat', 'Marrakesh', 'Paris', 'Seville')",
      );
      assert.equal(places.rowCount, 5);
    } finally {
      await pool.end();
    }
  },
);
