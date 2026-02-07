import { useEffect, useState, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { Chess, type Square } from "chess.js";
import { fetchGame } from "@/hooks/use-games";
import { useGameSocket } from "@/hooks/use-game-socket";
import { ChessBoard } from "@/components/ChessBoard";
import { GameStatus } from "@/components/GameStatus";
import { MaterialCount } from "@/components/MaterialCount";
import { CopyCode } from "@/components/CopyCode";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DrawOfferDialog } from "@/components/DrawOfferDialog";
import { MoveHistory } from "@/components/MoveHistory";
import { useToastNotification } from "@/components/ToastNotification";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, WifiOff, Crown, Copy, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Game } from "@shared/schema";

export default function GameRoom() {
  const [, params] = useRoute("/game/:code");
  const [, setLocation] = useLocation();
  const code = params?.code!;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'w' | 'b' | 'spectator'>('spectator');
  const [liveWhiteTime, setLiveWhiteTime] = useState(game?.timeControl || 600);
  const [liveBlackTime, setLiveBlackTime] = useState(game?.timeControl || 600);
  const [preMove, setPreMove] = useState<{ from: Square, to: Square } | null>(null);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [drawOfferCount, setDrawOfferCount] = useState(0);
  const { showToast, ToastComponent } = useToastNotification();

  const chess = useMemo(() => new Chess(), []);

  const handleGameStateUpdate = useCallback((updatedGame: Game) => {
    setGame(updatedGame);
    chess.load(updatedGame.fen);

    // Show draw dialog if opponent offered draw
    if (updatedGame.drawOfferedBy && updatedGame.drawOfferedBy !== role) {
      setShowDrawDialog(true);
    } else {
      setShowDrawDialog(false);
    }
  }, [chess, role]);

  const { isConnected, sendMove, sendMessage } = useGameSocket({
    gameCode: code,
    onGameStateUpdate: handleGameStateUpdate,
  });

  // Execute pre-move when turn changes
  useEffect(() => {
    if (!game || !preMove || game.turn !== role || game.status !== 'playing') return;

    try {
      const move = chess.move({
        from: preMove.from,
        to: preMove.to,
        promotion: "q",
      });

      if (move) {
        sendMove({
          from: preMove.from,
          to: preMove.to,
          promotion: "q",
        });
      }
    } catch (e) {
      console.error('[PreMove] Invalid pre-move:', e);
    }

    setPreMove(null);
  }, [game?.turn, game?.status, role]);

  // Initialize timers from game's custom time control
  useEffect(() => {
    if (game && game.timeControl) {
      setLiveWhiteTime(game.whiteTime);
      setLiveBlackTime(game.blackTime);
    }
  }, [game?.timeControl, game?.whiteTime, game?.blackTime]);


  useEffect(() => {
    if (!game || game.status !== 'playing') return;

    setLiveWhiteTime(game.whiteTime);
    setLiveBlackTime(game.blackTime);

    const interval = setInterval(() => {
      if (game.turn === 'w') {
        setLiveWhiteTime(prev => Math.max(0, prev - 1));
      } else {
        setLiveBlackTime(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.whiteTime, game?.blackTime, game?.turn, game?.status]);

  // Handle Escape key to cancel pre-move
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && game?.status === 'playing') {
        setPreMove(null);
        console.log('[PreMove] Cleared pre-move via Escape key');
      }
    };


    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game?.status]);

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

  const onPieceDrop = (sourceSquare: Square, targetSquare: Square, piece: string) => {
    if (!game) return false;
    if (game.status !== "playing") return false;

    if (game.turn !== role) {
      // Set single pre-move
      setPreMove({ from: sourceSquare, to: targetSquare });
      return true;
    }

    // Clear pre-move when making actual move
    setPreMove(null);

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

  const handleResign = async () => {
    if (!game || game.status !== 'playing') return;
    try {
      const response = await fetch(`/api/games/${game.code}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: localStorage.getItem('chess_player_id') || '', role }),
      });
      if (!response.ok) throw new Error('Failed to resign');
      setShowResignDialog(false);
    } catch (error) {
      console.error('Resign error:', error);
      setShowResignDialog(false);
    }
  };

  const handleCopyPGN = async () => {
    if (!game?.pgn) return;
    try {
      await navigator.clipboard.writeText(game.pgn);
      showToast('PGN copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy PGN:', error);
      showToast('Failed to copy PGN');
    }
  };

  const handleAbort = async () => {
    if (!game || game.status !== 'waiting') return;
    const confirmed = window.confirm('Abort this game?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/games/${game.code}/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: localStorage.getItem('chess_player_id') || '' }),
      });
      if (!response.ok) throw new Error('Failed to abort');
      setLocation('/');
    } catch (error) {
      console.error('Abort error:', error);
    }
  };

  // Draw offer handlers
  const handleOfferDraw = () => {
    if (!game || game.status !== 'playing' || !sendMessage) return;
    if (drawOfferCount >= 2) {
      showToast('You can only offer a draw 2 times per game');
      return;
    }
    sendMessage({ type: 'offer_draw', code: game.code, player: role });
    setDrawOfferCount(prev => prev + 1);
  };

  const handleAcceptDraw = () => {
    if (!game || !sendMessage) return;
    sendMessage({ type: 'accept_draw', code: game.code });
    setShowDrawDialog(false);
  };

  const handleDeclineDraw = () => {
    if (!game || !sendMessage) return;
    sendMessage({ type: 'decline_draw', code: game.code });
    setShowDrawDialog(false);
  };

  const isBoardVisible =
    game?.status === "playing" ||
    game?.status === "checkmate" ||
    game?.status === "draw" ||
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
    <div className="min-h-screen flex flex-col items-center justify-center p-2 bg-background relative font-body selection:bg-accent selection:text-white">
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-3 text-center text-xs uppercase tracking-widest font-medium z-50 flex items-center justify-center gap-2"
          >
            <WifiOff className="w-3 h-3" />
            Connection lost. Reconnecting...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full max-w-[98vw] relative flex flex-col lg:flex-row gap-4 lg:gap-8 items-center justify-center">
        {/* Back Button - Absolute on desktop, relative flow on mobile? strict absolute is cleaner */}
        <div className="absolute top-2 left-2 z-10">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest hidden sm:inline">Back</span>
          </Button>
        </div>

        {/* Main Game Area */}
        <div className="relative w-full flex-1 flex flex-col items-center justify-center min-h-0">
          {/* Top Player (Opponent) HUD */}
          <div className="w-full max-w-[min(98vw,80vh)] flex justify-between items-end mb-2 px-1">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${game?.turn === (role === 'w' ? 'b' : 'w') ? 'bg-primary animate-pulse shadow-[0_0_10px_theme(colors.primary.DEFAULT)]' : 'bg-muted-foreground/30'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  {role === 'spectator' ? 'Black' : 'Opponent'}
                </span>
                <span className="text-sm font-medium">
                  {role === 'spectator' ? (game?.blackId ? 'Joined' : 'Waiting...') : (game?.blackId ? 'Online' : 'Waiting...')}
                </span>
              </div>
            </div>
            <div className={`font-mono text-4xl font-bold tracking-wider px-3 py-1 rounded-sm bg-card border border-border/50 shadow-sm ${game?.turn === (role === 'w' ? 'b' : 'w') ? 'text-primary border-primary/20' : 'text-muted-foreground opacity-80'}`}>
              {Math.floor((role === 'w' ? liveBlackTime : liveWhiteTime) / 60)}:
              {((role === 'w' ? liveBlackTime : liveWhiteTime) % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {/* Chess Board */}
          <div className="relative flex-1 w-full flex justify-center items-center">
            {isBoardVisible ? (
              <ChessBoard
                fen={game?.fen || ''}
                onPieceDrop={onPieceDrop}
                orientation={role === "b" ? "black" : "white"}
                lastMove={lastMove}
                isInteractable={game?.status === "playing"}
                preMove={preMove}
              />
            ) : (
              <div className="w-full max-w-[min(98vw,80vh)] aspect-square flex flex-col items-center justify-center bg-card/50 rounded-sm border border-border">
                <img src="/waiting.png" alt="Waiting..." className="w-1/2 h-1/2 object-contain mb-8 animate-pulse" />
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">Waiting for opponent...</p>
                <div className="mt-8">
                  <CopyCode code={game?.code || ''} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player (You) HUD */}
          <div className="w-full max-w-[min(98vw,80vh)] flex justify-between items-start mt-2 px-1">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${game?.turn === role ? 'bg-primary animate-pulse shadow-[0_0_10px_theme(colors.primary.DEFAULT)]' : 'bg-muted-foreground/30'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  {role === 'spectator' ? 'White' : 'You'}
                </span>
                <span className="text-sm font-medium">
                  {localStorage.getItem('chess_username') || 'Guest'}
                </span>
              </div>
            </div>
            <div className={`font-mono text-4xl font-bold tracking-wider px-3 py-1 rounded-sm bg-card border border-border/50 shadow-sm ${game?.turn === role ? 'text-primary border-primary/20' : 'text-muted-foreground opacity-80'}`}>
              {Math.floor((role === 'w' ? liveWhiteTime : liveBlackTime) / 60)}:
              {((role === 'w' ? liveWhiteTime : liveBlackTime) % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Right/Bottom Controls */}
        <div className="w-full lg:w-72 flex flex-col gap-4 self-stretch lg:py-8 lg:pr-8 min-h-[300px]">

          {/* Move History - Takes available space */}
          <div className="flex-1 min-h-[200px] shadow-sm">
            <MoveHistory pgn={game?.pgn || ''} />
          </div>

          <div className="flex flex-col gap-4 flex-shrink-0">
            {/* Material Count (Minimal) */}
            <div className="opacity-70 px-1">
              <MaterialCount fen={game?.fen || ''} />
            </div>

            {/* Game Status Message */}
            <div className="min-h-[40px]">
              <GameStatus game={game} playerRole={role} />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {game?.status === 'waiting' && (
                <div className="p-4 bg-secondary/20 border border-border rounded-sm text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Game Code</p>
                  <CopyCode code={game.code} />
                </div>
              )}

              {game?.status === 'playing' && role !== 'spectator' && (
                <>
                  <Button variant="outline" className="w-full h-12 text-xs uppercase tracking-widest border-border hover:bg-secondary/50 rounded-sm" onClick={handleOfferDraw} disabled={!!game.drawOfferedBy}>
                    {game.drawOfferedBy === role ? 'Draw Offered' : 'Offer Draw'}
                  </Button>
                  <Button variant="ghost" className="w-full h-12 text-xs uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/5 rounded-sm" onClick={() => setShowResignDialog(true)}>
                    Resign Game
                  </Button>
                </>
              )}

              {(game?.status === 'checkmate' || game?.status === 'draw' || game?.status === 'aborted') && game.pgn && (
                <Button variant="outline" className="w-full h-12 text-xs uppercase tracking-widest gap-2 rounded-sm border-border hover:bg-secondary/50" onClick={handleCopyPGN}>
                  <Copy className="w-3 h-3" />
                  Copy PGN
                </Button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Resign Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResignDialog}
        title="Resign Game"
        message="Are you sure you want to resign?"
        confirmText="Confirm Resign"
        cancelText="Cancel"
        onConfirm={handleResign}
        onCancel={() => setShowResignDialog(false)}
      />

      <DrawOfferDialog
        open={showDrawDialog}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
      />
      {ToastComponent}
    </div>
  );
}

