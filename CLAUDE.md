# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Generate TypeScript types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## Architecture Overview

This is a Next.js 15 academy management system built with:
- **App Router** for routing
- **Supabase** for backend (PostgreSQL + Auth + Realtime)
- **shadcn/ui** components with Radix UI primitives
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **SWR** for data fetching

### Key Architectural Patterns

1. **Authentication Flow**
   - Middleware (`middleware.ts`) protects routes
   - New users require admin approval via `profiles.is_approved`
   - Auth routes under `app/(auth)`

2. **Data Access**
   - Supabase clients in `lib/supabase/` (browser, server, admin)
   - Services in `services/` for business logic
   - Custom hooks in `hooks/` for data fetching with SWR

3. **Component Structure**
   - UI primitives in `components/ui/` (shadcn/ui)
   - Layout components in `components/layout/`
   - Feature-specific components in respective directories

4. **Type Safety**
   - Database types in `types/supabase.ts` (auto-generated)
   - Custom types in `types/` directory
   - Strict TypeScript configuration

## Important Context

### Current Development Focus
- Migrating from n8n chat-based calendar to FullCalendar
- Preparing for SaaS multi-tenancy transformation
- Database schema simplification in progress

### Database Schema Key Tables
- `profiles` - User profiles with approval system
- `students` - Student management
- `employees` - Employee management with auth linking
- `classes` - Class/course information
- `class_students` - Many-to-many relationship
- Chat system tables (agents, chats, messages) - scheduled for refactoring

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Path Aliases
- `@/*` maps to root directory (configured in tsconfig.json)

## Development Guidelines

1. **Component Creation**
   - Check existing components in `components/` first
   - Follow shadcn/ui patterns for consistency
   - Use existing UI primitives from `components/ui/`

2. **Database Operations**
   - Always use Supabase Row Level Security (RLS)
   - Check `database/` directory for existing policies
   - Use services layer for complex business logic
   - **TIMEZONE**: Always use Korea Standard Time (KST, UTC+9)
     - Database: Set timestamptz columns with Korean timezone
     - Application: Convert all dates to Korean timezone for display
     - Consistency: All timestamps across the system should be KST

3. **State Management**
   - Use SWR for server state
   - React hooks for local state
   - No external state management library

4. **Error Handling**
   - **IMPORTANT**: Use Sonner toast for all notifications (`import { toast } from 'sonner'`)
   - Sonner is more stable than shadcn/ui toast (avoids state management issues)
   - Usage: `toast.success('message')`, `toast.error('message')`, `toast.info('message')`
   - Handle Supabase errors appropriately
   - Check auth state before protected operations

5. **Styling**
   - Use Tailwind CSS utilities
   - Follow existing color scheme and spacing
   - Dark mode support via `next-themes`

6. **TypeScript Best Practices & Common Fixes**
   - **Next.js 15 Compatibility**: Use `cookies: () => cookieStore as any` for Supabase auth helpers
   - **Supabase Type Complexity**: Use `@ts-ignore` for complex generic type issues with `.eq()` and `.update()` methods
   - **Nullable Database Fields**: Always provide safe defaults (e.g., `row.field || false`, `row.field || ''`)
   - **Query Parameters**: Cast to specific types when needed (e.g., `param as FilterType['field']`)
   - **Database Row Mapping**: Handle nullable fields properly in type conversion functions

## Current Issues & Solutions

1. **Build Warnings**: ESLint and TypeScript errors ignored in production build
2. **Calendar Migration**: Moving from n8n webhook-based to direct Google Calendar API
3. **Multi-tenancy**: Single-tenant currently, SaaS migration planned

## Testing

No test framework currently configured. When implementing tests:
1. Check package.json for any test scripts
2. Ask user for preferred testing approach before implementing