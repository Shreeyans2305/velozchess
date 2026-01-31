import { useEffect, useRef, useState, useCallback } from "react";
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
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        // Remove listeners to avoid state updates on unmounted component
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendMove = (move: { from: string; to: string; promotion?: string }) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: MoveMessage = {
        type: "move",
        code: gameCode,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      };
      socketRef.current.send(JSON.stringify(message));
    } else {
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "Reconnecting to game server...",
      });
    }
  };

  return { isConnected, lastError, sendMove };
}

function getPlayerId() {
  let id = localStorage.getItem('chess_player_id');
  if (!id) {
    id = Math.random().toString(36).substring(7);
    localStorage.setItem('chess_player_id', id);
  }
  return id;
}
