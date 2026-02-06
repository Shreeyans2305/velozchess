import { useMemo } from 'react';

interface MaterialCountProps {
  fen: string;
}

const PIECE_VALUES: Record<string, number> = {
  'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
  'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9,
};

const PIECE_SYMBOLS: Record<string, string> = {
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛',
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕',
};

export function MaterialCount({ fen }: MaterialCountProps) {
  const material = useMemo(() => {
    const position = fen.split(' ')[0];
    const pieces = position.replace(/[/\d]/g, '');
    
    let whiteValue = 0;
    let blackValue = 0;
    const whitePieces: string[] = [];
    const blackPieces: string[] = [];
    
    for (const piece of pieces) {
      const value = PIECE_VALUES[piece] || 0;
      if (piece === piece.toUpperCase()) {
        whiteValue += value;
        if (piece !== 'K') whitePieces.push(piece);
      } else {
        blackValue += value;
        if (piece !== 'k') blackPieces.push(piece);
      }
    }
    
    const diff = whiteValue - blackValue;
    
    // Count captured pieces
    const capturedByWhite: Record<string, number> = {};
    const capturedByBlack: Record<string, number> = {};
    
    // Standard starting material
    const startPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    
    for (const [piece, count] of Object.entries(startPieces)) {
      const upperPiece = piece.toUpperCase();
      const whiteCount = whitePieces.filter(p => p === upperPiece).length;
      const blackCount = blackPieces.filter(p => p === piece).length;
      
      const whiteMissing = count - whiteCount;
      const blackMissing = count - blackCount;
      
      if (whiteMissing > 0) capturedByBlack[piece] = whiteMissing;
      if (blackMissing > 0) capturedByWhite[upperPiece] = blackMissing;
    }
    
    return { diff, capturedByWhite, capturedByBlack };
  }, [fen]);
  
  if (material.diff === 0 && Object.keys(material.capturedByWhite).length === 0 && Object.keys(material.capturedByBlack).length === 0) return null;
  
  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] text-muted-foreground uppercase mr-1">Captured by White:</span>
        {Object.entries(material.capturedByWhite).map(([piece, count]) => (
          <span key={piece} className="text-sm opacity-80">{PIECE_SYMBOLS[piece].repeat(count)}</span>
        ))}
        {material.diff > 0 && <span className="text-xs font-bold text-green-500 ml-1">+{material.diff}</span>}
      </div>
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] text-muted-foreground uppercase mr-1">Captured by Black:</span>
        {Object.entries(material.capturedByBlack).map(([piece, count]) => (
          <span key={piece} className="text-sm opacity-80">{PIECE_SYMBOLS[piece].repeat(count)}</span>
        ))}
        {material.diff < 0 && <span className="text-xs font-bold text-green-500 ml-1">+{Math.abs(material.diff)}</span>}
      </div>
    </div>
  );
}
