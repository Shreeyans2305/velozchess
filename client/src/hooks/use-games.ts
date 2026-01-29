import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useLocation } from "wouter";

export function useCreateGame() {
  const [, setLocation] = useLocation();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
      });
      if (!res.ok) throw new Error("Failed to create game");
      return await res.json();
    },
    onSuccess: (data) => {
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
