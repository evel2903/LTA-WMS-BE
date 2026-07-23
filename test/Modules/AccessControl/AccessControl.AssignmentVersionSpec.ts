import { HttpStatus } from '@nestjs/common';
import { AppException, BusinessRuleException } from '@common/Exceptions/AppException';
import { ErrorCode } from '@common/Constants/ErrorCode';
import { AssignmentVersion } from '@modules/AccessControl/Domain/ValueObjects/AssignmentVersion';

// RH-04: BIGINT versions are canonical decimal strings, never JS number.
describe('AssignmentVersion', () => {
  it('parses canonical decimal strings and round-trips, including beyond 2^53', () => {
    expect(AssignmentVersion.parse('0').toString()).toBe('0');
    expect(AssignmentVersion.parse('1').toString()).toBe('1');
    expect(AssignmentVersion.parse('9007199254740993').toString()).toBe('9007199254740993'); // 2^53 + 1
    expect(AssignmentVersion.parse('9223372036854775807').toString()).toBe('9223372036854775807'); // BIGINT max
    expect(AssignmentVersion.parse(5n).toString()).toBe('5');
  });

  it.each([
    ['empty', ''],
    ['leading zero', '01'],
    ['negative', '-1'],
    ['non-numeric', 'abc'],
    ['whitespace', ' 1 '],
    ['over BIGINT max', '9223372036854775808'],
  ])('rejects malformed/out-of-range (%s) with 400', (_label, input) => {
    expect(() => AssignmentVersion.parse(input)).toThrow(BusinessRuleException);
  });

  it('rejects a JS number outright (precision loss) with 400', () => {
    expect(() => AssignmentVersion.parse(5 as unknown)).toThrow(BusinessRuleException);
  });

  it('increments and compares', () => {
    const v = AssignmentVersion.parse('41');
    expect(v.next('EffectiveVersion').toString()).toBe('42');
    expect(AssignmentVersion.parse('42').gte(AssignmentVersion.parse('41'))).toBe(true);
    expect(AssignmentVersion.parse('41').gte(AssignmentVersion.parse('42'))).toBe(false);
    expect(AssignmentVersion.parse('42').equals(AssignmentVersion.parse('42'))).toBe(true);
  });

  it('aborts with 503 VERSION_EXHAUSTED at the BIGINT ceiling', () => {
    const max = AssignmentVersion.parse('9223372036854775807');
    try {
      max.next('IntentVersion');
      throw new Error('expected throw');
    } catch (e) {
      const ex = e as AppException;
      expect(ex.StatusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(ex.ErrorCode).toBe(ErrorCode.VersionExhausted);
      expect((ex.Details as { Counter: string }).Counter).toBe('IntentVersion');
    }
  });
});
