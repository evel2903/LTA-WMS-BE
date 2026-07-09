import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  PolicyFieldSpec,
  ValidatePolicyAgainstSpec,
} from '@modules/MasterData/Domain/ValueObjects/LocationProfilePolicySchema';

@ValidatorConstraint({ name: 'isLocationProfilePolicy', async: false })
class IsLocationProfilePolicyConstraint implements ValidatorConstraintInterface {
  public validate(value: unknown, args: ValidationArguments): boolean {
    const spec = args.constraints[0] as PolicyFieldSpec;
    return ValidatePolicyAgainstSpec(value, spec).length === 0;
  }

  public defaultMessage(args: ValidationArguments): string {
    const spec = args.constraints[0] as PolicyFieldSpec;
    const errors = ValidatePolicyAgainstSpec(args.value, spec);
    return `${args.property} invalid: ${errors.join('; ')}`;
  }
}

/**
 * Whitelists the keys + primitive types a LocationProfile policy field may contain, per FFB-06's
 * canonical schema (see LocationProfilePolicySchema.ts). Applies only to the Create/Update Request
 * write path — GET responses are never re-validated, so a pre-existing LocationProfile row with
 * free-form JSON still reads back fine.
 */
export function IsLocationProfilePolicy(spec: PolicyFieldSpec, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [spec],
      validator: IsLocationProfilePolicyConstraint,
    });
  };
}
