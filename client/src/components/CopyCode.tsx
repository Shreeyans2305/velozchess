import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="text-sm text-muted-foreground text-center">Share this code with your friend</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input 
            readOnly 
            value={code} 
            className="font-mono text-center text-lg tracking-widest bg-secondary/50 border-primary/20"
          />
        </div>
        <Button 
          size="icon" 
          variant="outline" 
          onClick={handleCopy}
          className="shrink-0 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
