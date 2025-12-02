# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FamilyChatter** (우리 가족 채팅) is a real-time family chat application designed for all ages with Apple-style minimalism. Built with React 18, TypeScript, Express.js, and WebSocket for instant messaging.

## Development Commands

### Core Development
- **`npm run dev`** - Start development server on http://localhost:5000 with hot module replacement
- **`npm run build`** - Build for production (client + server bundling)
- **`npm start`** - Run production build
- **`npm run check`** - Run TypeScript type checker

### Database
- **`npm run db:push`** - Push schema changes to PostgreSQL via Drizzle Kit

### Dependency & Environment
- **Node.js 20+** required
- **Port 5000** (configurable via PORT env variable)
- Database: PostgreSQL (Neon) - optional for current in-memory implementation

## Architecture Overview

### Monorepo Structure

```
FamilyChatter/
├── client/              # React frontend (Vite + TypeScript)
│   └── src/
│       ├── pages/chat.tsx          # Main chat page component
│       ├── components/
│       │   ├── chat/               # 9 domain-specific chat components
│       │   └── ui/                 # 47 shadcn/ui primitive components
│       ├── hooks/useWebSocket.ts   # WebSocket connection manager
│       └── lib/                    # Utilities & configurations
├── server/              # Express.js backend (TypeScript)
│   ├── index.ts         # Server entry point with Vite dev integration
│   ├── routes.ts        # WebSocket routes + REST API endpoints
│   ├── storage.ts       # IStorage interface + MemStorage implementation
│   └── auth.ts          # Authentication logic
├── shared/              # Shared types & schemas
│   ├── schema.ts        # Data models, Drizzle ORM schema, Zod validators
│   └── auth.ts          # Shared auth utilities
└── script/build.ts      # Production build script (Vite + esbuild)
```

### Key Architecture Patterns

1. **WebSocket Real-Time System**
   - Custom useWebSocket hook manages connection lifecycle
   - Auto-reconnect with exponential backoff (1s → 30s max, 10 attempts)
   - Heartbeat every 30s via ping/pong
   - Connection pooling and room-based message broadcasting

2. **Component Structure**
   - Atomic design: shadcn/ui primitives in `/components/ui/`
   - Domain-specific chat components in `/components/chat/`
   - Each component is self-contained with its own types and utilities

3. **Type-Safe Data Flow**
   - Shared Zod schemas in `shared/schema.ts`
   - TypeScript types inferred from schemas across client/server
   - Validated messages through WebSocket protocol

4. **Storage Abstraction**
   - IStorage interface allows swapping implementations
   - Currently: MemStorage (in-memory Maps)
   - Future: PostgreSQL via Drizzle ORM (config exists)

### Default Family Members

The application initializes with:
- `group` - 가족 단체방 (Family group chat)
- `me` - 나 (Current user)
- `mom` - 엄마 (Online)
- `dad` - 아빠 (Offline)
- `sister` - 누나 (Online)
- `brother` - 형 (Offline)

## Technology Stack

### Frontend
- **React 18.3** - UI library
- **TypeScript 5.6** - Type safety
- **Vite 5.4** - Build tool & dev server
- **TailwindCSS 3.4** - Utility-first styling
- **shadcn/ui** - Radix UI component library
- **TanStack Query v5** - Server state & caching
- **Wouter 3.3** - Lightweight routing
- **Framer Motion** - Animations
- **date-fns** - Date utilities
- **Lucide React** - Icons

### Backend
- **Express.js 4.21** - Web framework
- **TypeScript 5.6** - Type safety
- **ws 8.18** - WebSocket server
- **Drizzle ORM 0.39** - PostgreSQL support
- **Zod 3.24** - Schema validation
- **@neondatabase/serverless** - Neon database client

### Build & Dev Tools
- **esbuild** - Production bundler
- **tsx** - TypeScript execution
- **Drizzle Kit** - DB migrations

## File Path Aliases

In both client and `tsconfig.json`:
- `@/*` → `/FamilyChatter/client/src/*`
- `@shared/*` → `/FamilyChatter/shared/*`
- `@assets/*` → `/FamilyChatter/attached_assets/*`

## Key Components and APIs

### WebSocket Protocol

