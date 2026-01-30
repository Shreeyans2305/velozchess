# replit.md

## Overview

This is a real-time multiplayer chess application built as a full-stack TypeScript project. Players can create game rooms with shareable 4-character codes, join games, and play chess against each other with moves synchronized via WebSocket connections. The app features a dark-themed, mobile-first gaming interface with move validation using chess.js.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Build Tool**: Vite with custom path aliases (@/, @shared/, @assets/)
- **Chess UI**: react-chessboard for board rendering, chess.js for move validation
- **Animations**: Framer Motion for UI transitions

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (tsx for development, esbuild for production)
- **Real-time Communication**: Native WebSocket (ws library) at /ws endpoint
- **API Pattern**: REST endpoints defined in shared/routes.ts with Zod validation schemas
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (connection via DATABASE_URL environment variable)
- **Schema Location**: shared/schema.ts
- **Migrations**: Drizzle Kit with migrations output to /migrations folder
- **Key Tables**: games table storing room code, FEN position, PGN history, player IDs, game status

### Game State Management
- Games are identified by 4-character uppercase codes
- Board state stored as FEN strings
- Move history stored as PGN
- Player roles: white (w), black (b), or spectator
- Game statuses: waiting, playing, checkmate, draw, aborted
- Last move tracking for UI highlighting

### Client-Server Communication
- HTTP REST for game creation and initial state fetching
- WebSocket for real-time move synchronization and game state updates
- Message types: join, move, game_state, error
- Player identification via client-generated UUIDs stored in sessionStorage

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including ChessBoard, GameStatus
    hooks/        # Custom hooks (use-game-socket, use-games)
    pages/        # Route components (Home, GameRoom)
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API routes and WebSocket handler
  storage.ts      # Database operations
  db.ts           # Database connection
shared/           # Shared types and schemas
  schema.ts       # Drizzle table definitions
  routes.ts       # API route definitions with Zod schemas
```

## External Dependencies

### Database
- PostgreSQL database (required, configured via DATABASE_URL)
- Drizzle ORM for type-safe queries
- connect-pg-simple for session storage capability

### UI Framework
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling
- Lucide React for icons

### Chess Logic
- chess.js for move validation, game state, and rule enforcement
- react-chessboard for interactive board rendering

### Build & Development
- Vite for frontend development and bundling
- esbuild for server production builds
- TypeScript for type safety across the stack

### Replit-Specific
- @replit/vite-plugin-runtime-error-modal for error display
- @replit/vite-plugin-cartographer and dev-banner for development