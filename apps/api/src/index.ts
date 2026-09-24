import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadEnvironment } from '@la-toile-intelligente/config';
import { countriesQuerySchema, placesQuerySchema } from '@la-toile-intelligente/contracts';
import { createDatabase, GeographyRepository } from '@la-toile-intelligente/database';

const env = loadEnvironment();
const repository = new GeographyRepository(createDatabase(env.DATABASE_URL));
const respond = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
};
const route = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method !== 'GET') return respond(response, 405, { error: 'Method not allowed' });
    const countryId = url.pathname.match(/^\/countries\/([^/]+)$/)?.[1];
    const placeId = url.pathname.match(/^\/places\/([^/]+)$/)?.[1];
    if (url.pathname === '/countries')
      return respond(
        response,
        200,
        await repository.listCountries(
          countriesQuerySchema.parse({ q: url.searchParams.get('q') ?? undefined }).q,
        ),
      );
    if (countryId) {
      const item = await repository.getCountry(countryId);
      return respond(response, item ? 200 : 404, item ?? { error: 'Country not found' });
    }
    if (url.pathname === '/places') {
      const query = placesQuerySchema.parse({
        countryId: url.searchParams.get('countryId') ?? undefined,
        q: url.searchParams.get('q') ?? undefined,
      });
      return respond(response, 200, await repository.listPlaces(query.countryId, query.q));
    }
    if (placeId) {
      const item = await repository.getPlace(placeId);
      return respond(response, item ? 200 : 404, item ?? { error: 'Place not found' });
    }
    return respond(response, 404, { error: 'Not found' });
  } catch {
    return respond(response, 400, { error: 'Invalid request' });
  }
};
createServer(route).listen(env.API_PORT, () =>
  console.info(`Geography API listening on ${env.API_PORT}`),
);
