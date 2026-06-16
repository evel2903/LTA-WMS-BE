import { InMemoryCacheService } from '../../../src/Modules/Cache/Infrastructure/InMemoryCacheService';

describe('InMemoryCacheService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null for missing key', async () => {
    const cache = new InMemoryCacheService();
    await expect(cache.Get('missing')).resolves.toBeNull();
  });

  it('stores and retrieves values', async () => {
    const cache = new InMemoryCacheService();
    await cache.Set('k', 'v');
    await expect(cache.Get('k')).resolves.toBe('v');
  });

  it('expires values when ttl is set', async () => {
    const cache = new InMemoryCacheService();
    await cache.Set('k', 'v', 2);
    await expect(cache.Get('k')).resolves.toBe('v');

    jest.advanceTimersByTime(1999);
    await expect(cache.Get('k')).resolves.toBe('v');

    jest.advanceTimersByTime(1);
    await expect(cache.Get('k')).resolves.toBeNull();
  });

  it('deletes values', async () => {
    const cache = new InMemoryCacheService();
    await cache.Set('k', 'v');
    await cache.Delete('k');
    await expect(cache.Get('k')).resolves.toBeNull();
  });
});
