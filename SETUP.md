# BE-NestJS-AppSeed

NestJS + MySQL seed project with module-based Clean Architecture. It is designed to help developers build source code faster by providing a clean, scalable foundation with common infrastructure already wired in.

## Highlights

- Module-based Clean Architecture with clear layer boundaries
- JWT authentication and role-based authorization
- User CRUD example with TypeORM
- Global validation, error handling, logging, and consistent API responses
- Config and environment validation
- Rate limiting via Nest Throttler
- Optional Redis cache, BullMQ jobs, file uploads, and SMTP email
- Swagger/OpenAPI docs and API versioning

## Architecture

Each feature module follows Clean Architecture:

- Presentation: Controllers and request DTOs (HTTP boundary)
- Application: Use cases (orchestration and business flows)
- Domain: Entities, value objects, and interfaces (core business rules)
- Infrastructure: Persistence, external services, and adapters

Cross-cutting concerns live in `src/Common`, shared infrastructure is in `src/Shared`, and feature modules live in `src/Modules`.

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

- TypeORM is configured in `src/Shared/Database/Config/DatabaseConfig.ts`.
- `synchronize` is enabled only outside production for development convenience.
- Migrations use `src/Shared/Database/TypeOrmDataSource.ts`.
 - The seed script creates an Admin user using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

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

`dev:log` writes stdout/stderr to `logs/`.

For production, set `NODE_ENV=production` to disable Swagger and TypeORM auto-sync.

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

Versioning:

- Header `X-API-Version` (defaults to `1` when missing).

## API Docs (Swagger)

Swagger UI is available in non-production:

```text
http://localhost:3000/docs
```

## Endpoints (High Level)

Authentication:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (JWT)
- `GET /auth/admin` (JWT + Admin role)

Users:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

Files:

- `POST /files/upload` (multipart `file`, optional `Folder` query)

Jobs:

- `POST /jobs/example` (only when `REDIS_URL` is set)

Health:

- `GET /health`
- `GET /health/live`
- `GET /health/ready`

`/health/ready` performs checks for MySQL, memory usage, and Redis (if configured).

## Optional Services Behavior

- Redis: Cache uses Redis when `REDIS_URL` is set; Jobs are enabled only when `REDIS_URL` is set.
- Email: SMTP is used only when `SMTP_HOST` and `SMTP_FROM` are set; otherwise it is a no-op.
- File Uploads: Stored locally in `UPLOAD_DIR`, with size limited by `UPLOAD_MAX_FILE_SIZE`.

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

## Why This Works Well With AI Agents (Vibe Coding)

- Predictable module scaffolding makes it easy to generate and place code correctly.
- Strong boundaries keep changes localized to one module.
- Interfaces and providers make dependencies explicit and easy to wire.
- Consistent global plumbing reduces boilerplate and edge cases.

## Extending the Project

When adding a new feature:

- Create a new module under `src/Modules/<FeatureName>`.
- Keep `Presentation`, `Application`, `Domain`, and `Infrastructure` layers.
- Define interfaces in `Domain` and bind implementations in the module file.
- Register the module in `src/App.module.ts`.
