# Project Context

## Purpose
OptiTrack HK is a Next.js web application integrated with Supabase for backend services. This project aims to provide a modern, scalable web platform with real-time database capabilities and authentication features.

**Current Status**: Early development stage with foundational setup complete.

## Tech Stack

### Frontend
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - UI library with latest features
- **React DOM 19.2.3** - React rendering for web
- **TypeScript 5.x** - Type-safe development with strict mode enabled
- **Tailwind CSS 4.x** - Utility-first CSS framework with PostCSS plugin
- **Geist Fonts** - Vercel's optimized font family (Sans & Mono variants)

### Backend & Services
- **Supabase JS Client 2.89.0** - Backend-as-a-Service (BaaS) for:
  - PostgreSQL database
  - Authentication (Email/password, OAuth providers)
  - Real-time subscriptions
  - Storage
  - Row Level Security (RLS)

### Development Tools
- **ESLint 9.x** - Code linting with Next.js config
- **PostCSS** - CSS processing with Tailwind CSS 4.x plugin
- **TypeScript** - Strict type checking enabled
- **Node Types 20.x** - Node.js type definitions

## Project Structure

```
optitrack-hk/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (currently empty)
│   ├── layout.tsx         # Root layout with Geist fonts
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles with Tailwind directives
│   └── favicon.ico        # Site favicon
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── layout/           # Layout and navigation components
│   └── ui/               # Reusable UI components
├── utils/                # Utility functions
│   ├── supabase.ts       # Supabase client initialization
│   └── helpers/          # Helper functions and utilities
├── public/               # Static assets
├── openspec/             # Project documentation
│   ├── project.md        # This file
│   ├── AGENTS.md         # Agent-specific documentation
│   ├── specs/            # Feature specifications
│   └── changes/          # Change logs and archives
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── eslint.config.mjs     # ESLint configuration
├── postcss.config.mjs    # PostCSS configuration
└── package.json          # Project dependencies
```

## Project Conventions

### Code Style
- **TypeScript Strict Mode**: Enabled for maximum type safety
- **Target**: ES2017 for modern JavaScript features
- **Path Aliases**: Use `@/*` for root-level imports (configured in tsconfig.json)
  - Example: `@/components/ui/Button`, `@/utils/supabase`
- **File Naming**:
  - Components: PascalCase (e.g., `UserProfile.tsx`)
  - Utilities: camelCase (e.g., `formatDate.ts`)
  - API routes: lowercase with hyphens (e.g., `user-data.ts`)
  - Config files: lowercase with appropriate extension (`.ts`, `.mjs`)
- **Component Structure**: 
  - Functional components with TypeScript interfaces for props
  - Use React 19 features (Server Components by default)
- **Formatting**: Follow ESLint Next.js conventions

### Architecture Patterns
- **App Router**: Using Next.js 13+ App Router architecture (`app/` directory)
- **Server Components**: Default to Server Components, use Client Components (`'use client'`) only when needed for:
  - Browser APIs (useState, useEffect, event handlers)
  - Interactive UI elements
  - Client-side data fetching
- **API Routes**: Place in `app/api/` directory following Next.js 13+ Route Handler pattern
- **Component Organization**:
  - `components/ui/` - Reusable UI components (buttons, inputs, cards, etc.)
  - `components/auth/` - Authentication-related components (login forms, auth providers)
  - `components/layout/` - Layout and navigation components (header, footer, sidebar)
- **Utils Organization**:
  - `utils/supabase.ts` - Centralized Supabase client initialization
  - `utils/helpers/` - Helper functions and utilities (date formatting, validation, etc.)
- **Environment Variables**: All Supabase keys prefixed with `NEXT_PUBLIC_` for client-side access
  - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Typography & Design
- **Primary Font**: Geist Sans (`--font-geist-sans`)
- **Monospace Font**: Geist Mono (`--font-geist-mono`)
- **Font Loading**: Optimized with `next/font` for automatic font optimization
- **Dark Mode**: Supported via Tailwind's `dark:` variant
- **Color Scheme**: 
  - Light mode: `bg-white`, `text-black`, `text-zinc-600`
  - Dark mode: `bg-black`, `text-zinc-50`, `text-zinc-400`
