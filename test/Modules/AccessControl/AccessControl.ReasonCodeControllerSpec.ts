import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonCodeController } from '@modules/AccessControl/Presentation/Controllers/ReasonCodeController';
import { ListReasonCodesQuery } from '@modules/AccessControl/Presentation/Requests/ListReasonCodesQuery';

describe('ReasonCodeController', () => {
  it('forwards ObjectType query filters to the list use case', async () => {
    const listReasonCodesUseCase = {
      Execute: jest.fn(async () => ({
        Items: [],
        Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 },
      })),
    };
    const controller = new ReasonCodeController({} as never, {} as never, listReasonCodesUseCase as never, {} as never);
    const query = Object.assign(new ListReasonCodesQuery(), {
      Action: ActionCode.Update,
      ObjectType: ObjectType.Warehouse,
      PageSize: 100,
    });

    await controller.List(query);

    expect(listReasonCodesUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.Warehouse,
        PageSize: 100,
      }),
    );
  });
});
