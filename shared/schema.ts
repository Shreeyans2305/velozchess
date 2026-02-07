import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
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
  endReason: text("end_reason"), // 'checkmate', 'resignation', 'timeout', 'draw_agreement', 'stalemate', 'insufficient_material'
  drawOfferedBy: text("draw_offered_by"), // 'w', 'b', or null
  lastMove: jsonb("last_move"), // Store the last move for highlighting { from, to }
  whiteTime: integer("white_time").notNull().default(600), // 10 minutes in seconds
  blackTime: integer("black_time").notNull().default(600), // 10 minutes in seconds
  timeControl: integer("time_control").notNull().default(600), // Base time in seconds (default 10 min)
  increment: integer("increment").notNull().default(0), // Increment in seconds per move
  lastMoveTime: timestamp("last_move_time").defaultNow(),
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
