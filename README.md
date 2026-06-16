# BE-NestJS-AppSeed

A NestJS + MySQL seed project that provides a clean, module-based Clean Architecture foundation so teams can build faster. It comes with common infrastructure already wired in and a predictable module structure that is friendly for both human developers and AI agents.

## Architecture

Each feature module follows Clean Architecture with clear boundaries:

- Presentation: Controllers and request DTOs (HTTP boundary)
- Application: Use cases that coordinate business flows
- Domain: Entities, value objects, and interfaces (core rules)
- Infrastructure: Persistence, external services, and adapters

Cross-cutting concerns live in `src/Common`, shared infrastructure in `src/Shared`, and feature modules in `src/Modules`.

Project layout:

```text
src/
  Common/                # Errors, logging, security, responses, helpers
  Core/                  # Core shared types (e.g., Result)
  Shared/                # Config, env validation, DB setup
  Modules/               # Feature modules
    Authentication/
    Users/
    FileUpload/
    Cache/
    Email/
    Health/
    Jobs/
  App.module.ts          # Root module wiring
  Main.ts                # App bootstrap and global pipeline
```

## Why This Works Well With AI Agents (Vibe Coding)

- Clear, repeatable module scaffolding lets agents place code without guessing.
- Strong boundaries keep changes localized to one module.
- Interfaces and providers make dependencies explicit and easy to wire.
- Consistent global plumbing reduces boilerplate and edge cases.
- Better context retention: developers can work within a single module without reading the entire codebase.

## Features

- Module-based Clean Architecture (Presentation, Application, Domain, Infrastructure)
- Global validation pipeline (class-validator + class-transformer)
- Consistent API response envelope and error handling
- Centralized logging with request logging interceptor
- API versioning via `X-API-Version` header (default v1)
- Swagger/OpenAPI docs in non-production
- Rate limiting with Nest Throttler
- MySQL integration via TypeORM
- Database migrations and seed scripts (admin user seed)
- Authentication with JWT (Passport) and role-based authorization
- Users module with CRUD example
- File upload module (Multer + local storage)
- Cache module (Redis with in-memory fallback)
- Jobs module (BullMQ with Redis; no-op when Redis is not configured)
- Email module (SMTP via Nodemailer; no-op when SMTP not configured)
- Health checks (`/health`, `/health/live`, `/health/ready`)
- Docker Compose setup for API, MySQL, and Redis
- Linting, formatting, and testing setup (ESLint, Prettier, Jest)

## Technology Stack

- NestJS, TypeScript
- MySQL + TypeORM
- JWT auth with Passport
- Redis (optional) via ioredis
- BullMQ for background jobs (optional)
- Multer for file uploads
- Nodemailer for email (optional)
- class-validator and class-transformer
- Swagger/OpenAPI
- Jest, ESLint, Prettier

## Requirements

- Node.js 18+
- MySQL 8+
- Optional: Redis 7+, Docker

## Quick Start (Local)

1. Install dependencies

```bash
npm install
```

2. Create `.env`

```bash
cp .env.example .env
```

Update `DB_*` and `JWT_*` values to match your local setup. If you are using the provided Docker MySQL service, use `DB_USERNAME=root`, `DB_PASSWORD=root`, and `DB_DATABASE=backend_seed`.

3. Start MySQL (and Redis if needed)

```bash
docker compose up -d mysql redis
```

4. Run migrations + seed

```bash
npm run db:prepare
```

5. Start the app

```bash
npm run dev
```

## Docker Compose

Run all services (API + MySQL + Redis):

```bash
docker compose up --build
```

This uses the `api` service in `docker-compose.yml` with environment variables defined in that file.

## Database, Migrations, and Seed

TypeORM is configured in `src/Shared/Database/Config/DatabaseConfig.ts`. Auto-sync is enabled only outside production for development convenience. Migrations use `src/Shared/Database/TypeOrmDataSource.ts`. The seed script creates an Admin user using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

Commands:

```bash
npm run migration:generate
npm run migration:run
npm run migration:revert
npm run seed:run
npm run db:prepare
```

`db:prepare` runs migrations and seed in one step.

## Running

```bash
npm run dev
npm run dev:log
npm run build
npm start
```

`dev:log` writes stdout/stderr to `logs/`. For production, set `NODE_ENV=production` to disable Swagger and TypeORM auto-sync.

## API Conventions

Response shape:

```json
{
  "Success": true,
  "Data": {
    "...": "..."
  }
}
```

Error shape:

```json
{
  "Success": false,
  "Errors": [
    {
      "Code": "VALIDATION",
      "Message": "...",
      "Details": "..."
    }
  ]
}
```

Versioning uses header `X-API-Version` with a default of `1` when missing.

## API Docs (Swagger)

Swagger UI is available in non-production:

```text
http://localhost:3000/docs
```

## Endpoints (High Level)

**Authentication**

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (JWT)
- `GET /auth/admin` (JWT + Admin role)

**Users**

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

**Files**

- `POST /files/upload` (multipart `file`, optional `Folder` query)

**Jobs**

- `POST /jobs/example` (only when `REDIS_URL` is set)

**Health**

- `GET /health`
- `GET /health/live`
- `GET /health/ready`

`/health/ready` performs checks for MySQL, memory usage, and Redis (if configured).

## Optional Services Behavior

- Redis: Cache uses Redis when `REDIS_URL` is set; Jobs are enabled only when `REDIS_URL` is set.
- Email: SMTP is used only when `SMTP_HOST` and `SMTP_FROM` are set; otherwise it is a no-op.
- File uploads: Stored locally in `UPLOAD_DIR`, with size limited by `UPLOAD_MAX_FILE_SIZE`.

## Tests and Quality

```bash
npm test
npm run lint
npm run format
```

## Conventions

- PascalCase for classes, methods, and DTO properties.
- Interfaces are prefixed with `I` (e.g., `IUserRepository`).
- Each module keeps its own `Presentation`, `Application`, `Domain`, and `Infrastructure` folders.

## New Module Guide (Step-by-Step)

1. Choose a PascalCase feature name, for example `Orders`.
2. Create the module structure under `src/Modules/<FeatureName>`.

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

3. Define domain entities and value objects under `Domain`.

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

4. Define domain interfaces under `Domain/Interfaces`.

```ts
export const ORDER_REPOSITORY = Symbol('IOrderRepository');

export interface IOrderRepository {
  FindById(id: string): Promise<OrderEntity | null>;
  Create(order: OrderEntity): Promise<OrderEntity>;
}
```

5. Add DTOs in `Application/DTOs` and use cases in `Application/UseCases`.

```ts
export class CreateOrderDto {
  public Status!: string;
}
```

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

6. Implement infrastructure adapters in `Infrastructure`.

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

7. Add request DTOs and controllers in `Presentation`.

```ts
export class CreateOrderRequest {
  @IsNotEmpty()
  @IsString()
  public Status!: string;
}
```

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

8. Wire the module and bind interfaces to implementations.

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

9. Register the module in `src/App.module.ts`.

```ts
import { OrdersModule } from './Modules/Orders/OrdersModule';

@Module({
  imports: [
    OrdersModule,
  ],
})
export class AppModule {}
```

10. If you add new ORM entities, ensure they are included in `src/Shared/Database/TypeOrmDataSource.ts` for CLI migrations. Then run migrations.

```bash
npm run migration:generate
npm run migration:run
```

11. Add tests under `test/` or alongside modules, following existing patterns.
12. Start the app and verify endpoints via Swagger or an API client.

```bash
npm run dev
```

```text
http://localhost:3000/docs
```
