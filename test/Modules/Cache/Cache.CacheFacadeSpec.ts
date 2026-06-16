import { CacheFacade } from '../../../src/Modules/Cache/Application/CacheFacade';
import { ICacheService } from '../../../src/Modules/Cache/Domain/Interfaces/ICacheService';

class FakeCacheService implements ICacheService {
  public Get = jest.fn<Promise<string | null>, [string]>();
  public Set = jest.fn<Promise<void>, [string, string, number | undefined]>();
  public Delete = jest.fn<Promise<void>, [string]>();
}

describe('CacheFacade', () => {
  it('delegates GetString/SetString/Delete to cache service', async () => {
    const cache = new FakeCacheService();
    cache.Get.mockResolvedValue('v');

    const facade = new CacheFacade(cache);
    await expect(facade.GetString('k')).resolves.toBe('v');
    await facade.SetString('k', 'v', 10);
    await facade.Delete('k');

    expect(cache.Get).toHaveBeenCalledWith('k');
    expect(cache.Set).toHaveBeenCalledWith('k', 'v', 10);
    expect(cache.Delete).toHaveBeenCalledWith('k');
  });
});