**Client → Server:**
- `join_room` - Enter a chat room
- `send_message` - Send a message
- `typing` - Indicate typing status
- `ping` - Heartbeat signal

**Server → Client:**
- `room_history` - Load existing messages
- `new_message` - Incoming message
- `user_typing` - User is typing
- `pong` - Heartbeat response

### REST API Endpoints
- `GET /api/members` - List all family members
- `GET /api/members/:id` - Get specific member info
- `GET /api/messages/:roomId` - Get room messages

### Custom Hooks

**useWebSocket** - Primary hook for real-time communication
- Connection state management
- Auto-reconnect with backoff
- Message sending and receiving
- Room switching
- Typing indicators

## Development Patterns

### Component Style
Components follow this pattern:
1. Interface definitions at top
2. Helper/utility functions
3. Component export with clear props typing

Example: `ChatMessage.tsx` has `Message` interface, `formatTime()` utility, then component export.

### State Management Layers
1. **Server State**: TanStack Query (caching, fetching)
2. **WebSocket State**: useWebSocket hook (real-time updates)
3. **Local UI State**: React useState (forms, toggles)

### Naming Conventions
- Components: PascalCase (`ChatMessage.tsx`)
- Hooks: camelCase with "use" prefix (`useWebSocket.ts`)
- Utilities: camelCase (`queryClient.ts`)
- Types: PascalCase (`interface Message {}`)
- Constants: UPPER_SNAKE_CASE

## Design System

From `design_guidelines.md`:

### Philosophy
- **Warmth & Approachability** - Friendly for all ages
- **Instant Clarity** - Zero learning curve
- **Message Priority** - Content over chrome

### Colors
- Primary: `hsl(211 100% 50%)` (Blue)
- Neutral: Full gray scale with HSL variables
- Status: Online, Away, Busy, Offline colors defined

### Layout & Spacing
- Base unit: 8px (Tailwind convention)
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Dark mode: class-based (`dark:` prefix in Tailwind)

### Typography
- System font stack: SF Pro Display, -apple-system, Segoe UI
- Consistent font sizes and line heights

## Important Implementation Details

### WebSocket Stability Features

The application has robust connection handling:
- **Exponential Backoff**: Prevents server overload on repeated failures
- **Heartbeat System**: Ping every 30s detects stale connections
- **State Management**: Prevents duplicate reconnection attempts
- **Max Retry Logic**: 10 attempts over ~17 minutes before giving up

### Client-Server Synchronization

- Messages are validated with Zod on both sides
- Room history is sent when joining a room
- Typing indicators are throttled
- Read receipts use message timestamp comparison

### Build System

The build script (`script/build.ts`):
1. Vite builds React app → `/dist/public/`
2. esbuild bundles server → `/dist/index.cjs`
3. Minified CommonJS format for production

## Testing Notes

Currently manual testing is recommended for:
- WebSocket reconnection under network failures
- Message persistence across room switches
- Typing indicator throttling
- Online status propagation

## Future Roadmap

From README - planned features:
- PostgreSQL database integration (schema exists via Drizzle)
- User authentication system
- File/image sharing
- Voice/video calls
- Message encryption
- Push notifications
- React Native mobile app

## Common Development Tasks

### Adding a New Chat Component
1. Create component in `client/src/components/chat/`
2. Define TypeScript interfaces at top
3. Import from shared types if needed (`@shared/schema.ts`)
4. Use shadcn/ui primitives from `@/components/ui/`
5. Export as default

### Modifying WebSocket Protocol
1. Update message types in `shared/schema.ts`
2. Update server handler in `server/routes.ts`
3. Update client sender in `client/src/hooks/useWebSocket.ts`
4. Add Zod validation for new message types

### Adding a REST API Endpoint
1. Define Zod schema in `shared/schema.ts`
2. Add route handler in `server/routes.ts`
3. Use existing storage interface from `server/storage.ts`
4. Test with `curl` or REST client

### Integrating Database
1. Drizzle ORM is already configured (`drizzle.config.ts`)
2. Schema defined in `shared/schema.ts`
3. Use `npm run db:push` to apply migrations
4. Swap MemStorage for database implementation in `server/storage.ts`
