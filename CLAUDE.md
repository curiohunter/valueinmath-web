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

### Current Development Focus (Updated 2025-07-01)
- ✅ **Calendar System Completed**: Successfully migrated from n8n to FullCalendar with Google Calendar integration
- ✅ **Google OAuth Integration**: Production deployment with proper redirect URIs configured
- ✅ **Vercel Auto-deployment**: GitHub integration working (requires public repository)
- 🚧 **SaaS Multi-tenancy**: Preparing for transformation
- 🚧 **Database Schema**: Simplification in progress

### Database Schema Key Tables
- `profiles` - User profiles with approval system
- `students` - Student management
- `employees` - Employee management with auth linking
- `classes` - Class/course information
- `class_students` - Many-to-many relationship
- `calendar_events` - **NEW**: Calendar events with Google Calendar integration
  - 48 imported Google Calendar events (시험, 보강, 직보, 근무 등)
  - `created_by` field for user tracking (UUID references profiles table)
  - `google_calendar_id` for Google integration
  - Event types: school_exam, makeup, last_minute_makeup, work, absence, entrance_test, notice
- Chat system tables (agents, chats, messages) - scheduled for refactoring

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://valueinmath.vercel.app
```

### Production Deployment Setup (Vercel)
- **Domain**: https://valueinmath.vercel.app
- **GitHub Integration**: Requires **public repository** for auto-deployment webhooks
- **Google OAuth Redirect**: Updated from localhost to production URL
- **Email Unification**: All services use ian_park@valueinmath.com

### Path Aliases
- `@/*` maps to root directory (configured in tsconfig.json)

## Common Issues & Solutions

### 1. **Authentication Rate Limit 문제**
- **문제**: "Request rate limit reached" 오류로 로그인 실패
- **원인**: 
  - Middleware가 모든 페이지 이동마다 2-3번의 API 호출
  - 여러 컴포넌트가 독립적으로 인증 확인
  - 짧은 재시도 간격과 공격적인 재시도 로직
- **해결방법**:
  ```typescript
  // 1. AuthContext로 중앙화된 인증 상태 관리
  // contexts/AuthContext.tsx 생성
  
  // 2. Middleware에 캐싱 추가 (5분)
  res.cookies.set('auth-cache', JSON.stringify({
    session: !!session,
    timestamp: now
  }), { maxAge: 5 * 60 });
  
  // 3. 재시도 간격 증가
  // 2/4/8초 → 10/20/40초
  
  // 4. 폴링 간격 증가
  // 10초 → 60초
  ```

### 2. **일괄 편집 모드에서 행 삭제 시 저장 안 되는 문제**
- **문제**: learning, test-logs 페이지에서 행을 삭제하고 저장해도 DB에 반영되지 않음
- **원인**: UI에서만 삭제하고 DB 삭제를 추적하지 않음
- **해결방법**:
  ```typescript
  // 1. 삭제된 행 ID 추적 state 추가
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  
  // 2. 삭제 버튼 클릭 시 ID 추가
  onClick={() => {
    const rowToDelete = rows[originalIdx];
    if (rowToDelete.id) {
      setDeletedRowIds(prev => [...prev, rowToDelete.id!]);
    }
    setRows(rows => rows.filter((_, i) => i !== originalIdx));
  }}
  
  // 3. 저장 시 먼저 삭제 처리
  if (deletedRowIds.length > 0) {
    await supabase.from("table_name").delete().in("id", deletedRowIds);
  }
  
  // 4. 성공 후 초기화
  setDeletedRowIds([]);
  ```

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

7. **Supabase Client Best Practices**
   - **IMPORTANT**: Use `createClientComponentClient` from `@supabase/auth-helpers-nextjs` for client components
   - **API Routes**: Use `createRouteHandlerClient` instead of `createServerComponentClient`
   - **Avoid**: Direct `supabaseClient` from `@/lib/supabase/client` (causes auth session issues)
   - **Pattern**: 
     ```typescript
     // Client Component
     import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
     const supabase = createClientComponentClient<Database>();
     
     // API Route
     import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
     const supabase = createRouteHandlerClient<Database>({ 
       cookies: () => cookieStore as any 
     });
     ```
   - **Auth Session**: Always check if user exists before making authenticated requests

8. **Supabase Upsert/Insert Best Practices**
   - **ID Handling**: Never include undefined/null ID fields in upsert operations
   - **Pattern for Mixed Records**: Separate existing and new records
     ```typescript
     const existingRows = rows.filter(r => r.id);
     const newRows = rows.filter(r => !r.id);
     
     // Update existing with ID
     if (existingRows.length > 0) {
       await supabase.from("table").upsert(data, { onConflict: "id" });
     }
     
     // Insert new without ID (auto-generated)
     if (newRows.length > 0) {
       await supabase.from("table").insert(data);
     }
     ```
   - **created_by Field**: Set to responsible teacher ID for tracking/reporting
   - **last_modified_by Field**: Set to current user ID for audit trail

## Current Issues & Solutions

1. **Build Warnings**: ESLint and TypeScript errors ignored in production build
2. ✅ **Calendar Migration**: Successfully completed - FullCalendar with 48 Google events imported
3. **Multi-tenancy**: Single-tenant currently, SaaS migration planned
4. ✅ **Authentication Rate Limit**: Fixed by implementing AuthContext and middleware caching

## Recent Major Changes (2025-07-04)

### 1. Authentication System Overhaul
- **AuthContext Implementation**: Centralized auth state management to reduce API calls
- **Middleware Caching**: Added 5-minute auth cache to prevent rate limiting
- **Login Flow Fix**: Fixed redirect loop issue in login action
- **API Route Client Fix**: Changed from `createServerComponentClient` to `createRouteHandlerClient`

## Recent Major Changes (2025-07-01)

### 1. Calendar System Overhaul
- **FullCalendar Integration**: Replaced n8n webhook system
- **Dashboard Calendar**: Google Calendar style UI with date grouping
- **Timezone Fix**: All dates properly handled in KST
- **More Events Modal**: Fixed transparent background issue
- **Event Categories**: 시험, 보강, 직보, 근무, 결석, 입학테스트, 공지사항

### 2. Global Chat System
- **Preserved Architecture**: Kept working global chat (GlobalChatButton + GlobalChatPanel)
- **Removed /chat Page**: Eliminated dedicated chat page while keeping functionality
- **Real-time Updates**: Supabase real-time subscriptions working

### 3. Google OAuth Production Setup
- **Redirect URI**: Changed from localhost to https://valueinmath.vercel.app
- **Environment Variables**: Added NEXT_PUBLIC_SITE_URL
- **Google Cloud Console**: Updated authorized redirect URIs

### 4. Vercel Deployment Insights
- **Private Repository Issue**: Webhooks don't work with private GitHub repos
- **Solution**: Changed to public repository for auto-deployment
- **Important**: Remove sensitive data (user IDs, API keys) before going public

## Testing

No test framework currently configured. When implementing tests:
1. Check package.json for any test scripts
2. Ask user for preferred testing approach before implementing