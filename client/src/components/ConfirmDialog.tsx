import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{title}</h3>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                    <Button variant="outline" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