- **CSS Variables**: Font variables defined in root layout for global access

### Database & Backend
- **Supabase Client**: Centralized in `utils/supabase.ts`
  - Uses `createClient` from `@supabase/supabase-js`
  - Configured with environment variables
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (required)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (required)
- **Type Safety**: 
  - Generate TypeScript types from Supabase schema when possible
  - Use `supabase gen types typescript` CLI command
- **Best Practices**:
  - Always use parameterized queries
  - Implement Row Level Security (RLS) policies
  - Handle authentication state properly
  - Use Supabase's built-in error handling

### Testing Strategy
- Follow Next.js best practices for testing
- Test Server Components and Client Components separately
- API routes should have integration tests
- Mock Supabase client for unit tests
- Consider using Jest, Vitest, or React Testing Library

### Git Workflow
- **Ignored Files** (see `.gitignore`):
  - `node_modules/` - Dependencies
  - `.env*` files - All environment variables (NEVER commit)
  - `.next/` - Build output
  - TypeScript build info
- **Branch Strategy**: Feature branches merged to main
- **Commit Convention**: Clear, descriptive commit messages
  - Example: `feat: add user authentication flow`
  - Example: `fix: resolve navigation menu styling issue`

## Development Workflow

### Available Scripts
```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build production bundle
npm run start    # Start production server
npm run lint     # Run ESLint for code quality
```

### Setup Checklist
1. ✅ Install dependencies: `npm install`
2. ⚠️ Create `.env.local` with Supabase credentials
3. ⚠️ Configure Supabase project (database, auth, RLS policies)
4. ⚠️ Update metadata in `app/layout.tsx` (title, description)
5. ⚠️ Implement authentication flow in `components/auth/`
6. ⚠️ Create database schema and generate types
7. ⚠️ Build out API routes in `app/api/` as needed

### Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Domain Context
- **Target Region**: Hong Kong (HK)
- **Application Type**: Full-stack web application with database backend
- **User Interaction**: Modern web app with authentication and real-time data persistence
- **Use Case**: To be defined based on business requirements

## Important Constraints
- **TypeScript Strict Mode**: All code must pass strict type checking
  - No implicit `any` types
  - Strict null checks enabled
  - Strict function types
- **Environment Security**: 
  - NEVER commit `.env.local` or expose API keys in client code
  - All sensitive operations should use server-side API routes or Server Components
- **Server/Client Boundary**: 
  - Be mindful of Server vs Client Components in Next.js App Router
  - Only use `'use client'` when necessary
  - Server Components cannot use browser APIs or hooks
- **Supabase RLS**: 
  - Implement Row Level Security policies for data protection
  - Never bypass RLS in production
  - Test authentication flows thoroughly
- **React 19 Compatibility**: Ensure all packages are compatible with React 19

## External Dependencies

### Core Services
- **Supabase**: Primary backend service
  - Database: PostgreSQL with real-time capabilities
  - Authentication: Multiple providers (email/password, OAuth)
  - Storage: File uploads and management
  - Edge Functions: Serverless functions (optional)
  - Realtime: WebSocket connections for live updates

### Deployment
- **Vercel** (Recommended): 
  - Native Next.js optimization
  - Automatic deployments from Git
  - Edge Network for global performance
  - Environment variable management
- **Alternative**: Any Node.js hosting platform

### CDN & Assets
- **Next.js Image Optimization**: Built-in image optimization
- **Geist Fonts**: Loaded via `next/font` for optimal performance
- **Vercel Analytics** (Optional): Performance and analytics tracking

## Next Steps & Recommendations
1. **Define Application Purpose**: Clarify what OptiTrack HK will do
2. **Database Schema**: Design and implement Supabase tables
3. **Authentication**: Implement auth components and flows
4. **UI Components**: Build out component library in `components/ui/`
5. **API Layer**: Create necessary API routes in `app/api/`
6. **Type Generation**: Generate TypeScript types from Supabase schema
7. **Testing Setup**: Add testing framework (Jest/Vitest)
8. **Documentation**: Update README.md with project-specific information
9. **CI/CD**: Set up continuous integration and deployment
10. **Monitoring**: Add error tracking (Sentry, LogRocket, etc.)
