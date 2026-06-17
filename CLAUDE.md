# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this before making changes.

## What this is

NestJS 11 backend seed built on **Clean Architecture + Ports & Adapters**, PostgreSQL via TypeORM 1.0, Redis/BullMQ optional. Package manager is **yarn (classic 1.22)** — never use `npm` here. TypeScript 6, ESLint 10, Jest 30.

## Commands (always `yarn`, never `npm`)

```bash
yarn dev              # nest start --watch (resolves aliases automatically)
yarn build            # nest build && tsc-alias  (REQUIRED two-step — see Gotchas)
yarn test             # jest (all *Spec.ts under test/)
yarn lint             # eslint; yarn lint:fix to autofix
yarn migration:generate   # diff entities vs DB -> new migration file
yarn migration:run        # apply pending migrations
yarn seed:run             # create the admin user
yarn db:prepare           # migration:run + seed:run
```

Run a single test: `yarn jest test/Modules/Authentication/Auth.LoginUseCaseSpec.ts`.

Local infra: `docker compose up -d postgres` (Postgres 17, db `backend_seed`, user/pass `root`/`root`, port 5432). A local `.env` is gitignored — copy `.env.example`. Postgres-backed flows need a real DB; most unit/E2E specs mock their dependencies and need no DB.

## Architecture — the rules that matter

Every feature lives under `src/Modules/<Name>/` split into four layers. The **dependency rule** is enforced and must hold: imports point inward only.

