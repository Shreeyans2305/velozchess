import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useLocation } from "wouter";

// Create a new game
export function useCreateGame() {
  const [, setLocation] = useLocation();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create game");
      return api.games.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      setLocation(`/game/${data.code}`);
    },
  });
}

// Join an existing game
export function useJoinGame() {
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(api.games.join.path, {
        method: api.games.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Game not found");
        if (res.status === 400) throw new Error("Game is full or invalid");
        throw new Error("Failed to join game");
      }

      return api.games.join.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      // Store role in sessionStorage for this session so we remember if we are white/black
      // This is a simple way to persist 'who am I' without full auth
      sessionStorage.setItem(`game_role_${data.game.code}`, data.role);
      setLocation(`/game/${data.game.code}`);
    },
  });
}

// Get game details (initial fetch before WS takes over)
export async function fetchGame(code: string) {
  const url = buildUrl(api.games.get.path, { code });
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch game");
  }
  return api.games.get.responses[200].parse(await res.json());
}
