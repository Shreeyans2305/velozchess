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

  // Join Game
  app.post(api.games.join.path, async (req, res) => {
    const { code } = req.body;
    const game = await storage.getGame(code);
    
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    
    let role = 'spectator';
    if (!game.whiteId) role = 'w';
    else if (!game.blackId) role = 'b';
    
    res.json({ game, role });
  });

  app.get(api.games.get.path, async (req, res) => {
    const game = await storage.getGame(req.params.code);
    if (!game) return res.status(404).json({ message: "Game not found" });
    res.json(game);
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const rooms = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws) => {
    let gameCode: string | null = null;
    let playerId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          gameCode = message.code;
          playerId = message.playerId as string;
          
          if (!gameCode || !playerId) return;

          const game = await storage.getGame(gameCode);
          if (!game) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game not found' }));
            return;
          }

          // Assign Role
          if (game.whiteId === playerId || (!game.whiteId && game.blackId !== playerId)) {
            await storage.setPlayer(gameCode, 'w', playerId);
          } else if (game.blackId === playerId || !game.blackId) {
            await storage.setPlayer(gameCode, 'b', playerId);
          }

          if (!rooms.has(gameCode)) rooms.set(gameCode, new Set());
          rooms.get(gameCode)!.add(ws);

          const updatedGame = await storage.getGame(gameCode);
          broadcast(gameCode, { type: 'game_state', game: updatedGame });
        }

        if (message.type === 'move') {
          if (!gameCode) return;
          const game = await storage.getGame(gameCode);
          if (!game || game.status !== 'playing') return;

          // Calculate time reduction
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - new Date(game.lastMoveTime!).getTime()) / 1000);
          
          let whiteTime = game.whiteTime;
          let blackTime = game.blackTime;
          
          if (game.turn === 'w') {
            whiteTime = Math.max(0, whiteTime - elapsed);
          } else {
            blackTime = Math.max(0, blackTime - elapsed);
          }

          if (whiteTime === 0 || blackTime === 0) {
            await storage.setWinner(gameCode, whiteTime === 0 ? 'b' : 'w');
            const finalGame = await storage.getGame(gameCode);
            broadcast(gameCode, { type: 'game_state', game: finalGame });
            return;
          }

          const chess = new Chess(game.fen);
          try {
            const move = chess.move({
              from: message.from,
              to: message.to,
              promotion: message.promotion || 'q'
            });
            
            if (move) {
              let winner: 'w' | 'b' | 'draw' | undefined;
              if (chess.isCheckmate()) {
                winner = chess.turn() === 'w' ? 'b' : 'w';
              } else if (chess.isDraw()) {
                winner = 'draw';
              }

              const updatedGame = await storage.updateGameState(
                gameCode,
                chess.fen(),
                chess.pgn(),
                chess.turn(),
                { from: message.from, to: message.to },
                whiteTime,
                blackTime
              );

              if (winner) {
                await storage.setWinner(gameCode, winner);
              }

              const finalGame = await storage.getGame(gameCode);
              broadcast(gameCode, { type: 'game_state', game: finalGame });
            }
          } catch (e) {
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
        if (rooms.get(gameCode)!.size === 0) rooms.delete(gameCode);
      }
    });
  });

  function broadcast(code: string, message: any) {
    if (rooms.has(code)) {
      const payload = JSON.stringify(message);
      rooms.get(code)!.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      });
    }
  }

  return httpServer;
}
