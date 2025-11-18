import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; type: ToastType; title?: string; message: string };

type ToastApi = {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const t: Toast = { id, type, title, message };
    setToasts(s => [t, ...s]);
    // Auto remove after 5s
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 5000);
  }, []);

  const api: ToastApi = {
    success: (m, title) => push('success', m, title),
    error: (m, title) => push('error', m, title),
    info: (m, title) => push('info', m, title),
    warning: (m, title) => push('warning', m, title),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container */}
      <div className="fixed right-4 bottom-4 z-[9999] flex flex-col-reverse gap-3 items-end">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`max-w-sm w-full py-2 px-3 rounded-md shadow-lg border border-slate-200 text-sm bg-white flex flex-col`}
            role="status"
          >
            {t.title && <div className="font-semibold text-slate-900">{t.title}</div>}
            <div className={`mt-1 ${t.title ? 'text-slate-700' : 'text-slate-800'} whitespace-pre-wrap`}>{t.message}</div>
            <div className="mt-2 text-xs text-slate-400">{t.type.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
