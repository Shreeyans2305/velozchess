import { useState } from "react";

interface ToastProps {
    message: string;
    onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-card border border-border rounded-lg shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[300px]">
                <div className="flex-1 text-sm font-medium">{message}</div>
                <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export function useToastNotification() {
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const ToastComponent = toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null;

    return { showToast, ToastComponent };
}
