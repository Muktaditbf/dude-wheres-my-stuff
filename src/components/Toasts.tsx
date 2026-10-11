/** Little sticker toasts, mostly for "Undo". */
import { AnimatePresence, m } from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from './ui';

export interface ToastOptions {
  message: ReactNode;
  action?: { label: string; onClick: () => void };
  tone?: 'plain' | 'lime' | 'pink' | 'yellow';
  /** Milliseconds, or 0 to stay until dismissed. */
  duration?: number;
}

interface Toast extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const TONES = {
  plain: 'bg-surface text-ink',
  lime: 'bg-lime text-on-accent',
  pink: 'bg-pink text-on-accent',
  yellow: 'bg-yellow text-on-accent',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { ...options, id }]);
      const duration = options.duration ?? 6000;
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <m.div
              key={toast.id}
              initial={{ opacity: 0, y: 24, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              className={cn(
                'sticker-sm pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-3 font-bold',
                TONES[toast.tone ?? 'plain'],
              )}
            >
              <span className="flex-1">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="sticker-sm press bg-ink px-3 py-1.5 text-sm font-extrabold text-bg"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss"
                className="rounded-full px-2 text-lg leading-none opacity-70 hover:opacity-100"
                onClick={() => dismiss(toast.id)}
              >
                ×
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
