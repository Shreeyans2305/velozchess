import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useLocation } from "wouter";

export function useCreateGame() {
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (params?: { timeControl?: number; increment?: number }) => {
      const payload = {
        timeControl: params?.timeControl || 600,
        increment: params?.increment || 0,
      };
      console.log('[Create Game] Sending:', payload);
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create game");
      return await res.json();
    },
    onSuccess: (data) => {
      // Creator is always white
      sessionStorage.setItem(`game_role_${data.code}`, 'w');
      console.log('[Create Game] Role assigned: white for game:', data.code);
      setLocation(`/game/${data.code}`);
    },
  });
}

export function useJoinGame() {
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(api.games.join.path, {
        method: api.games.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join game");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      // Save the player's role (white, black, or spectator)
      sessionStorage.setItem(`game_role_${data.game.code}`, data.role);
      console.log('[Join Game] Role assigned:', data.role, 'for game:', data.game.code);
      setLocation(`/game/${data.game.code}`);
    },
  });
}

export async function fetchGame(code: string) {
  const url = buildUrl(api.games.get.path, { code });
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch game");
  }
  return await res.json();
}
