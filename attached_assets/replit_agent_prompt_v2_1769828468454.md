# CRITICAL BUG FIX: WebSocket Reconnection Loop + Board Not Rendering

## PROBLEM SUMMARY
The game is stuck in a WebSocket reconnection loop, and the chess board does not render even though both players have joined and the game status is 'playing'. The console shows:
- "WebSocket connection to 'wss://...' failed: WebSocket is closed before the connection is established"
- Continuous "[WebSocket] Sending join message" spam
- Game state correctly shows: `{status: 'playing', whiteId: 'gxcg2w', blackId: 'mqz8o4', turn: 'w'}`
- But the board does NOT appear on screen

## ROOT CAUSES

### Issue 1: WebSocket Reconnection Loop
The WebSocket is failing to establish a connection and keeps trying to reconnect, creating an infinite loop of join messages.

### Issue 2: Board Not Rendering  
Even when the game state is correct, the board component is not being rendered. This suggests either:
- The `ChessBoard` component is failing to render
- The `isBoardVisible` condition is not being met
- There's an error in the ChessBoard component itself

## REQUIRED FIXES

### FIX 1: Stop WebSocket Reconnection Loop (CRITICAL)
**File:** `client/src/hooks/use-game-socket.ts`
**Lines:** 17-78

The issue is that the WebSocket `onclose` handler is triggering even when the connection never opened. Add a check to prevent reconnection during the initial connection attempt:

```typescript
const connect = useCallback(() => {
  // If already connected or connecting, don't start another one
  if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  console.log('[WebSocket] Attempting to connect to:', wsUrl);
  const socket = new WebSocket(wsUrl);
  socketRef.current = socket;
  
  let hasConnected = false; // Track if connection was ever successful

  socket.onopen = () => {
    console.log('[WebSocket] Connection opened successfully');
    hasConnected = true;
    setIsConnected(true);
    setLastError(null);
    
    // Ensure we only send if open (extra check for safety)
    if (socket.readyState === WebSocket.OPEN) {
      const joinMsg = { type: "join", code: gameCode, playerId: getPlayerId() };
      console.log('[WebSocket] Sending join message:', joinMsg);
      socket.send(JSON.stringify(joinMsg));
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', data);
      
      switch (data.type) {
        case "game_state":
          console.log('[WebSocket] Game state update:', {
            status: data.game.status,
            whiteId: data.game.whiteId,
            blackId: data.game.blackId,
            fen: data.game.fen
          });
          onGameStateUpdate(data.game);
          break;
        case "error":
          console.error('[WebSocket] Server error:', data.message);
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message,
          });
          break;
      }
    } catch (err) {
      console.error("Failed to parse WS message:", err);
    }
  };

  socket.onclose = (event) => {
    console.log('[WebSocket] Connection closed:', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean,
      hadConnected: hasConnected 
    });
    
    setIsConnected(false);
    
    // Only attempt reconnect if we had successfully connected before
    // This prevents infinite reconnection loops on initial connection failure
    if (hasConnected && !reconnectTimeoutRef.current) {
      console.log('[WebSocket] Will attempt reconnection in 2 seconds');
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, 2000);
    } else if (!hasConnected) {
      console.error('[WebSocket] Initial connection failed - not attempting reconnect');
      setLastError("Failed to connect to game server");
    }
  };

  socket.onerror = (e) => {
    console.error('[WebSocket] Error occurred:', e);
    setLastError("Connection error");
  };
}, [gameCode, onGameStateUpdate, toast]);
```

### FIX 2: Fix Board Rendering Condition
**File:** `client/src/pages/GameRoom.tsx`
**Line:** 77

Change the board visibility condition to be more explicit:

```typescript
// Add extensive logging first
console.log('[GameRoom] Board visibility check:', {
  gameStatus: game?.status,
  whiteId: game?.whiteId,
  blackId: game?.blackId,
  hasBothPlayers: !!(game?.whiteId && game?.blackId),
  fen: game?.fen
});

const isBoardVisible = 
  game?.status === 'playing' || 
  game?.status === 'checkmate' || 
  game?.status === 'draw' ||
  (game?.whiteId && game?.blackId); // Show board when both players present

console.log('[GameRoom] isBoardVisible result:', isBoardVisible);
```

### FIX 3: Check ChessBoard Component Rendering
**File:** `client/src/components/ChessBoard.tsx`

Add logging at the very beginning of the ChessBoard component to ensure it's being called:

