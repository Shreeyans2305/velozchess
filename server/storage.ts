import { games, type Game, type InsertGame } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createGame(): Promise<Game>;
  getGame(code: string): Promise<Game | undefined>;
  updateGameState(code: string, fen: string, pgn: string, turn: string, lastMove: any, whiteTime: number, blackTime: number): Promise<Game>;
  setPlayer(code: string, role: 'w' | 'b', playerId: string): Promise<Game>;
  setWinner(code: string, winner: 'w' | 'b' | 'draw'): Promise<Game>;
}

export class DatabaseStorage implements IStorage {
  async createGame(): Promise<Game> {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const [game] = await db.insert(games).values({
      code,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Initial FEN
      pgn: "",
      turn: "w",
      status: "waiting",
      whiteTime: 600,
      blackTime: 600,
    }).returning();
    return game;
  }

  async getGame(code: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.code, code));
    return game;
  }

  async updateGameState(code: string, fen: string, pgn: string, turn: string, lastMove: any, whiteTime: number, blackTime: number): Promise<Game> {
    const [game] = await db.update(games)
      .set({ fen, pgn, turn, lastMove, status: "playing", whiteTime, blackTime, lastMoveTime: new Date() })
      .where(eq(games.code, code))
      .returning();
    return game;
  }

  async setPlayer(code: string, role: 'w' | 'b', playerId: string): Promise<Game> {
    const update = role === 'w' ? { whiteId: playerId } : { blackId: playerId };
    const [game] = await db.update(games)
      .set(update)
      .where(eq(games.code, code))
      .returning();
    
    // If both players joined, update status
    if (game.whiteId && game.blackId && game.status === "waiting") {
      const [started] = await db.update(games)
        .set({ status: "playing", lastMoveTime: new Date() })
        .where(eq(games.code, code))
        .returning();
      return started;
    }
    
    return game;
  }

  async setWinner(code: string, winner: 'w' | 'b' | 'draw'): Promise<Game> {
    const [game] = await db.update(games)
      .set({ winner, status: winner === 'draw' ? 'draw' : 'checkmate' })
      .where(eq(games.code, code))
      .returning();
    return game;
  }
}

export const storage = new DatabaseStorage();
