# BE-NestJS-AppSeed Introduction

BE-NestJS-AppSeed is a NestJS seed project designed to help developers build source code faster. It provides a clean, modular foundation with common capabilities already wired in, allowing you to focus on feature development. It is also well-suited for vibe coding, as its modular and structured design enables AI agents to understand context efficiently and generate code with minimal cross-module dependencies

**Architecture**

- Module-based architecture combined with Clean Architecture: every feature lives in its own module and is split into `Presentation`, `Application`, `Domain`, and `Infrastructure`
- Cross-cutting concerns centralized in `Common` (errors, logging, security, responses, pagination)
- Shared infrastructure in `Shared` (configuration, environment validation, database setup)
- Dependency inversion via interfaces and module-level providers
- Consistent HTTP pipeline with global validation, error handling, logging, and response wrapping
- API versioning by header and optional Swagger docs in non-production

**Technologies**

- NestJS and TypeScript
- TypeORM with MySQL
- JWT authentication with Passport
- Redis cache (optional) with in-memory fallback
- Background jobs with BullMQ (optional)
- File uploads with Multer and local storage
- Email via Nodemailer (optional)
- Validation via `class-validator` and `class-transformer`
- Swagger/OpenAPI for API docs
- Jest for tests, ESLint and Prettier for linting/formatting

Use this seed as a foundation, extend the existing modules, and add new ones following the same structure to keep the codebase scalable and maintainable.

**Why This Works Well With AI Agents (Vibe Coding)**

- Clear, repeatable scaffolding: each module follows the same folder layout, so agents can generate new features predictably without guessing where code should live.
- Strong boundaries: domain logic is isolated from frameworks, which makes it easier for agents to reason locally and change one layer without breaking others.
- Explicit contracts: interfaces in the `Domain` layer and providers in module files make dependencies visible and easy for agents to wire correctly.
- Low coupling, high cohesion: changes are typically confined to a single module, reducing the risk of cross-module regressions in automated edits.
- Consistent plumbing: global validation, error handling, and response shapes mean agents can focus on business logic instead of re-implementing boilerplate.
- Better context retention: developers can work within one module without reading the rest of the codebase, keeping the working set small and focused.
