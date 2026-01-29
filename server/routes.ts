import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { Chess } from "chess.js"; // Validation logic

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create Game
  app.post(api.games.create.path, async (req, res) => {
    const game = await storage.createGame();
    res.status(201).json(game);
  });

  // Join Game (HTTP part for validation/role assignment)
  app.post(api.games.join.path, async (req, res) => {
    const { code } = req.body;
    const game = await storage.getGame(code);
    
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Assign role simply based on availability (first come first serve logic handled in client/WS mostly, 
    // but here we can just return the game state)
    // Actually, for simplicity, we'll let the WS connection handle the 'seat taking' based on the session ID.
    // This endpoint is just to check existence and get initial state.
    
    // Determine available role
    let role = 'spectator';
    if (!game.whiteId) role = 'w';
    else if (!game.blackId) role = 'b';
    
    // We don't SET the player here, we do it when they connect via WS to confirm they are "live".
    // Or we could do it here. Let's do it here to reserve the spot.
    // Problem: We need a unique ID for the player.
    // Let's rely on the client generating a UUID and sending it via WS join message.
    
    res.json({ game, role });
  });

  app.get(api.games.get.path, async (req, res) => {
    const game = await storage.getGame(req.params.code);
    if (!game) return res.status(404).json({ message: "Game not found" });
    res.json(game);
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map code -> Set<WebSocket>
  const rooms = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws) => {
    let gameCode: string | null = null;
    let playerId: string | null = null; // Used to identify reconnecting players

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          gameCode = message.code;
          // Ideally client sends a generated UUID 'playerId' to persist identity across refreshes
          playerId = message.playerId || Math.random().toString(36).substring(7);
          
          if (!gameCode) return;

          const game = await storage.getGame(gameCode);
          if (!game) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game not found' }));
            return;
          }

          // Assign Role
          let role = 'spectator';
          if (game.whiteId === playerId || (!game.whiteId && game.blackId !== playerId)) {
            role = 'w';
            await storage.setPlayer(gameCode, 'w', playerId);
          } else if (game.blackId === playerId || !game.blackId) {
            role = 'b';
            await storage.setPlayer(gameCode, 'b', playerId);
          }

          // Add to room
          if (!rooms.has(gameCode)) rooms.set(gameCode, new Set());
          rooms.get(gameCode)!.add(ws);

          // Send current state
          const updatedGame = await storage.getGame(gameCode);
          ws.send(JSON.stringify({ type: 'game_state', game: updatedGame }));
          
          // Broadcast to others (e.g. status change to 'playing')
          broadcast(gameCode, { type: 'game_state', game: updatedGame });
        }

        if (message.type === 'move') {
          if (!gameCode) return;
          const game = await storage.getGame(gameCode);
          if (!game) return;

          // Logic: Validate move with chess.js
          const chess = new Chess(game.fen);
          
          try {
            const move = chess.move({
              from: message.from,
              to: message.to,
              promotion: message.promotion || 'q'
            });
            
            if (move) {
              // Valid move
              // Check for game end
              let winner: 'w' | 'b' | 'draw' | undefined;
              if (chess.isCheckmate()) {
                winner = chess.turn() === 'w' ? 'b' : 'w'; // Turn has switched, so previous mover won
              } else if (chess.isDraw()) {
                winner = 'draw';
              }

              // Update DB
              const updatedGame = await storage.updateGameState(
                gameCode,
                chess.fen(),
                chess.pgn(),
                chess.turn(),
                { from: message.from, to: message.to }
              );

              if (winner) {
                await storage.setWinner(gameCode, winner);
              }

              // Broadcast
              const finalGame = await storage.getGame(gameCode);
              broadcast(gameCode, { type: 'game_state', game: finalGame });
            }
          } catch (e) {
            // Invalid move
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
          }
        }

      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    ws.on('close', () => {
      if (gameCode && rooms.has(gameCode)) {
        rooms.get(gameCode)!.delete(ws);
        if (rooms.get(gameCode)!.size === 0) {
          rooms.delete(gameCode);
        }
      }
    });
  });

  function broadcast(code: string, message: any) {
    if (rooms.has(code)) {
      const payload = JSON.stringify(message);
      rooms.get(code)!.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  return httpServer;
}
