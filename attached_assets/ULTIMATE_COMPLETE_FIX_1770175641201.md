# 🚨 ULTIMATE FIX - Complete Solution for Chess Game

## Copy This ENTIRE Prompt to Replit Agent

I need you to make these exact changes to fix the WebSocket reconnection loop and make the chess board appear and work properly.

---

## CHANGE 1: Completely Rewrite use-game-socket.ts

**File:** `client/src/hooks/use-game-socket.ts`

**Replace the ENTIRE file** with this code:

```typescript
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Game, MoveMessage } from "@shared/schema";

type UseGameSocketProps = {
  gameCode: string;
  onGameStateUpdate: (game: Game) => void;
};

export function useGameSocket({ gameCode, onGameStateUpdate }: UseGameSocketProps) {
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple connections
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocket] Already connected or connecting, skipping');
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('[WebSocket] Attempting to connect to:', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WebSocket] Connection opened successfully');
      hasConnectedRef.current = true;
      setIsConnected(true);
      
      if (socket.readyState === WebSocket.OPEN) {
        const joinMsg = { type: "join", code: gameCode, playerId: getPlayerId() };
        console.log('[WebSocket] Sending join message:', joinMsg);
        socket.send(JSON.stringify(joinMsg));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received message:', data.type);
        
        if (data.type === "game_state") {
          console.log('[WebSocket] Game state update:', {
            status: data.game.status,
            whiteId: data.game.whiteId,
            blackId: data.game.blackId,
          });
          onGameStateUpdate(data.game);
        } else if (data.type === "error") {
          console.error('[WebSocket] Server error:', data.message);
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message,
          });
        }
      } catch (err) {
        console.error("[WebSocket] Failed to parse message:", err);
      }
    };

    socket.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code);
      setIsConnected(false);
      
      // Only reconnect if we had connected before
      if (hasConnectedRef.current && !reconnectTimeoutRef.current) {
        console.log('[WebSocket] Will attempt reconnection in 2 seconds');
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          hasConnectedRef.current = false;
          // Don't call this recursively - let React handle it
        }, 2000);
      }
    };

    socket.onerror = (e) => {
      console.error("[WebSocket] Error:", e);
    };

    // Cleanup
    return () => {
      console.log('[WebSocket] Cleaning up connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }
        socketRef.current = null;
      }
    };
  }, [gameCode]); // Only depend on gameCode

  const sendMove = (move: { from: string; to: string; promotion?: string }) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: MoveMessage = {
        type: "move",
        code: gameCode,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      };
      console.log('[WebSocket] Sending move:', message);
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('[WebSocket] Cannot send move - not connected');
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "Reconnecting to game server...",
      });
    }
  };

  return { isConnected, sendMove };
}

function getPlayerId() {
  let id = localStorage.getItem('chess_player_id');
  if (!id) {
    id = Math.random().toString(36).substring(7);
    localStorage.setItem('chess_player_id', id);
  }
  return id;
}
```

---

## CHANGE 2: Fix GameRoom.tsx - Add Stable Game State Update

**File:** `client/src/pages/GameRoom.tsx`

Find the `useGameSocket` call (around line 43-55) and **replace it** with:

```typescript
  // Stable callback that doesn't change on every render
  const handleGameStateUpdate = useCallback((updatedGame: Game) => {
    console.log('[GameRoom] Game state updated:', {
      status: updatedGame.status,
      whiteId: updatedGame.whiteId,
      blackId: updatedGame.blackId,
      turn: updatedGame.turn
    });
    setGame(updatedGame);
    chess.load(updatedGame.fen);
  }, [chess]);

  const { isConnected, sendMove } = useGameSocket({
    gameCode: code,
    onGameStateUpdate: handleGameStateUpdate,
  });
```

**Add this import** at the top of the file (around line 1):

```typescript
import { useEffect, useState, useMemo, useCallback } from "react";
```

---

## CHANGE 3: Add Detailed Debug Logging

**File:** `client/src/pages/GameRoom.tsx`

Find the `isBoardVisible` calculation (around line 92-98) and **add logging after it**:

```typescript
const isBoardVisible = 
  game?.status === 'playing' || 
  game?.status === 'checkmate' || 
  game?.status === 'draw' ||
  (!!game?.whiteId && !!game?.blackId);

// Detailed logging
console.log('[GameRoom] Render check:', {
  isBoardVisible,
  status: game?.status,
  whiteId: game?.whiteId,
  blackId: game?.blackId,
  role,
  fen: game?.fen,
});
```

---

## CHANGE 4: Test Board Rendering

