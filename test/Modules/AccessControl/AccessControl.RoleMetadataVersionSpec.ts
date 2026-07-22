import { NextRoleUpdatedAt } from '@modules/AccessControl/Application/Services/RoleMetadataVersion';

describe('NextRoleUpdatedAt', () => {
  const before = new Date('2026-07-22T06:00:00.123Z');

  it('uses server wall time when it is strictly newer', () => {
    expect(NextRoleUpdatedAt(before, new Date('2026-07-22T06:00:01.000Z')).toISOString()).toBe(
      '2026-07-22T06:00:01.000Z',
    );
  });

  it.each([
    ['same millisecond', new Date('2026-07-22T06:00:00.123Z')],
    ['clock behind', new Date('2026-07-22T05:59:59.999Z')],
  ])('advances exactly one millisecond when the %s cannot issue a successor', (_label, serverNow) => {
    expect(NextRoleUpdatedAt(before, serverNow).toISOString()).toBe('2026-07-22T06:00:00.124Z');
  });

  it('stays strictly increasing for repeated writes under one frozen clock', () => {
    const frozen = new Date('2026-07-22T06:00:00.123Z');
    const first = NextRoleUpdatedAt(before, frozen);
    const second = NextRoleUpdatedAt(first, frozen);
    expect(first.toISOString()).toBe('2026-07-22T06:00:00.124Z');
    expect(second.toISOString()).toBe('2026-07-22T06:00:00.125Z');
  });
});
