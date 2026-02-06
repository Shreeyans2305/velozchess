import { Chessboard } from "react-chessboard";
import { type Square } from "chess.js";
import { useMemo } from "react";

interface ChessBoardProps {
  fen: string;
  onPieceDrop: (sourceSquare: Square, targetSquare: Square, piece: string) => boolean;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  isInteractable?: boolean;
  preMove?: { from: string; to: string } | null;
}

export function ChessBoard({ 
  fen, 
  onPieceDrop, 
  orientation = "white",
  lastMove,
  isInteractable = true,
  preMove
}: ChessBoardProps) {
  
  // Custom styling for squares based on last move
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    }
    if (preMove) {
      styles[preMove.from] = { backgroundColor: 'rgba(255, 0, 0, 0.4)' };
      styles[preMove.to] = { backgroundColor: 'rgba(255, 0, 0, 0.4)' };
    }
    return styles;
  }, [lastMove, preMove]);

  return (
    <div className="w-full max-w-[95vw] md:max-w-[700px] lg:max-w-[800px] aspect-square shadow-2xl shadow-black/50 rounded-lg overflow-hidden border-4 border-secondary/50">
      <Chessboard 
        position={fen} 
        onPieceDrop={onPieceDrop}
        boardOrientation={orientation}
        arePiecesDraggable={isInteractable}
        customDarkSquareStyle={{ backgroundColor: "#779556" }}
        customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
        customSquareStyles={customSquareStyles}
        animationDuration={200}
      />
    </div>
  );
}
