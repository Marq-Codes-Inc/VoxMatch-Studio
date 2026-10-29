// src/components/modals/ExportProgressOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

export interface ExportJobResult {
  success: boolean;
  path?: string;
  partial?: boolean;
  message?: string;
}

interface ExportProgressOverlayProps {
  jobId: string;
  title: string;
  onComplete: (result: ExportJobResult) => void;
  onCancel: () => void;
  promise: Promise<ExportJobResult>;
}

type Stage = 'starting' | 'writing' | 'finalizing' | 'done' | 'error';

interface ProgressPayload {
  jobId: string;
  stage: Stage;
  percent: number;
  message?: string;
  timestamp: number;
}

interface LogLine {
  time: number;
  text: string;
  level: 'info' | 'error' | 'success';
}

function formatTime(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export const ExportProgressOverlay: React.FC<ExportProgressOverlayProps> = ({
  jobId,
  title,
  onComplete,
  onCancel,
  promise,
}) => {
  const [stage, setStage] = useState<Stage>('starting');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('Preparing…');
  const [log, setLog] = useState<LogLine[]>([]);
  const [finished, setFinished] = useState<ExportJobResult | null>(null);

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const settledRef = useRef(false);

  const pushLog = (text: string, level: LogLine['level'] = 'info') => {
    setLog((prev) => [...prev, { time: Date.now(), text, level }]);
  };

  // Subscribe to real progress events
  useEffect(() => {
    if (!window.electronAPI?.on) {
      let raf = 0;
      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 800;
        if (t >= 1) {
          setPercent(100);
          setStage('done');
          setMessage('Export complete');
          return;
        }
        setPercent(Math.min(90, t * 90));
        setStage(t < 0.85 ? 'writing' : 'finalizing');
        setMessage(t < 0.85 ? 'Writing…' : 'Finalizing…');
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    pushLog('Export started');
    const unsubscribe = window.electronAPI.on(
      'export:progress',
      (payload: ProgressPayload) => {
        if (!payload || payload.jobId !== jobId) return;

        setPercent(payload.percent);
        setStage(payload.stage);
        if (payload.message) setMessage(payload.message);

        // Log only significant transitions to avoid spam
        if (payload.stage === 'starting') {
          pushLog('Preparing export');
        } else if (payload.stage === 'finalizing') {
          pushLog('Finalizing file');
        } else if (payload.stage === 'done') {
          pushLog('File written successfully', 'success');
        } else if (payload.stage === 'error') {
          pushLog(payload.message || 'Export failed', 'error');
        }
      },
    );

    return unsubscribe;
  }, [jobId]);

  // Await the underlying IPC promise
  useEffect(() => {
    let cancelled = false;

    promise
      .then((result) => {
        if (cancelled) return;
        settledRef.current = true;
        setFinished(result);

        if (result.success) {
          setStage('done');
          setPercent(100);
          setMessage('Export complete');
          pushLog(
            result.partial
              ? `Destination chosen: ${result.path} (encoder not yet implemented)`
              : `Saved to ${result.path}`,
            'success',
          );
        } else {
          setStage('error');
          setMessage(result.message || 'Export failed');
          pushLog(result.message || 'Export failed', 'error');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        settledRef.current = true;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setFinished({ success: false, message: msg });
        setStage('error');
        setMessage(msg);
        pushLog(msg, 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [promise]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log]);

  const handleClose = () => {
    if (!settledRef.current) return;
    onComplete(finished || { success: false, message: 'Cancelled' });
  };

  const isWorking = stage !== 'done' && stage !== 'error';

  const barColor =
    stage === 'error'
      ? 'bg-danger'
      : stage === 'done'
      ? 'bg-green-500'
      : 'bg-primary';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-modal-overlay-in">
      <div className="w-full max-w-md bg-app-surface rounded-lg shadow-2xl border border-app-border flex flex-col animate-modal-content-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            {isWorking ? (
              <Loader2 size={18} className="animate-spin text-primary" />
            ) : stage === 'done' ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <AlertCircle size={18} className="text-danger" />
            )}
            <h2 className="text-sm font-semibold text-app-text">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isWorking}
            className="p-1 rounded-md hover:bg-app-gray-light text-app-icon-color disabled:opacity-30 disabled:cursor-not-allowed"
            title={isWorking ? 'Export in progress…' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-app-gray capitalize">{stage}</span>
              <span className="text-app-text font-mono">
                {Math.round(percent)}%
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-app-gray-dark overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-200 ease-out`}
                style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
              />
              {isWorking && (
                <div
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_1.5s_infinite]"
                  style={{
                    left: `calc(${Math.max(
                      0,
                      Math.min(100, percent),
                    )}% - 64px)`,
                  }}
                />
              )}
            </div>
            {message && (
              <p className="text-[11px] text-app-gray truncate">{message}</p>
            )}
          </div>

          {/* Log */}
          {log.length > 0 && (
            <div className="max-h-28 overflow-y-auto rounded-md border border-app-border bg-app-gray-dark/40 p-2 text-[11px] font-mono leading-relaxed">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className={
                    entry.level === 'error'
                      ? 'text-danger'
                      : entry.level === 'success'
                      ? 'text-green-400'
                      : 'text-app-gray'
                  }
                >
                  <span className="text-app-gray/60">
                    [{formatTime(entry.time)}]
                  </span>{' '}
                  {entry.text}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-app-border">
          {isWorking ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-app-gray-light hover:bg-app-gray text-app-text text-sm"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-hover text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
