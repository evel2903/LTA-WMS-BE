import type { DataSource, EntityManager } from 'typeorm';

import { CatalogVersionUnavailableException } from '@common/Exceptions/AppException';
import { RoleCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleCatalogRepository';

describe('RoleCatalogRepository schema fail-closed behavior', () => {
  it('maps a missing singleton table to CATALOG_VERSION_UNAVAILABLE for reads and writers', async () => {
    const missingTable = Object.assign(new Error('relation "role_catalog_versions" does not exist'), {
      code: '42P01',
    });
    const manager = {
      query: jest.fn().mockRejectedValue(missingTable),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (_isolation: string, callback: (tx: EntityManager) => Promise<unknown>) =>
        callback(manager),
      ),
    } as unknown as DataSource;
    const repository = new RoleCatalogRepository(dataSource);

    await expect(repository.ReadPage(1, 100)).rejects.toBeInstanceOf(CatalogVersionUnavailableException);
    await expect(repository.Bump(manager)).rejects.toBeInstanceOf(CatalogVersionUnavailableException);
  });
});
