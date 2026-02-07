import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DrawOfferDialogProps {
    open: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export function DrawOfferDialog({ open, onAccept, onDecline }: DrawOfferDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h2 className="text-xl font-bold mb-4">Draw Offered</h2>
                <p className="text-muted-foreground mb-6">
                    Your opponent has offered a draw. Do you accept?
                </p>
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onDecline}
                    >
                        Decline
                    </Button>
                    <Button
                        onClick={onAccept}
                    >
                        Accept Draw
                    </Button>
                </div>
            </div>
        </div>
    );
}
