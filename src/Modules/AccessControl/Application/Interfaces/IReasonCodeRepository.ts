import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';

export const REASON_CODE_REPOSITORY = Symbol('IReasonCodeRepository');

export interface ReasonCodeListFilter {
  ReasonGroup?: ReasonGroup;
  Status?: ReasonCodeStatus;
  Action?: ActionCode;
}

export interface IReasonCodeRepository {
  FindById(id: string): Promise<ReasonCodeEntity | null>;
  FindByCode(reasonCode: string): Promise<ReasonCodeEntity | null>;
  Create(reasonCode: ReasonCodeEntity): Promise<ReasonCodeEntity>;
  Update(reasonCode: ReasonCodeEntity): Promise<ReasonCodeEntity>;
  List(
    skip: number,
    take: number,
    filter?: ReasonCodeListFilter,
  ): Promise<{ Items: ReasonCodeEntity[]; TotalItems: number }>;
}
