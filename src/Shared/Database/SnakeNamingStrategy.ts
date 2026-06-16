import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Maps PascalCase/camelCase entity identifiers to snake_case database identifiers.
 * Keeps any name explicitly provided by the user (e.g. @Entity({ name: 'users' })).
 *
 * Examples: Id -> id, FirstName -> first_name, EmailAddress -> email_address,
 * PasswordHash -> password_hash, CreatedAt -> created_at.
 */
const ToSnakeCase = (value: string): string =>
  value
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  public tableName(targetName: string, userSpecifiedName?: string): string {
    return userSpecifiedName ? userSpecifiedName : ToSnakeCase(targetName);
  }

  public columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return ToSnakeCase(embeddedPrefixes.concat(customName || propertyName).join('_'));
  }

  public relationName(propertyName: string): string {
    return ToSnakeCase(propertyName);
  }

  public joinColumnName(relationName: string, referencedColumnName: string): string {
    return ToSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  public joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
    return ToSnakeCase(`${firstTableName}_${firstPropertyName.replace(/\./g, '_')}_${secondTableName}`);
  }

  public joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return ToSnakeCase(`${tableName}_${columnName || propertyName}`);
  }

  public classTableInheritanceParentColumnName(parentTableName: string, parentTableIdPropertyName: string): string {
    return ToSnakeCase(`${parentTableName}_${parentTableIdPropertyName}`);
  }
}
