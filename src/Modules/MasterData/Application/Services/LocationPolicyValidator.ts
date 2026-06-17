import { BusinessRuleException } from '@common/Exceptions/AppException';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class LocationPolicyValidator {
  public static Validate(location: LocationEntity, profile: LocationProfileEntity): void {
    if (profile.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Location profile must be active');
    }
    if (profile.LocationType.trim().length === 0) {
      throw new BusinessRuleException('Active location profile requires LocationType');
    }
    if (location.LocationType !== profile.LocationType) {
      throw new BusinessRuleException('Location type must match location profile type');
    }
    if (location.LocationStatus !== LocationStatus.Active) {
      return;
    }

    if (profile.CapacityPolicy.RequireCapacityQty === true && (!location.CapacityQty || location.CapacityQty <= 0)) {
      throw new BusinessRuleException('Active location requires positive CapacityQty for this profile');
    }

    const requiredTemperatureClass = profile.CompliancePolicy.RequiredTemperatureClass;
    if (
      typeof requiredTemperatureClass === 'string' &&
      requiredTemperatureClass.length > 0 &&
      location.TemperatureClass !== requiredTemperatureClass
    ) {
      throw new BusinessRuleException('Location temperature class does not satisfy profile compliance policy');
    }

    if (profile.CompliancePolicy.BondedOnly === true && location.BondedFlag !== true) {
      throw new BusinessRuleException('Location must be bonded for this profile');
    }
  }
}
