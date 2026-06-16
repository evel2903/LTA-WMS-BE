# New Module Guide (Step-by-Step)

This guide explains how to create a new feature module using the module-based Clean Architecture pattern used in this project.

## 1) Choose a Feature Name

Pick a PascalCase feature name, for example `Orders`.

## 2) Create the Module Folder Structure

Create the module structure under `src/Modules/<FeatureName>`.

```text
src/Modules/Orders/
  Application/
    DTOs/
    UseCases/
    Mappers/
  Domain/
    Entities/
    Interfaces/
    ValueObjects/
  Infrastructure/
    Persistence/
      Entities/
      Repositories/
    Mappers/
    Services/
  Presentation/
    Controllers/
    Requests/
```

Create only the folders you actually need for the feature.

## 3) Define Domain Models

Add domain entities and value objects under `Domain`.

Example entity:

```ts
export class OrderEntity {
  public readonly Id: string;
  public Status: string;
  public readonly CreatedAt: Date;

  constructor(params: { Id: string; Status: string; CreatedAt: Date }) {
    this.Id = params.Id;
    this.Status = params.Status;
    this.CreatedAt = params.CreatedAt;
  }
}
```

## 4) Define Domain Interfaces

Define repository or service interfaces under `Domain/Interfaces`.

Example interface:

```ts
export const ORDER_REPOSITORY = Symbol('IOrderRepository');

export interface IOrderRepository {
  FindById(id: string): Promise<OrderEntity | null>;
  Create(order: OrderEntity): Promise<OrderEntity>;
}
```

## 5) Add Application DTOs and Use Cases

Add DTOs in `Application/DTOs` and use cases in `Application/UseCases`.

Example DTO:

```ts
export class CreateOrderDto {
  public Status!: string;
}
```

Example use case:

```ts
export class CreateOrderUseCase {
  constructor(private readonly repo: IOrderRepository) {}

  public async Execute(request: CreateOrderDto): Promise<OrderDto> {
    const order = new OrderEntity({
      Id: randomUUID(),
      Status: request.Status,
      CreatedAt: new Date(),
    });

    const created = await this.repo.Create(order);
    return OrderDtoMapper.ToDto(created);
  }
}
```

## 6) Implement Infrastructure Adapters

Add persistence entities, repositories, and mappers in `Infrastructure`.

Example ORM entity:

```ts
@Entity({ name: 'orders' })
export class OrderOrmEntity {
  @PrimaryColumn({ type: 'char', length: 36 })
  public Id!: string;

  @Column({ type: 'varchar', length: 50 })
  public Status!: string;

  @CreateDateColumn({ type: 'datetime' })
  public CreatedAt!: Date;
}
```

Example repository:

```ts
@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(@InjectRepository(OrderOrmEntity) private readonly orders: Repository<OrderOrmEntity>) {}

  public async FindById(id: string): Promise<OrderEntity | null> {
    const entity = await this.orders.findOne({ where: { Id: id } });
    return entity ? OrderOrmMapper.ToDomain(entity) : null;
  }

  public async Create(order: OrderEntity): Promise<OrderEntity> {
    const created = await this.orders.save(OrderOrmMapper.ToOrm(order));
    return OrderOrmMapper.ToDomain(created);
  }
}
```

## 7) Add Presentation Layer

Create request DTOs and controllers in `Presentation`.

Example request:

```ts
export class CreateOrderRequest {
  @IsNotEmpty()
  @IsString()
  public Status!: string;
}
```

Example controller:

```ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {}

  @Post()
  public async Create(@Body() request: CreateOrderRequest) {
    return await this.createOrderUseCase.Execute(request);
  }
}
```

## 8) Wire the Module

Create `OrdersModule.ts` and bind interfaces to implementations.

```ts
@Module({
  imports: [TypeOrmModule.forFeature([OrderOrmEntity])],
  controllers: [OrdersController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: OrderRepository },
    {
      provide: CreateOrderUseCase,
      useFactory: (repo: IOrderRepository) => new CreateOrderUseCase(repo),
      inject: [ORDER_REPOSITORY],
    },
  ],
})
export class OrdersModule {}
```

## 9) Register the Module in the App

Add the module to `src/App.module.ts`.

```ts
import { OrdersModule } from './Modules/Orders/OrdersModule';

@Module({
  imports: [
    OrdersModule,
  ],
})
export class AppModule {}
```

## 10) Add Migrations and Update DataSource (If Needed)

If you add new ORM entities:

- Ensure the entity is auto-loaded by TypeORM (it is when the module uses `TypeOrmModule.forFeature`).
- For CLI migrations, add the entity to `src/Shared/Database/TypeOrmDataSource.ts`.

Run migration commands:

```bash
npm run migration:generate
npm run migration:run
```

## 11) Add Tests

Add tests under `test/` or alongside modules, following existing patterns.

## 12) Verify Endpoints

Start the app and verify the endpoints via Swagger or an API client.

```bash
npm run dev
```

Swagger:

```text
http://localhost:3000/docs
```