- **Domain/** — pure business model only (entities, value objects). No `@nestjs`, no `typeorm`, no `class-validator`. Currently only `Users` has real domain (`UserEntity`, `EmailAddress`); other modules have no Domain folder, and that's correct.
- **Application/** — use cases (framework-agnostic plain classes, **no `@Injectable`**), DTOs, mappers, and **all port interfaces** under `Application/Interfaces/`. Ports live here (not Domain) because they are contracts the use cases need, not domain invariants.
- **Infrastructure/** — adapters that `implements` the ports (TypeORM repos, JWT, bcrypt, SMTP, Redis, BullMQ), ORM entities, ORM↔domain mappers.
- **Presentation/** — controllers, request DTOs (`class-validator` lives ONLY here), guards, cookies.

### Ports & DI pattern (follow exactly when adding a dependency)

1. Define the interface + a `Symbol` token in `Application/Interfaces/IXxx.ts`:
   ```ts
   export const XXX = Symbol('IXxx');
   export interface IXxx { ... }
   ```
2. Implement it in `Infrastructure/` with `@Injectable()`.
3. Bind + wire in the module's `providers` via the composition root. Use cases are wired with `useFactory` (NOT `@Inject`), keeping Application free of framework decorators:
   ```ts
   { provide: XXX, useClass: XxxAdapter },
   { provide: SomeUseCase,
     useFactory: (dep: IXxx) => new SomeUseCase(dep),
     inject: [XXX] },
   ```
Multiple adapters per port (chosen at runtime via `useFactory`) is the established pattern — see `CacheModule` (Redis vs InMemory) and `JobsModule` (BullMQ vs Noop).

### Use case shape (copy this skeleton for new features)

A use case is a plain class with a single public `Execute`. It takes an Application DTO (or primitive), depends only on ports via the constructor, throws typed `AppException`s, and returns a DTO — never an ORM/domain entity:

```ts
// src/Modules/<Mod>/Application/UseCases/DoThingUseCase.ts
import { NotFoundException } from '@common/Exceptions/AppException';
import { IThingRepository } from '@modules/<Mod>/Application/Interfaces/IThingRepository';
import { ThingDto } from '@modules/<Mod>/Application/DTOs/ThingDto';
import { ThingDtoMapper } from '@modules/<Mod>/Application/Mappers/ThingDtoMapper';

export class DoThingUseCase {
  constructor(private readonly thingRepository: IThingRepository) {}

  public async Execute(id: string): Promise<ThingDto> {
    const thing = await this.thingRepository.FindById(id);
    if (!thing) throw new NotFoundException('Thing not found');
    return ThingDtoMapper.ToDto(thing);
  }
}
```

End-to-end for a new endpoint: Presentation `Request` (class-validator) → controller calls `useCase.Execute(request)` → use case orchestrates ports → maps domain → returns `Dto`. Wire the use case and its ports in the module's `providers` as shown above.

## Conventions (match these — they are deliberate)

- **Naming**: PascalCase for class members, methods, DTO/JSON fields, exported functions, and file names (C#/.NET style). camelCase only for local variables and parameters. SCREAMING_SNAKE for env vars, DI tokens, and `ErrorCode` values.
- **Imports**: relative imports are **banned by ESLint**. Always use path aliases: `@modules/*`, `@common/*`, `@shared/*`, `@core/*`, `@app/*`.
- **Database identifiers are snake_case**, enforced by `SnakeNamingStrategy` (`src/Shared/Database/SnakeNamingStrategy.ts`) — entity properties stay PascalCase, columns become snake_case automatically. New ORM entities should also declare explicit `name: 'snake_case'` on `@Entity`/`@Column` for clarity (the strategy still applies as the default).
- **Errors**: throw the typed exceptions from `@common/Exceptions/AppException` (`UnauthorizedAppException`, `ConflictException`, …). They are mapped to HTTP status + `ErrorCode` by the global `GlobalExceptionFilter`. They extend `Error`, not `HttpException`, so any test booting a bare app must register the filter to get correct status codes.
- **Responses** are wrapped by `ResponseInterceptor` as `{ Success, Data }` / `{ Success, Errors }`. API versioning is header-based (`X-API-Version`, defaults to `1`).
- **Tests**: files are `*Spec.ts` under `test/` mirroring `src/`. Prefer plain `Fake*` classes implementing the port over deep mocks. Use the `@modules`/`@common`/`@shared` aliases in tests too (jest `moduleNameMapper` resolves them).

## Authentication (HttpOnly cookie + DB refresh tokens)

- Access and refresh are **separate JWTs** (different secrets/expiries), both delivered/read as **HttpOnly cookies** (`access_token`, `refresh_token`) via `cookie-parser` + `AuthCookieService`. Login/register return only `{ User }` — never tokens in the body. `JwtStrategy` reads the access token from the cookie.
- Refresh tokens are persisted in `refresh_tokens` as a **SHA-256 hash only** (`Sha256Hex`, never plaintext). `RefreshTokenUseCase` does **rotation** (revoke presented, issue new) and **reuse detection** (replay of a revoked token → revoke ALL the user's tokens). `/auth/logout` revokes the current token; `/auth/logout-all` revokes all.
- Known tradeoff: access tokens are stateless, so a still-valid access token keeps working until expiry even after logout/refresh. Keep `JWT_EXPIRATION` short (default `15m`).
- Config: `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION` (see `.env.example`).

## Gotchas (learned the hard way)

- **`yarn build` may emit a partial `dist/` from a stale incremental build** — symptom: `Cannot find module dist/Main.js` or missing routes at runtime. Fix: `rm -rf dist *.tsbuildinfo` then `yarn build`. The two-step `nest build && tsc-alias` is mandatory: `tsc` does NOT rewrite path aliases in output, so `tsc-alias` rewrites `@modules/...` → relative `require()` for `node dist`.
- **Alias resolution is wired per tool**: build → `tsc-alias`; tests → jest `moduleNameMapper`; ts-node (migrations/seed) → `tsconfig-paths` via the `ts-node.require` hook in `tsconfig.json`; `nest start` resolves them itself. If you add a new alias, update `tsconfig.json` `paths`, jest `moduleNameMapper`, AND keep values relative (`./src/...`) since `baseUrl` is intentionally unset (TS6 deprecation).
- **Schema changes need a migration**: edit the entity → `yarn migration:generate` → review → `yarn migration:run`. The DataSource for the CLI is `src/Shared/Database/TypeOrmDataSource.ts`; **new ORM entities must be added to its `entities` array** (the running app uses `autoLoadEntities`, but the migration CLI does not).
- When restarting the app during verification on Windows, kill stale listeners on port 3000 first or you may hit an old build.

## Git / commits

**Never commit or push automatically.** Only run `git commit`/`git push` when the user explicitly asks in that message — finishing or verifying a task is NOT permission to commit. Make and verify the change, report it, and let the user decide when to commit.

## Before you finish

Run `yarn build && yarn lint && yarn test` — all must be green. For DB-affecting changes also run `yarn migration:run && yarn seed:run` against a live Postgres and verify the schema/behavior with `psql`.
