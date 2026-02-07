CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"fen" text NOT NULL,
	"pgn" text DEFAULT '',
	"turn" text DEFAULT 'w' NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"white_id" text,
	"black_id" text,
	"winner" text,
	"last_move" jsonb,
	"white_time" integer DEFAULT 600 NOT NULL,
	"black_time" integer DEFAULT 600 NOT NULL,
	"time_control" integer DEFAULT 600 NOT NULL,
	"increment" integer DEFAULT 0 NOT NULL,
	"last_move_time" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "games_code_unique" UNIQUE("code")
);
