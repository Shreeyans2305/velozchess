import { useState } from "react";
import { useCreateGame, useJoinGame } from "@/hooks/use-games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [joinCode, setJoinCode] = useState("");
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('chess_username') || '';
  });
  const [timeMinutes, setTimeMinutes] = useState(10);
  const [incrementSeconds, setIncrementSeconds] = useState(0);
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 p-6 bg-background text-foreground font-body selection:bg-accent selection:text-white overflow-hidden relative">

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-20"
      >
        <h1 className="text-5xl md:text-7xl font-serif tracking-tight text-primary uppercase">
          VELOZCHESS.WTF
        </h1>
      </motion.div>

      {/* Hero Image - Centered and Large */}
      {/* Dual Knights - Desktop Only */}
      {/* Left Knight - Faces Right, Tilted slightly towards center, Vertically Centered */}
      <motion.div
        initial={{ opacity: 0, x: -50, rotate: -10 }}
        animate={{ opacity: 1, x: 0, rotate: -5 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="hidden md:block absolute left-[-10%] md:left-[-2%] top-[40%] -translate-y-1/2 z-0 pointer-events-none"
      >
        <img
          src="/main.png"
          alt=""
          className="h-[80vh] w-auto object-contain drop-shadow-2xl opacity-100"
          style={{ transform: 'scaleX(-1)' }} // Faces right
        />
      </motion.div>

      {/* Right Knight - Faces Left, Tilted slightly towards center, Vertically Centered */}
      <motion.div
        initial={{ opacity: 0, x: 50, rotate: 10 }}
        animate={{ opacity: 1, x: 0, rotate: 5 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="hidden md:block absolute right-[-10%] md:right-[-2%] top-[40%] -translate-y-1/2 z-0 pointer-events-none"
      >
        <img
          src="/main.png"
          alt=""
          className="h-[80vh] w-auto object-contain drop-shadow-2xl opacity-100"
        />
      </motion.div>

      {/* Forms Section - Centered at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-xl space-y-12 z-20"
      >
        {/* Enter Code Section */}
        <div className="space-y-4">
          <form onSubmit={handleJoin} className="flex gap-0 shadow-lg">
            <Input
              placeholder="GAME CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="flex-1 h-16 text-center text-2xl font-body uppercase bg-background border border-border focus:border-primary rounded-none placeholder:text-muted-foreground/30 focus:ring-0 transition-all font-medium text-primary px-4"
            />
            <Button
              type="submit"
              disabled={!joinCode || joinGame.isPending}
              className="h-16 px-8 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase tracking-widest font-bold"
            >
              Join Game
            </Button>
          </form>
        </div>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase bg-background px-4 text-muted-foreground tracking-[0.2em]">
            Or Create New
          </div>
        </div>

        {/* Host Game Section - Compact */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Minutes</label>
              <Input
                type="text"
                placeholder="10"
                value={timeMinutes}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 30)) {
                    setTimeMinutes(val === '' ? 1 : parseInt(val));
                  }
                }}
                className="h-12 text-center text-xl font-mono bg-transparent border border-border focus:border-primary rounded-none p-0"
              />
            </div>
            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Increment</label>
              <Input
                type="text"
                placeholder="0"
                value={incrementSeconds}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 30)) {
                    setIncrementSeconds(val === '' ? 0 : parseInt(val));
                  }
                }}
                className="h-12 text-center text-xl font-mono bg-transparent border border-border focus:border-primary rounded-none p-0"
              />
            </div>
            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Name</label>
              <Input
                placeholder="Guest"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  localStorage.setItem('chess_username', e.target.value);
                }}
                maxLength={12}
                className="h-12 text-center text-sm font-body bg-transparent border border-border focus:border-primary rounded-none p-0"
              />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-14 text-sm uppercase tracking-[0.2em] font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-none transition-all shadow-lg"
            onClick={() => {
              const timeControl = timeMinutes * 60;
              const increment = incrementSeconds;
              createGame.mutate({ timeControl, increment });
            }}
            disabled={createGame.isPending}
          >
            Start Game
          </Button>
        </div>

      </motion.div>
    </div>
  );
}
