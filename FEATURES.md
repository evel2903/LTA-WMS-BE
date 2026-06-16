# Current Features

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
