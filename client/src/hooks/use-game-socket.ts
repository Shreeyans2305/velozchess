import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Game, MoveMessage } from "@shared/schema";
import { Chess } from "chess.js";

type UseGameSocketProps = {
  gameCode: string;
  onGameStateUpdate: (game: Game) => void;
};

export function useGameSocket({ gameCode, onGameStateUpdate }: UseGameSocketProps) {
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const connect = useCallback(() => {
    // Determine protocol (ws or wss) based on current window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setLastError(null);
      // Join the game room immediately upon connection
      socket.send(JSON.stringify({ type: "join", code: gameCode }));
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
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Simple reconnect logic could go here
    };

    socket.onerror = () => {
      setLastError("Connection error");
    };

    return () => {
      socket.close();
    };
  }, [gameCode, onGameStateUpdate, toast]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
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
        description: "Cannot send move. Trying to reconnect...",
      });
    }
  };

  return { isConnected, lastError, sendMove };
}
