import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ListPackagesDto } from '@modules/Outbound/Application/DTOs/PackingDto';
import { IPackingRepository, PackageAggregate } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackingOrmMapper } from '@modules/Outbound/Infrastructure/Mappers/PackingOrmMapper';
import { PackageContentOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageContentOrmEntity';
import { PackageOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageOrmEntity';
import { PackSessionOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackSessionOrmEntity';

@Injectable()
export class PackingRepository implements IPackingRepository {
  constructor(
    @InjectRepository(PackSessionOrmEntity)
    private readonly sessions: Repository<PackSessionOrmEntity>,
    @InjectRepository(PackageOrmEntity)
    private readonly packages: Repository<PackageOrmEntity>,
    @InjectRepository(PackageContentOrmEntity)
    private readonly contents: Repository<PackageContentOrmEntity>,
  ) {}

  public async CreateSession(session: PackSessionEntity, manager?: EntityManager): Promise<PackSessionEntity> {
    const repo = this.SessionRepo(manager);
    const saved = await repo.save(PackingOrmMapper.ToSessionOrm(session));
    return PackingOrmMapper.ToSessionDomain(saved);
  }

  public async UpdateSession(session: PackSessionEntity, manager?: EntityManager): Promise<PackSessionEntity> {
    const repo = this.SessionRepo(manager);
    const saved = await repo.save(PackingOrmMapper.ToSessionOrm(session));
    return PackingOrmMapper.ToSessionDomain(saved);
  }

  public async FindSessionById(id: string, manager?: EntityManager): Promise<PackSessionEntity | null> {
    const entity = await this.SessionRepo(manager).findOne({ where: { Id: id } });
    return entity ? PackingOrmMapper.ToSessionDomain(entity) : null;
  }

  public async FindSessionByIdForUpdate(id: string, manager: EntityManager): Promise<PackSessionEntity | null> {
    const entity = await manager.getRepository(PackSessionOrmEntity).findOne({
      where: { Id: id },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? PackingOrmMapper.ToSessionDomain(entity) : null;
  }

  public async FindSessionByIdempotencyKey(key: string): Promise<PackSessionEntity | null> {
    const entity = await this.sessions.findOne({ where: { IdempotencyKey: key } });
    return entity ? PackingOrmMapper.ToSessionDomain(entity) : null;
  }

  public async CreatePackage(
    pack: PackageEntity,
    contents: PackageContentEntity[],
    manager?: EntityManager,
  ): Promise<PackageAggregate> {
    const packageRepo = this.PackageRepo(manager);
    const contentRepo = this.ContentRepo(manager);
    const savedPackage = await packageRepo.save(PackingOrmMapper.ToPackageOrm(pack));
    const savedContents = await contentRepo.save(contents.map(PackingOrmMapper.ToContentOrm));
    return {
      Package: PackingOrmMapper.ToPackageDomain(savedPackage),
      Contents: savedContents.map(PackingOrmMapper.ToContentDomain),
    };
  }

  public async UpdatePackage(
    pack: PackageEntity,
    contents?: PackageContentEntity[],
    manager?: EntityManager,
  ): Promise<PackageAggregate> {
    const packageRepo = this.PackageRepo(manager);
    const contentRepo = this.ContentRepo(manager);
    const savedPackage = await packageRepo.save(PackingOrmMapper.ToPackageOrm(pack));
    if (contents) {
      await contentRepo.delete({ PackageId: pack.Id });
      await contentRepo.save(contents.map(PackingOrmMapper.ToContentOrm));
    }
    const savedContents = await contentRepo.find({ where: { PackageId: pack.Id }, order: { CreatedAt: 'ASC' } });
    return {
      Package: PackingOrmMapper.ToPackageDomain(savedPackage),
      Contents: savedContents.map(PackingOrmMapper.ToContentDomain),
    };
  }

  public async FindPackageById(id: string, manager?: EntityManager): Promise<PackageAggregate | null> {
    const entity = await this.PackageRepo(manager).findOne({ where: { Id: id } });
    return entity ? this.BuildPackageAggregate(entity, manager) : null;
  }

  public async FindPackageByIdForUpdate(id: string, manager: EntityManager): Promise<PackageAggregate | null> {
    const entity = await manager.getRepository(PackageOrmEntity).findOne({
      where: { Id: id },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? this.BuildPackageAggregate(entity, manager) : null;
  }

  public async FindPackageByIdempotencyKey(key: string): Promise<PackageAggregate | null> {
    const entity = await this.packages.findOne({ where: { IdempotencyKey: key } });
    return entity ? this.BuildPackageAggregate(entity) : null;
  }

  public async ListPackages(
    skip: number,
    take: number,
    filter: Omit<ListPackagesDto, 'Page' | 'PageSize'> = {},
  ): Promise<{ Items: PackageAggregate[]; TotalItems: number }> {
    const where: FindOptionsWhere<PackageOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.Status) where.Status = filter.Status;
    if (filter.PickTaskId) where.PickTaskId = filter.PickTaskId;
    if (filter.OutboundOrderId) where.OutboundOrderId = filter.OutboundOrderId;

    const [packages, total] = await this.packages.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    const items = await Promise.all(packages.map((item) => this.BuildPackageAggregate(item)));
    return { Items: items, TotalItems: total };
  }

  private async BuildPackageAggregate(entity: PackageOrmEntity, manager?: EntityManager): Promise<PackageAggregate> {
    const contents = await this.ContentRepo(manager).find({
      where: { PackageId: entity.Id },
      order: { CreatedAt: 'ASC' },
    });
    return {
      Package: PackingOrmMapper.ToPackageDomain(entity),
      Contents: contents.map(PackingOrmMapper.ToContentDomain),
    };
  }

  private SessionRepo(manager?: EntityManager): Repository<PackSessionOrmEntity> {
    return manager ? manager.getRepository(PackSessionOrmEntity) : this.sessions;
  }

  private PackageRepo(manager?: EntityManager): Repository<PackageOrmEntity> {
    return manager ? manager.getRepository(PackageOrmEntity) : this.packages;
  }

  private ContentRepo(manager?: EntityManager): Repository<PackageContentOrmEntity> {
    return manager ? manager.getRepository(PackageContentOrmEntity) : this.contents;
  }
}
