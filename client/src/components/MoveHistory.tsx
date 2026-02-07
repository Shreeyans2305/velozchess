import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

interface MoveHistoryProps {
    pgn: string;
}

export function MoveHistory({ pgn }: MoveHistoryProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Parse PGN into moves
    // Remove headers (content in square brackets) and comments
    const cleanPgn = pgn.replace(/\[.*?\]/g, "").replace(/\{.*?\}/g, "").trim();
    const moves = cleanPgn.split(/\d+\./).filter(Boolean).map(m => m.trim());

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [pgn]);

    return (
        <div className="flex flex-col h-full bg-card/50 rounded-sm border border-border overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-center">
                Move History
            </div>
            <ScrollArea className="flex-1 p-2" ref={scrollRef}>
                <div className="grid grid-cols-[3rem_1fr_1fr] gap-x-2 gap-y-1 text-sm font-mono">
                    <div className="font-bold text-muted-foreground text-xs text-right px-2 py-1 items-center flex justify-end border-b border-transparent">#</div>
                    <div className="font-medium text-muted-foreground text-xs px-2 py-1 items-center flex border-b border-transparent">WHITE</div>
                    <div className="font-medium text-muted-foreground text-xs px-2 py-1 items-center flex border-b border-transparent">BLACK</div>

                    {moves.map((moveChunk, index) => {
                        const parts = moveChunk.split(' ').filter(Boolean);
                        const whiteMove = parts[0] || '';
                        const blackMove = parts[1] || '';

                        // Checking simple result endings like "1-0"
                        const isWhiteResult = whiteMove === '1-0' || whiteMove === '0-1' || whiteMove === '1/2-1/2';
                        const isBlackResult = blackMove === '1-0' || blackMove === '0-1' || blackMove === '1/2-1/2';

                        if (isWhiteResult) return null; // Don't show result as a move row if it's the only thing

                        return (
                            <div key={index} className="contents group">
                                <div className="text-right text-muted-foreground/50 py-1 px-2 text-xs bg-muted/20 group-hover:bg-muted/40 rounded-l-sm flex items-center justify-end">
                                    {index + 1}.
                                </div>
                                <div className="py-1 px-2 group-hover:bg-muted/30 flex items-center">
                                    {whiteMove}
                                </div>
                                <div className="py-1 px-2 group-hover:bg-muted/30 rounded-r-sm flex items-center">
                                    {!isBlackResult ? blackMove : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
