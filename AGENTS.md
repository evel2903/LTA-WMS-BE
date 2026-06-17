# AGENTS.md

Execution rules for agents modifying this repository. These are mandatory, not advisory. If a rule blocks the task, stop and report — do not work around it.

## Version control

- **Never run `git commit`, `git push`, `git reset`, or any history-changing git command unless the user explicitly asks in that message.** Finishing a task does not imply permission to commit. Make the changes, report what changed, and stop — let the user decide when to commit.

## Environment

- Use **yarn** for every command. Never run `npm`.
- Never create or commit `package-lock.json`. The lockfile is `yarn.lock`.
- Do not edit `.env` (gitignored). Add new config keys to `.env.example`, `Env.ts`, `AppConfig.ts`, and `docker-compose.yml` together.

## Architecture constraints (reject changes that violate these)

- Code lives in `src/Modules/<Name>/` with four layers; imports point inward only:
  - `Domain/` — pure TS model. MUST NOT import `@nestjs`, `typeorm`, `class-validator`, or anything from outer layers.
  - `Application/` — use cases (plain classes, **no `@Injectable`**), DTOs, mappers, and ALL port interfaces (`Application/Interfaces/IXxx.ts`).
  - `Infrastructure/` — adapters that `implements` a port; ORM entities; ORM↔domain mappers.
  - `Presentation/` — controllers, request DTOs (`class-validator` allowed ONLY here), guards, cookies.
- Adding an external dependency (DB, queue, cache, crypto, mail, HTTP): define a port interface + `Symbol` token in `Application/Interfaces/`, implement in `Infrastructure/`, bind in the module. Never call infrastructure directly from a use case.
- Wire use cases with `useFactory` + `inject: [TOKEN]`. Do NOT add `@Injectable` or `@Inject` to use cases.
- Controllers call use cases only — never repositories, `DataSource`, or infrastructure directly.

## Coding standards

- Imports: relative paths are forbidden (ESLint-enforced). Use `@modules/*`, `@common/*`, `@shared/*`, `@core/*`, `@app/*`. New alias ⇒ update `tsconfig.json` `paths` (relative `./src/...`, no `baseUrl`) AND jest `moduleNameMapper`.
- Naming: PascalCase for members, methods, DTO/JSON fields, exported functions, filenames. camelCase only for locals/params. SCREAMING_SNAKE for env vars, DI tokens, `ErrorCode` values.
- Errors: throw typed exceptions from `@common/Exceptions/AppException`. Never throw raw `Error` or return ad-hoc error shapes.
- DB identifiers stay snake_case. Keep entity properties PascalCase; add explicit `name: 'snake_case'` on `@Entity`/`@Column`. Do not disable `SnakeNamingStrategy`.
- Do not put tokens in response bodies; auth tokens are HttpOnly cookies only. Persist secrets/refresh tokens hashed (`Sha256Hex`), never plaintext.

## Implementation workflow

1. Locate the owning module/layer; place each new file in the correct layer.
2. Define ports before adapters; implement adapters; wire in the module.

### Use case — mandatory shape

Every new feature operation is a use case in `Application/UseCases/`. It MUST: be a plain class (no decorators), expose exactly one public `Execute`, receive an Application DTO or primitive, depend only on ports via the constructor, throw typed `AppException`s for failures, and return a DTO (never an ORM/domain entity).

```ts
export class DoThingUseCase {
  constructor(private readonly thingRepository: IThingRepository) {}

  public async Execute(input: DoThingDto): Promise<ThingDto> {
    const thing = await this.thingRepository.FindById(input.Id);
    if (!thing) throw new NotFoundException('Thing not found');
    return ThingDtoMapper.ToDto(thing);
  }
}
```

Then: add a Presentation `Request` (class-validator) + controller method that calls `useCase.Execute(request)`, and register the use case in the module via `useFactory` + `inject: [TOKEN]`. Do NOT inject repositories/infrastructure into controllers.
3. For any entity/schema change: edit the entity → add it to the `entities` array in `src/Shared/Database/TypeOrmDataSource.ts` → `yarn migration:generate` → review the generated SQL → `yarn migration:run`. Never hand-edit applied migrations; never use `synchronize` to alter schema.
4. Add/adjust config in all four places listed under Environment.
5. Keep changes minimal and consistent with surrounding code; do not reformat unrelated files.

## Testing requirements

- Add or update `*Spec.ts` under `test/` mirroring `src/` for every behavior change.
- Prefer `Fake*` classes implementing the port over deep mocks. Use path aliases in tests.
- Any test booting a bare Nest app that exercises thrown exceptions MUST register `GlobalExceptionFilter` (exceptions extend `Error`, not `HttpException`).
- Cover the failure paths, not just the happy path (auth/refresh/revocation logic especially).

## Completion criteria (all required before reporting done)

1. `yarn build` succeeds. If it reports a missing `dist` module or stale output, run `rm -rf dist *.tsbuildinfo` then rebuild. `build` MUST remain the two-step `nest build && tsc-alias`.
2. `yarn lint` passes with zero errors (run `yarn lint:fix` first).
3. `yarn test` passes — all suites green.
4. For DB-affecting changes: `yarn migration:run && yarn seed:run` against a live Postgres, and verify resulting schema/behavior (e.g. via `psql`).
5. Report honestly: state what was changed, what was verified, and any skipped or failing step with its output. Do not claim success without running the above.
