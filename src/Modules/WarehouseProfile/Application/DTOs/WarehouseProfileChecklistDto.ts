import { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Enums/ProfileChecklistItemStatus';

/**
 * One checklist line: a stable code, a human title/message, the verdict, optional measured evidence
 * and (only when Deferred) a concrete next story. PascalCase — this is the C10/C12 contract.
 */
export interface WarehouseProfileChecklistItemDto {
  Code: string;
  Title: string;
  Status: ProfileChecklistItemStatus;
  Message: string;
  Evidence?: string[];
  DeferredToStory?: string;
}

/**
 * Full B7 checklist response for one profile run. OverallStatus is Fail iff >=1 item Fail; Warning
 * and Deferred never make the run fail.
 */
export interface WarehouseProfileChecklistDto {
  ProfileId: string;
  WarehouseTypeCode: string;
  OverallStatus: ProfileChecklistItemStatus;
  Items: WarehouseProfileChecklistItemDto[];
  EvaluatedAt: Date;
}
