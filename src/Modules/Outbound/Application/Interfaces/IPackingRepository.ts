import { EntityManager } from 'typeorm';
import { ListPackagesDto } from '@modules/Outbound/Application/DTOs/PackingDto';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';

export const PACKING_REPOSITORY = Symbol('IPackingRepository');

export interface PackageAggregate {
  Package: PackageEntity;
  Contents: PackageContentEntity[];
}

export interface IPackingRepository {
  CreateSession(session: PackSessionEntity, manager?: EntityManager): Promise<PackSessionEntity>;
  UpdateSession(session: PackSessionEntity, manager?: EntityManager): Promise<PackSessionEntity>;
  FindSessionById(id: string, manager?: EntityManager): Promise<PackSessionEntity | null>;
  FindSessionByIdForUpdate(id: string, manager: EntityManager): Promise<PackSessionEntity | null>;
  FindSessionByIdempotencyKey(key: string): Promise<PackSessionEntity | null>;

  CreatePackage(
    pack: PackageEntity,
    contents: PackageContentEntity[],
    manager?: EntityManager,
  ): Promise<PackageAggregate>;
  UpdatePackage(
    pack: PackageEntity,
    contents?: PackageContentEntity[],
    manager?: EntityManager,
  ): Promise<PackageAggregate>;
  FindPackageById(id: string, manager?: EntityManager): Promise<PackageAggregate | null>;
  FindPackageByIdForUpdate(id: string, manager: EntityManager): Promise<PackageAggregate | null>;
  FindPackageByIdempotencyKey(key: string): Promise<PackageAggregate | null>;
  ListPackages(
    skip: number,
    take: number,
    filter?: Omit<ListPackagesDto, 'Page' | 'PageSize'>,
  ): Promise<{ Items: PackageAggregate[]; TotalItems: number }>;
}