```typescript
export function ChessBoard({ fen, onPieceDrop, orientation, lastMove, isInteractable }: Props) {
  console.log('[ChessBoard] Rendering with props:', {
    fen,
    orientation,
    lastMove,
    isInteractable,
    hasOnPieceDrop: !!onPieceDrop
  });
  
  // ... rest of component code
}
```

### FIX 4: Add Error Boundary Around ChessBoard
**File:** `client/src/pages/GameRoom.tsx`
**Around line 151**

Wrap the ChessBoard in a try-catch to see if it's throwing errors:

```typescript
<div className="order-1 md:order-2">
  {isBoardVisible ? (
    <>
      {(() => {
        try {
          console.log('[GameRoom] Attempting to render ChessBoard');
          return (
            <ChessBoard 
              fen={game.fen} 
              onPieceDrop={onPieceDrop}
              orientation={role === 'b' ? 'black' : 'white'}
              lastMove={lastMove}
              isInteractable={game.status === 'playing'}
            />
          );
        } catch (error) {
          console.error('[GameRoom] Error rendering ChessBoard:', error);
          return (
            <div className="text-red-500 p-4 border border-red-500 rounded">
              Error rendering chess board: {String(error)}
            </div>
          );
        }
      })()}
    </>
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

### FIX 5: Check if ChessBoard Component Exists
**File:** Verify the file exists at `client/src/components/ChessBoard.tsx`

If the ChessBoard component is missing or has errors, create a simple fallback:

```typescript
// In GameRoom.tsx, add a fallback check
import { ChessBoard } from "@/components/ChessBoard";

// After imports, add:
if (!ChessBoard) {
  console.error('[GameRoom] ChessBoard component is not properly imported!');
}
```

### FIX 6: Temporary Debug Board
**File:** `client/src/pages/GameRoom.tsx`

Replace the ChessBoard temporarily with a simple div to verify rendering logic works:

```typescript
{isBoardVisible ? (
  <div className="w-full max-w-[600px] aspect-square bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
    BOARD SHOULD RENDER HERE
    <br />
    Status: {game.status}
    <br />
    White: {game.whiteId}
    <br />
    Black: {game.blackId}
  </div>
) : (
  // ... waiting screen
)}
```

If this green div appears, the problem is in the ChessBoard component itself.
If it doesn't appear, the problem is in the visibility logic.

## TESTING SEQUENCE

1. **Clear browser cache and localStorage** (important!)
2. **Open browser console** in both player windows
3. **Player 1:** Create game - watch console logs
4. **Player 2:** Join game with code - watch console logs
5. **Check console for:**
   - "[WebSocket] Connection opened successfully"
   - "[GameRoom] Board visibility check" logs
   - "[GameRoom] isBoardVisible result: true"
   - "[GameRoom] Attempting to render ChessBoard"
   - "[ChessBoard] Rendering with props"

6. **If green debug div appears:** Problem is in ChessBoard component
7. **If green div doesn't appear:** Problem is in visibility logic

## EXPECTED CONSOLE OUTPUT (Success)
```
[WebSocket] Attempting to connect to: wss://...
[WebSocket] Connection opened successfully
[WebSocket] Sending join message: {type: 'join', code: 'PSZK', playerId: 'xxx'}
[WebSocket] Received message: {type: 'game_state', game: {...}}
[WebSocket] Game state update: {status: 'playing', whiteId: 'xxx', blackId: 'yyy'}
[GameRoom] Game state updated: {status: 'playing', whiteId: 'xxx', blackId: 'yyy', turn: 'w'}
[GameRoom] Board visibility check: {gameStatus: 'playing', hasBothPlayers: true, ...}
[GameRoom] isBoardVisible result: true
[GameRoom] Attempting to render ChessBoard
[ChessBoard] Rendering with props: {fen: '...', orientation: 'white', ...}
```

## PRIORITY ORDER

1. **FIRST:** Implement FIX 1 (stop WebSocket loop)
2. **SECOND:** Implement FIX 6 (temporary debug board) to diagnose where the issue is
3. **THIRD:** Implement FIX 2 (board visibility logging)
4. **FOURTH:** Based on results, implement remaining fixes

## ADDITIONAL CHECK - Server Logs

Check the Replit server console for any errors when players join. The server should log:
```
[WebSocket] Player joined game PSZK: {whiteId: 'xxx', blackId: 'yyy', status: 'playing'}
```

If you don't see this, the problem might be server-side.

Start with FIX 1 and FIX 6, then report back what you see in the console!
