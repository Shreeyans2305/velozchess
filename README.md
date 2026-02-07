# Veloz Chess ♟️

> **"Online Clipboard for Chess"** - Instant, no-signup chess games for when you just want to play.

![Veloz Chess](preview.png)

Veloz Chess is a minimal, blazing-fast chess application designed for frictionless play. No accounts, no elo anxiety, no "sign in to continue". Just create a game, share the code, and play.

## Why?

This project was born out of a simple frustration: **Playing chess in college labs/libraries is a frustratingg**. 

-   Devices are always changing (public computers).
-   School/College networks often block popular gaming sites like Chess.com or Lichess.
-   Logging into personal accounts on public machines is risky and tedious.
-   Sometimes you just want to play a quick game with a friend sitting next to you (or across campus) without the setup.

**The Solution?** An "online clipboard" style approach. You don't sign up for a clipboard; you just use it. Veloz Chess applies that same philosophy to the game of kings.

## The Stack

Built with a modern, type-safe full-stack architecture:

-   **Frontend**: React + Vite + TypeScript
    -   *Styling*: Tailwind CSS + Shadcn UI
    -   *Logic*: `chess.js` (Rules) + `react-chessboard` (UI)
-   **Backend**: Node.js + Express
    -   *Real-time*: Native `ws` (WebSockets)
-   **Database**: PostgreSQL (Supabase)
    -   *ORM*: Drizzle ORM
-   **Deployment**:
    -   Frontend: Vercel (SPA)
    -   Backend: Render (Web Service)

## How to Mess Around with the Code

Want to modify the game? Add new pieces? Change the rules? Here is how to get running locally.

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL Database (Local or Supabase)

### 1. Clone & Install
```bash
git clone https://github.com/Shreeyans2305/velozchess.git
cd velozchess
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
# Database Connection (Supabase or Local)
DATABASE_URL="postgresql://postgres:password@localhost:5432/veloz_chess"

# Optional: Run backend on specific port (default 5000)
PORT=5000
```

### 3. Database Setup
Push the schema to your database:
```bash
npm run db:push
```

### 4. Run Locally
Start both the Frontend and Backend in development mode:
```bash
npm run dev
```
Open `http://localhost:5000` to see your app!

## Project Structure

-   **`/client`**: The React Frontend.
    -   `src/pages/GameRoom.tsx`: The heart of the game logic.
    -   `src/hooks/use-game-socket.ts`: Handles WebSocket communication.
-   **`/server`**: The Express Backend.
    -   `routes.ts`: API endpoints and WebSocket event handling.
    -   `storage.ts`: Database interaction layer.
-   **`/shared`**: Code shared between frontend and backend.
    -   `schema.ts`: Database schema and Type definitions (Drizzle/Zod).


---
*Built for chess lovers everywhere.*
