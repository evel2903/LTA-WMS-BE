import { GetLiveUseCase } from '../../../src/Modules/Health/Application/UseCases/GetLiveUseCase';
import { GetReadyUseCase } from '../../../src/Modules/Health/Application/UseCases/GetReadyUseCase';
import { IHealthService, ReadyReport } from '../../../src/Modules/Health/Domain/Interfaces/IHealthService';

class FakeHealthService implements IHealthService {
  public Live = jest.fn<Promise<{ Status: 'OK' }>, []>();
  public Ready = jest.fn<Promise<ReadyReport>, []>();
}

describe('Health use cases', () => {
  it('GetLiveUseCase delegates to service', async () => {
    const service = new FakeHealthService();
    service.Live.mockResolvedValue({ Status: 'OK' });

    const useCase = new GetLiveUseCase(service);
    await expect(useCase.Execute()).resolves.toEqual({ Status: 'OK' });
    expect(service.Live).toHaveBeenCalledTimes(1);
  });

  it('GetReadyUseCase delegates to service', async () => {
    const service = new FakeHealthService();
    service.Ready.mockResolvedValue({ Status: 'ok', Info: {}, Error: {}, Details: {} });

    const useCase = new GetReadyUseCase(service);
    await expect(useCase.Execute()).resolves.toEqual({ Status: 'ok', Info: {}, Error: {}, Details: {} });
    expect(service.Ready).toHaveBeenCalledTimes(1);
  });
});
