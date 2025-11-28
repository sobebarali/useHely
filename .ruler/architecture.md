# Project Rules

## Project Structure

This is a monorepo with the following structure:

- **`apps/web/`** - Frontend application (React with TanStack Router)

- **`apps/server/`** - Backend server
(Express)

- **`packages/auth/`** - Authentication logic and utilities
- **`packages/db/`** - Database schema and utilities


## Available Scripts

- `npm run dev` - Start all apps in development mode
- `npm run dev:web` - Start only the web app
- `npm run dev:server` - Start only the server

## Database Commands

All database operations should be run from the server workspace:

- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open database studio
- `npm run db:generate` - Generate mongoose files
- `npm run db:migrate` - Run database migrations

Database models are located in `apps/server/src/db/models/`


## Authentication

Authentication is enabled in this project:
- Server auth logic is in `apps/server/src/lib/auth.ts`
- Web app auth client is in `apps/web/src/lib/auth-client.ts`


## Key Points

- This is a Turborepo monorepo using npm workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `npm run command-name`
- Turborepo handles build caching and parallel execution
