import { Request } from 'express';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';

const makeRequest = (parts: { body?: unknown; params?: unknown; query?: unknown }): Request =>
  ({ body: parts.body ?? {}, params: parts.params ?? {}, query: parts.query ?? {} }) as Request;

describe('ScopeExtractor', () => {
  const extractor = new ScopeExtractor();

  it('reads a scope id from the body', () => {
    const scope = extractor.Extract(makeRequest({ body: { WarehouseId: 'W1' } }), {
      WarehouseId: { In: 'body', Key: 'WarehouseId' },
    });
    expect(scope).toEqual({ WarehouseId: 'W1', ZoneId: null, OwnerId: null });
  });

  it('reads scope ids from route param and query', () => {
    const fromParam = extractor.Extract(makeRequest({ params: { id: 'OWN-1' } }), {
      OwnerId: { In: 'param', Key: 'id' },
    });
    expect(fromParam.OwnerId).toBe('OWN-1');

    const fromQuery = extractor.Extract(makeRequest({ query: { ownerId: 'OWN-2' } }), {
      OwnerId: { In: 'query', Key: 'ownerId' },
    });
    expect(fromQuery.OwnerId).toBe('OWN-2');
  });

  it('returns null for a configured axis missing from the request', () => {
    const scope = extractor.Extract(makeRequest({ body: {} }), { WarehouseId: { In: 'body', Key: 'WarehouseId' } });
    expect(scope.WarehouseId).toBeNull();
  });

  it('treats empty-string and non-string values as absent', () => {
    const scope = extractor.Extract(makeRequest({ body: { WarehouseId: '', OwnerId: 123 } }), {
      WarehouseId: { In: 'body', Key: 'WarehouseId' },
      OwnerId: { In: 'body', Key: 'OwnerId' },
    });
    expect(scope.WarehouseId).toBeNull();
    expect(scope.OwnerId).toBeNull();
  });
});
