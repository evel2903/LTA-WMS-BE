import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'role_catalog_versions' })
@Check('CHK_role_catalog_versions_singleton', '"id" = 1')
@Check('CHK_role_catalog_versions_nonnegative', '"version" >= 0')
export class RoleCatalogVersionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'smallint' })
  public Id!: number;

  // PostgreSQL BIGINT intentionally hydrates as string; never coerce it through JS number.
  @Column({ name: 'version', type: 'bigint' })
  public Version!: string;
}
