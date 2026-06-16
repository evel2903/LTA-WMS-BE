import { SnakeNamingStrategy } from '@shared/Database/SnakeNamingStrategy';

describe('SnakeNamingStrategy', () => {
  const strategy = new SnakeNamingStrategy();

  describe('columnName', () => {
    it('converts the UserOrmEntity properties to snake_case columns', () => {
      const map = (property: string) => strategy.columnName(property, '', []);
      expect(map('Id')).toBe('id');
      expect(map('FirstName')).toBe('first_name');
      expect(map('LastName')).toBe('last_name');
      expect(map('EmailAddress')).toBe('email_address');
      expect(map('PasswordHash')).toBe('password_hash');
      expect(map('Role')).toBe('role');
      expect(map('CreatedAt')).toBe('created_at');
    });

    it('prefers an explicit custom name over the property name', () => {
      expect(strategy.columnName('FirstName', 'first_name', [])).toBe('first_name');
    });

    it('snake_cases an explicit custom name that is not yet snake_case', () => {
      expect(strategy.columnName('whatever', 'EmailAddress', [])).toBe('email_address');
    });

    it('handles consecutive capitals and digits', () => {
      expect(strategy.columnName('UserID', '', [])).toBe('user_id');
      expect(strategy.columnName('Line1Address', '', [])).toBe('line1_address');
    });

    it('joins embedded prefixes with the column', () => {
      expect(strategy.columnName('Street', '', ['Address'])).toBe('address_street');
    });
  });

  describe('tableName', () => {
    it('uses the user-specified name verbatim when provided', () => {
      expect(strategy.tableName('UserOrmEntity', 'users')).toBe('users');
    });

    it('snake_cases the class name when no name is specified', () => {
      expect(strategy.tableName('OrderItemOrmEntity', undefined)).toBe('order_item_orm_entity');
    });
  });

  describe('relations and joins', () => {
    it('snake_cases relation names', () => {
      expect(strategy.relationName('CreatedByUser')).toBe('created_by_user');
    });

    it('builds snake_case join column names', () => {
      expect(strategy.joinColumnName('Profile', 'Id')).toBe('profile_id');
    });

    it('builds snake_case join table column names', () => {
      expect(strategy.joinTableColumnName('users', 'Id')).toBe('users_id');
      expect(strategy.joinTableColumnName('users', 'ignored', 'RoleId')).toBe('users_role_id');
    });
  });
});
