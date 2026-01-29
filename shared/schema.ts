import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // 4-char room code
  fen: text("fen").notNull(), // Current board state
  pgn: text("pgn").default(""), // Move history
  turn: text("turn").notNull().default("w"), // 'w' or 'b'
  status: text("status").notNull().default("waiting"), // waiting, playing, checkmate, draw, aborted
  whiteId: text("white_id"), // Socket/Session ID
  blackId: text("black_id"), // Socket/Session ID
  winner: text("winner"), // 'w', 'b', or 'draw'
  lastMove: jsonb("last_move"), // Store the last move for highlighting { from, to }
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  createdAt: true 
});

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

// WebSocket Message Types
export type MoveMessage = {
  type: 'move';
  code: string;
  from: string;
  to: string;
  promotion?: string;
};

export type JoinMessage = {
  type: 'join';
  code: string;
};

export type GameStateMessage = {
  type: 'game_state';
  game: Game;
};

export type ErrorMessage = {
  type: 'error';
  message: string;
};
