import { useEffect, useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { Chess, type Square } from "chess.js";
import { fetchGame } from "@/hooks/use-games";
import { useGameSocket } from "@/hooks/use-game-socket";
import { ChessBoard } from "@/components/ChessBoard";
import { GameStatus } from "@/components/GameStatus";
import { CopyCode } from "@/components/CopyCode";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, WifiOff, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Game } from "@shared/schema";

export default function GameRoom() {
  const [, params] = useRoute("/game/:code");
  const [, setLocation] = useLocation();
  const code = params?.code!;
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'w' | 'b' | 'spectator'>('spectator');

  const chess = useMemo(() => new Chess(), []);

  useEffect(() => {
    if (!code) return;

    const storedRole = sessionStorage.getItem(`game_role_${code}`);
    if (storedRole) setRole(storedRole as any);

    fetchGame(code)
      .then((data) => {
        setGame(data);
        chess.load(data.fen);
        setLoading(false);
      })
      .catch(() => {
        setLocation("/");
      });
  }, [code, chess, setLocation]);

  const { isConnected, sendMove } = useGameSocket({
    gameCode: code,
    onGameStateUpdate: (updatedGame) => {
      console.log('[GameRoom] Game state updated:', {
        status: updatedGame.status,
        whiteId: updatedGame.whiteId,
        blackId: updatedGame.blackId,
        turn: updatedGame.turn
      });
      setGame(updatedGame);
      chess.load(updatedGame.fen);
    },
  });

  const onPieceDrop = (sourceSquare: Square, targetSquare: Square, piece: string) => {
    if (!game) return false;
    if (game.turn !== role) return false;
    if (game.status !== 'playing') return false; 

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1].toLowerCase() ?? "q",
      });

      if (!move) return false;

      sendMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      return true;
    } catch (e) {
      return false;
    }
  };

  const isBoardVisible = 
    game?.status === 'playing' || 
    game?.status === 'checkmate' || 
    game?.status === 'draw' ||
    (!!game?.whiteId && !!game?.blackId);

  if (loading || !game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
        <Skeleton className="w-[300px] h-[300px] rounded-lg" />
        <div className="space-y-2 w-full max-w-xs">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  const lastMove = game.lastMove as { from: string; to: string } | null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background relative">
      <AnimatePresence>
        {!isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-2 text-center text-sm font-medium z-50 flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4" />
            Connection lost. Reconnecting...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-center md:items-start justify-center mt-4 md:mt-12">
        <div className="w-full md:w-64 flex flex-col gap-6 order-2 md:order-1">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="font-bold text-xl">Game Room</h2>
          </div>

          <GameStatus game={game} playerRole={role} />


          <div className="space-y-3">
            <div className={`p-4 rounded-xl border ${game.turn === 'w' ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}>
              <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1 flex justify-between">
                <span>White</span>
                <span className="font-mono">{Math.floor(game.whiteTime / 60)}:{(game.whiteTime % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                {game.whiteId ? (role === 'w' ? "You" : "Opponent") : "Waiting..."}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${game.turn === 'b' ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}>
              <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1 flex justify-between">
                <span>Black</span>
                <span className="font-mono">{Math.floor(game.blackTime / 60)}:{(game.blackTime % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-black border border-white/20" />
                {game.blackId ? (role === 'b' ? "You" : "Opponent") : "Waiting..."}
              </div>
            </div>
          </div>

          {game.status === 'waiting' && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-xl border border-white/5">
              <CopyCode code={game.code} />
            </div>
          )}
        </div>

        <div className="order-1 md:order-2">
          {isBoardVisible ? (
            <ChessBoard 
              fen={game.fen} 
              onPieceDrop={onPieceDrop}
              orientation={role === 'b' ? 'black' : 'white'}
              lastMove={lastMove}
              isInteractable={game.status === 'playing'}
            />
          ) : (
            <div className="w-full max-w-[90vw] md:max-w-[600px] aspect-square flex flex-col items-center justify-center bg-card rounded-lg border-4 border-dashed border-muted-foreground/20">
              <Crown className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-medium">Waiting for opponent to join...</p>
              <div className="mt-6">
                <CopyCode code={game.code} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
