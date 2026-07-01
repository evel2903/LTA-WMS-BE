import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ListReasonCodesQuery } from '@modules/AccessControl/Presentation/Requests/ListReasonCodesQuery';

const validateQuery = (input: Record<string, unknown>) =>
  validate(plainToInstance(ListReasonCodesQuery, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('ListReasonCodesQuery', () => {
  it('accepts a valid ObjectType filter', async () => {
    await expect(validateQuery({ ObjectType: ObjectType.Warehouse })).resolves.toHaveLength(0);
  });

  it('rejects an invalid ObjectType filter', async () => {
    const errors = await validateQuery({ ObjectType: 'WarehouseType' });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'ObjectType',
          constraints: expect.objectContaining({ isEnum: expect.any(String) }),
        }),
      ]),
    );
  });
});
