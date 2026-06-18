import { DataOwnershipMode } from '@modules/MasterData/Domain/Enums/DataOwnershipMode';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { OwnershipPolicyImplementationStatus } from '@modules/MasterData/Domain/Enums/OwnershipPolicyImplementationStatus';
import { SourceOfTruthType } from '@modules/MasterData/Domain/Enums/SourceOfTruthType';

export class MasterDataOwnershipPolicyEntity {
  public readonly Id: string;
  public ObjectGroup: MasterDataObjectGroup;
  public DisplayName: string;
  public SourceOfTruthType: SourceOfTruthType;
  public TypicalSourceSystems: string[];
  public OwnershipMode: DataOwnershipMode;
  public DirectEditAllowed: boolean;
  public RequiresAudit: boolean;
  public RequiresReason: boolean;
  public RequiresSourceSystem: boolean;
  public RequiresReferenceId: boolean;
  public ImplementationStatus: OwnershipPolicyImplementationStatus;
  public DeferredToStory: string | null;
  public PolicyNotes: string;
  public SourceDocRef: string;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    ObjectGroup: MasterDataObjectGroup;
    DisplayName: string;
    SourceOfTruthType: SourceOfTruthType;
    TypicalSourceSystems: string[];
    OwnershipMode: DataOwnershipMode;
    DirectEditAllowed: boolean;
    RequiresAudit: boolean;
    RequiresReason: boolean;
    RequiresSourceSystem: boolean;
    RequiresReferenceId: boolean;
    ImplementationStatus: OwnershipPolicyImplementationStatus;
    DeferredToStory?: string | null;
    PolicyNotes: string;
    SourceDocRef: string;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.ObjectGroup = params.ObjectGroup;
    this.DisplayName = params.DisplayName;
    this.SourceOfTruthType = params.SourceOfTruthType;
    this.TypicalSourceSystems = params.TypicalSourceSystems;
    this.OwnershipMode = params.OwnershipMode;
    this.DirectEditAllowed = params.DirectEditAllowed;
    this.RequiresAudit = params.RequiresAudit;
    this.RequiresReason = params.RequiresReason;
    this.RequiresSourceSystem = params.RequiresSourceSystem;
    this.RequiresReferenceId = params.RequiresReferenceId;
    this.ImplementationStatus = params.ImplementationStatus;
    this.DeferredToStory = params.DeferredToStory ?? null;
    this.PolicyNotes = params.PolicyNotes;
    this.SourceDocRef = params.SourceDocRef;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
