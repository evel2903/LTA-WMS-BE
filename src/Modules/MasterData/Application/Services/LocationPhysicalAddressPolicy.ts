export type LocationPhysicalAddressInput = {
  AisleCode?: string | null;
  RackCode?: string | null;
  LevelCode?: string | null;
  BinCode?: string | null;
};

export type LocationPhysicalAddress = {
  AisleCode: string | null;
  RackCode: string | null;
  LevelCode: string | null;
  BinCode: string | null;
};

export type CompleteLocationPhysicalAddress = {
  AisleCode: string;
  RackCode: string;
  LevelCode: string;
  BinCode: string;
};

export class LocationPhysicalAddressPolicy {
  public static Normalize(input: LocationPhysicalAddressInput): LocationPhysicalAddress {
    return {
      AisleCode: LocationPhysicalAddressPolicy.NormalizeText(input.AisleCode),
      RackCode: LocationPhysicalAddressPolicy.NormalizeText(input.RackCode),
      LevelCode: LocationPhysicalAddressPolicy.NormalizeText(input.LevelCode),
      BinCode: LocationPhysicalAddressPolicy.NormalizeText(input.BinCode),
    };
  }

  public static IsComplete(address: LocationPhysicalAddress): address is CompleteLocationPhysicalAddress {
    return Boolean(address.AisleCode && address.RackCode && address.LevelCode && address.BinCode);
  }

  private static NormalizeText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toUpperCase() : null;
  }
}
