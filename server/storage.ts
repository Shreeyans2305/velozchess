import { games, type Game, type InsertGame } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createGame(timeControl?: number, increment?: number): Promise<Game>;
  getGame(code: string): Promise<Game | undefined>;
  updateGameState(code: string, fen: string, pgn: string, turn: string, lastMove: any, whiteTime: number, blackTime: number): Promise<Game>;
  setPlayer(code: string, role: 'w' | 'b', playerId: string): Promise<Game>;
  setWinner(code: string, winner: 'w' | 'b' | 'draw', endReason: string): Promise<Game>;
  setGameStatus(code: string, status: string): Promise<Game>;
  offerDraw(code: string, player: 'w' | 'b'): Promise<Game>;
  acceptDraw(code: string): Promise<Game>;
  declineDraw(code: string): Promise<Game>;
}

export class DatabaseStorage implements IStorage {
  async createGame(timeControl: number = 600, increment: number = 0): Promise<Game> {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const [game] = await db.insert(games).values({
      code,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Initial FEN
      pgn: "",
      turn: "w",
      status: "waiting",
      whiteTime: timeControl,
      blackTime: timeControl,
      timeControl,
      increment,
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

    // If both players joined, update status and preserve time controls
    if (game.whiteId && game.blackId && game.status === "waiting") {
      const [started] = await db.update(games)
        .set({
          status: "playing",
          lastMoveTime: new Date(),
          whiteTime: game.whiteTime,
          blackTime: game.blackTime
        })
        .where(eq(games.code, code))
        .returning();

      console.log(`[Storage] Game ${code} starting - both players joined:`, {
        whiteId: started.whiteId,
        blackId: started.blackId,
        status: started.status,
        timeControl: started.timeControl,
        increment: started.increment,
        whiteTime: started.whiteTime,
        blackTime: started.blackTime
      });

      return started;
    }

    return game;
  }

  async setWinner(code: string, winner: 'w' | 'b' | 'draw', endReason: string): Promise<Game> {
    const status = winner === 'draw' ? 'draw' : 'checkmate';
    const [currentGame] = await db.select().from(games).where(eq(games.code, code));

    let result = '';
    if (winner === 'w') result = '1-0';
    else if (winner === 'b') result = '0-1';
    else result = '1/2-1/2';

    const newPgn = (currentGame?.pgn || '') + ' ' + result;

    const [game] = await db.update(games)
      .set({ winner, endReason, status, pgn: newPgn.trim() })
      .where(eq(games.code, code))
      .returning();
    return game;
  }

  async setGameStatus(code: string, status: string): Promise<Game> {
    const [game] = await db.update(games)
      .set({ status })
      .where(eq(games.code, code))
      .returning();
    return game;
  }

  async offerDraw(code: string, player: 'w' | 'b'): Promise<Game> {
    const [game] = await db.update(games)
      .set({ drawOfferedBy: player })
      .where(eq(games.code, code))
      .returning();
    return game;
  }

  async acceptDraw(code: string): Promise<Game> {
    const [currentGame] = await db.select().from(games).where(eq(games.code, code));
    const newPgn = (currentGame?.pgn || '') + ' 1/2-1/2';

    const [game] = await db.update(games)
      .set({ winner: 'draw', endReason: 'draw_agreement', status: 'draw', drawOfferedBy: null, pgn: newPgn.trim() })
      .where(eq(games.code, code))
      .returning();
    return game;
  }

  async declineDraw(code: string): Promise<Game> {
    const [game] = await db.update(games)
      .set({ drawOfferedBy: null })
      .where(eq(games.code, code))
      .returning();
    return game;
  }
}

export const storage = new DatabaseStorage();
