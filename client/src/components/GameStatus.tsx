import { Game } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Crown, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameStatusProps {
  game: Game;
  playerRole: 'w' | 'b' | 'spectator';
}

export function GameStatus({ game, playerRole }: GameStatusProps) {
  let statusText = "";
  let statusColor = "bg-secondary";
  let Icon = Clock;

  // Determine status message and styling
  if (game.status === 'waiting') {
    statusText = "Waiting for opponent...";
    statusColor = "bg-yellow-500/20 text-yellow-500 border-yellow-500/20";
    Icon = Clock;
  } else if (game.status === 'checkmate') {
    const winnerName = game.winner === 'w' ? "White" : "Black";
    const won = (game.winner === playerRole);
    statusText = won ? "Victory! Checkmate." : `Checkmate. ${winnerName} wins!`;
    statusColor = won 
      ? "bg-green-500/20 text-green-500 border-green-500/20"
      : "bg-red-500/20 text-red-500 border-red-500/20";
    Icon = Crown;
  } else if (game.status === 'draw') {
    statusText = "Game Over. Draw.";
    statusColor = "bg-secondary text-muted-foreground";
    Icon = AlertTriangle;
  } else if (game.status === 'aborted') {
    statusText = "Game Aborted";
    statusColor = "bg-destructive/20 text-destructive";
    Icon = AlertTriangle;
  } else {
    // Playing state
    const isMyTurn = game.turn === playerRole;
    if (playerRole === 'spectator') {
      statusText = `${game.turn === 'w' ? "White" : "Black"}'s Turn`;
      statusColor = "bg-blue-500/20 text-blue-500 border-blue-500/20";
    } else {
      statusText = isMyTurn ? "Your Turn" : "Opponent's Turn";
      statusColor = isMyTurn
        ? "bg-green-500/20 text-green-500 border-green-500/20"
        : "bg-secondary text-muted-foreground";
      Icon = isMyTurn ? CheckCircle2 : Clock;
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500",
      statusColor
    )}>
      <Icon className="w-5 h-5" />
      <span className="font-semibold font-display text-lg tracking-wide">
        {statusText}
      </span>
    </div>
  );
}
