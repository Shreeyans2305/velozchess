import { useState } from "react";
import { useCreateGame, useJoinGame } from "@/hooks/use-games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Swords, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [joinCode, setJoinCode] = useState("");
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('chess_username') || '';
  });
  const createGame = useCreateGame();
  const joinGame = useJoinGame();
  const { toast } = useToast();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a valid 4-character game code.",
      });
      return;
    }
    try {
      await joinGame.mutateAsync(joinCode.toUpperCase());
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not join",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-primary/20 mb-6 rotate-3">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            CHESS<span className="text-primary">.REAL</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time chess for modern players.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Your Name (optional)</label>
              <Input
                placeholder="Enter your name"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  localStorage.setItem('chess_username', e.target.value);
                }}
                maxLength={20}
                className="h-12 text-center"
              />
            </div>
            <Button 
              size="lg" 
              className="w-full text-lg h-16 font-semibold shadow-primary/25 shadow-xl hover:shadow-2xl hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
              onClick={() => createGame.mutate()}
              disabled={createGame.isPending}
            >
              {createGame.isPending ? (
                "Creating Room..."
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Host New Game
                </>
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or join existing</span>
              </div>
            </div>

            <form onSubmit={handleJoin} className="flex gap-2 group">
              <Input
                placeholder="Enter 4-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="h-14 text-center text-lg font-mono tracking-widest uppercase bg-card/50 backdrop-blur-sm border-white/10 focus:border-primary/50 transition-all"
              />
              <Button 
                type="submit" 
                size="lg" 
                variant="secondary"
                className="h-14 px-6 shadow-lg hover:bg-secondary/80"
                disabled={joinGame.isPending}
              >
                {joinGame.isPending ? (
                  "..."
                ) : (
                  <ArrowRight className="w-6 h-6" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
      
      <footer className="absolute bottom-6 text-center text-sm text-muted-foreground/40 font-mono">
        v1.0.0 • PROD READY
      </footer>
    </div>
  );
}
