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
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setLastError(null);
      socket.send(JSON.stringify({ type: "join", code: gameCode, playerId: getPlayerId() }));
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "game_state":
            onGameStateUpdate(data.game);
            break;
          case "error":
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

    socket.onclose = () => {
      setIsConnected(false);
      // Attempt reconnect after 2 seconds
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 2000);
      }
    };

    socket.onerror = () => {
      setLastError("Connection error");
    };
  }, [gameCode, onGameStateUpdate, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close();
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
