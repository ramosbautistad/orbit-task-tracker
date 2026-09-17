# Orbit

Orbit is a team task manager for managers and employees. The current branch adds the first Railway/PostgreSQL backend: durable organization data, teams, employees, tasks, secure server-side sessions, and role-based API permissions.

## How the pieces fit together

```text
Browser ──HTTPS──> Node/Express service ──DATABASE_URL──> Railway PostgreSQL
                  serves Orbit + API                       stores durable data
```

Only the Node service knows `DATABASE_URL`. Never put that value in browser JavaScript, commit it, or expose it through a public environment variable.

## Database model

- `organizations`: customer workspaces; every business record is scoped to one.
- `teams`: groups inside an organization.
- `users`: managers and employees, with salted scrypt password hashes.
- `tasks`: assignments with team, assignee, creator, status, priority, and due date.
- `sessions`: hashes of opaque login tokens; the raw token exists only in an HttpOnly cookie.
- `invitations`: foundation for email-based employee onboarding.
- `task_events`: an audit trail retained even after a task is deleted.
- `schema_migrations`: records which SQL migrations have run.

The schema uses composite foreign keys to prevent a task from pointing to an employee or team in another organization. Important task access patterns have indexes.

## Local setup

1. Copy `.env.example` to `.env` and use a local PostgreSQL connection string.
2. Export the variables into your shell or use your preferred environment loader.
3. Run the migration and create the first workspace manager:

```bash
npm run migrate
npm run seed:dev
```

4. Build and start Orbit:

```bash
npm run build
npm start
```

Open `http://localhost:4173`.

## Railway setup

Create or select two services in one Railway project:

1. A PostgreSQL service.
2. An application service connected to this repository.

On the application service, reference the Postgres service variables rather than copying a public database URL:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
DATABASE_SSL=false
RUN_MIGRATIONS=true
SESSION_TTL_DAYS=7
```

Set the bootstrap variables temporarily, run `npm run seed:dev` once, then remove the password variable:

```text
ORBIT_BOOTSTRAP_ORGANIZATION=Your Company
ORBIT_BOOTSTRAP_SLUG=your-company
ORBIT_BOOTSTRAP_MANAGER_NAME=Your Name
ORBIT_BOOTSTRAP_MANAGER_EMAIL=you@company.com
ORBIT_BOOTSTRAP_MANAGER_PASSWORD=a-long-one-time-password
```

Recommended Railway commands:

```text
Build: npm run build
Start: npm start
Health check: /api/health
```

For a production workflow, run `npm run migrate` as Railway's pre-deploy command and leave `RUN_MIGRATIONS=false` during normal application startup. It avoids every app replica attempting migrations during a scale-up.

## API surface

```text
POST   /api/auth/login
GET    /api/auth/me
DELETE /api/auth/session
GET    /api/bootstrap
GET    /api/tasks
POST   /api/tasks                 manager only
PATCH  /api/tasks/:taskId         employee status or manager changes
DELETE /api/tasks/:taskId         manager only
POST   /api/employees             manager only
GET    /api/health
```

All SQL values from requests use parameterized queries. Authorization is checked by the server and every query is scoped by `organization_id`; hiding a button in the frontend is not treated as security.

## Project structure

```text
db/migrations/                  Versioned PostgreSQL schema
server/
  db/                           Connection, migrations, and development seed
  lib/                          Passwords, sessions, validation, serializers
  middleware/                   Authentication and manager authorization
  repositories/                 Parameterized PostgreSQL queries
  routes/                       HTTP endpoints
  app.js                        Express application assembly
  index.js                      Process startup and graceful shutdown
src/                            Existing browser application
tests/                          Domain and server security tests
```

## Current integration boundary

The database and API are ready on this branch, while the existing browser interface still uses its local demo adapters. The next slice replaces those adapters with `/api` implementations and changes the demo account picker into an email/password login. Keeping that as a separate step makes the database migration easy to inspect and learn before the UI starts writing live data.