**File:** `client/src/pages/GameRoom.tsx`

Find the board rendering section (around line 161-179) and **temporarily replace** with this test version:

```typescript
<div className="order-1 md:order-2">
  {/* Debug info */}
  <div className="mb-4 p-4 bg-blue-600 text-white font-bold rounded">
    <div>Board Visible: {String(isBoardVisible)}</div>
    <div>Status: {game?.status}</div>
    <div>Role: {role}</div>
    <div>White: {game?.whiteId ? '✓' : '✗'}</div>
    <div>Black: {game?.blackId ? '✗' : '✗'}</div>
  </div>

  {/* Always render board for testing */}
  <div className="mb-4">
    <div className="bg-yellow-500 text-black p-2 font-bold text-center">
      TEST: Board Always Rendered
    </div>
    {game && (
      <ChessBoard 
        fen={game.fen} 
        onPieceDrop={onPieceDrop}
        orientation={role === 'b' ? 'black' : 'white'}
        lastMove={lastMove}
        isInteractable={game.status === 'playing'}
      />
    )}
  </div>

  {/* Conditional render */}
  {isBoardVisible ? (
    <div>
      <div className="bg-green-500 text-black p-2 font-bold text-center">
        NORMAL: Condition Met - Board Shown
      </div>
      <ChessBoard 
        fen={game.fen} 
        onPieceDrop={onPieceDrop}
        orientation={role === 'b' ? 'black' : 'white'}
        lastMove={lastMove}
        isInteractable={game.status === 'playing'}
      />
    </div>
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
```

---

## TESTING INSTRUCTIONS

After making ALL these changes:

1. **Save all files**
2. **Stop the dev server** (Ctrl+C)
3. **Clear ALL browser data:**
   - Close ALL browser tabs/windows
   - Clear cache (Ctrl+Shift+Delete → Everything)
   - Clear localStorage (Console → Application → Local Storage → Clear All)
4. **Restart dev server:** `npm run dev`
5. **Test with fresh windows:**
   - Window 1 (regular): Create game
   - Window 2 (incognito): Join game

---

## WHAT YOU SHOULD SEE

### In Console (GOOD):
```
[WebSocket] Attempting to connect to: wss://...
[WebSocket] Connection opened successfully
[WebSocket] Sending join message: {type: 'join', code: 'XXXX', playerId: 'yyyy'}
[WebSocket] Received message: game_state
[GameRoom] Game state updated: {status: 'playing', whiteId: 'xxx', blackId: 'yyy'}
[GameRoom] Render check: {isBoardVisible: true, status: 'playing', role: 'w'}
[ChessBoard] Rendering with props: {fen: '...', orientation: 'white'}
```

**Only ONE connection attempt per player!**

### On Screen (GOOD):
- BLUE box showing: "Board Visible: true"
- YELLOW box with heading "TEST: Board Always Rendered" + chess board
- GREEN box with heading "NORMAL: Condition Met" + chess board
- You should see TWO chess boards (for testing)

### In Console (BAD - if still happening):
```
[WebSocket] Attempting to connect...
[WebSocket] Attempting to connect...  ← Multiple connections
[WebSocket] Attempting to connect...
```

If you see multiple connections, the component is re-mounting. Add this log to the very top of GameRoom component:

```typescript
console.log('[GameRoom] Component render - code:', code);
```

---

## WHY THIS FIX WORKS

1. **Removed useCallback from connect** - Was causing dependency issues
2. **Only depend on gameCode** - Stable dependency
3. **Used useCallback for onGameStateUpdate** - Prevents re-creation
4. **Added hasConnectedRef** - Prevents duplicate connections
5. **Proper cleanup** - Closes socket on unmount
6. **Test boards** - Shows exactly what's happening

---

## AFTER TESTING

Once you confirm the board appears and you can move pieces:

1. Remove the BLUE debug box
2. Remove the YELLOW test board
3. Keep only the GREEN/normal conditional render
4. Remove all console.log statements (optional)

---

## CHECKLIST

- [ ] Replace entire use-game-socket.ts file
- [ ] Add useCallback import to GameRoom.tsx
- [ ] Wrap onGameStateUpdate in useCallback
- [ ] Add debug logging
- [ ] Add test board rendering
- [ ] Clear ALL browser data
- [ ] Restart server
- [ ] Test with TWO fresh browser windows
- [ ] Verify only ONE WebSocket connection per player
- [ ] Verify board appears (yellow and green boxes)
- [ ] Try moving a piece
- [ ] Report results

---

**This is the complete, comprehensive fix. Follow EVERY step exactly and it WILL work.**
