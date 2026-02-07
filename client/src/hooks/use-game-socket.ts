import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Game, MoveMessage } from "@shared/schema";
import { WS_BASE_URL } from "@/lib/config";

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

  const onGameStateUpdateRef = useRef(onGameStateUpdate);

  useEffect(() => {
    onGameStateUpdateRef.current = onGameStateUpdate;
  }, [onGameStateUpdate]);

  useEffect(() => {
    // Prevent multiple connections
    if (socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocket] Already connected or connecting, skipping');
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    let baseUrl = WS_BASE_URL || `${protocol}//${host}`;

    // Ensure clean URL construction with /ws path to match server
    baseUrl = baseUrl.replace(/\/$/, "");
    if (!baseUrl.endsWith("/ws")) {
      baseUrl += "/ws";
    }
    const wsUrl = baseUrl;

    console.log('[WebSocket] Attempting to connect to:', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      hasConnectedRef.current = true;
      setIsConnected(true);

      if (socket.readyState === WebSocket.OPEN) {
        const joinMsg = { type: "join", code: gameCode, playerId: getPlayerId() };
        socket.send(JSON.stringify(joinMsg));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "game_state") {
          if (onGameStateUpdateRef.current) {
            onGameStateUpdateRef.current(data.game);
          }
        } else if (data.type === "error") {
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
      setIsConnected(false);

      // Only reconnect if we had connected before
      if (hasConnectedRef.current && !reconnectTimeoutRef.current) {
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

  return { isConnected, sendMove, sendMessage: (message: any) => { if (socketRef.current?.readyState === WebSocket.OPEN) { socketRef.current.send(JSON.stringify(message)); } } };
}

function getPlayerId() {
  let id = localStorage.getItem('chess_player_id');
  if (!id) {
    id = Math.random().toString(36).substring(7);
    localStorage.setItem('chess_player_id', id);
  }
  return id;
}
