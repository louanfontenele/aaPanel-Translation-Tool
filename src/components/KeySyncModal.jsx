import React, { useMemo } from "react";
import {
  X,
  RefreshCw,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export function KeySyncModal({ isOpen, onClose, data, onSync }) {
  if (!isOpen) return null;

  // Analysis
  const analysis = useMemo(() => {
    const missing = []; // In Source, NOT in Target (Technically 'untouched' in our editor, or target is null)
    const extra = []; // In Target, NOT in Source (Orphans)

    data.forEach((item) => {
      // Missing: We have source, but target is null/undefined (not just empty string)
      if (
        item.source !== undefined &&
        item.source !== null &&
        (item.target === undefined || item.target === null)
      ) {
        missing.push(item);
      }

      // Extra: We have target, but source is null/undefined
      if (
        (item.source === undefined || item.source === null) &&
        item.target !== undefined &&
        item.target !== null
      ) {
        extra.push(item);
      }
    });

    return { missing, extra };
  }, [data]);

  const handleSync = () => {
    // We want to:
    // 1. Remove 'extra' keys (Orphans)
    // 2. Ensure 'missing' keys are initialized (locally they are already in the list, just need to be saved correctly as "new")
    // The main action here is deleting the orphans.
    onSync(analysis.extra.map((i) => i.key));
  };

  const isPerfect =
    analysis.missing.length === 0 && analysis.extra.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="text-blue-600 dark:text-blue-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Structure Match & Sync
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isPerfect ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Perfect Match!
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  The target file has exactly the same keys as the source. No
                  sync needed.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Extra Keys (Orphans) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Trash2 size={16} className="text-red-500" />
                    Extra Keys ({analysis.extra.length})
                  </h3>
                  <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    To be deleted
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg h-64 overflow-y-auto p-2 space-y-1">
                  {analysis.extra.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                      None
                    </div>
                  ) : (
                    analysis.extra.map((item) => (
                      <div
                        key={item.key}
                        className="text-xs font-mono text-red-600 dark:text-red-400 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/10 rounded truncate"
                        title={item.key}>
                        {item.key}
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  These keys exist in the <b>Target</b> but NOT in the{" "}
                  <b>Source</b>. They are likely obsolete.
                </p>
              </div>

              {/* Missing Keys */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus size={16} className="text-blue-500" />
                    Missing Keys ({analysis.missing.length})
                  </h3>
                  <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    To be added
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg h-64 overflow-y-auto p-2 space-y-1">
                  {analysis.missing.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                      None
                    </div>
                  ) : (
                    analysis.missing.map((item) => (
                      <div
                        key={item.key}
                        className="text-xs font-mono text-blue-600 dark:text-blue-400 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded truncate"
                        title={item.key}>
                        {item.key}
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  These will be added to the Target file structure automatically
                  (currently showing as empty/untranslated).
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex-none px-6 py-4 bg-slate-50 dark:bg-slate-950/50 rounded-b-lg border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-md transition-colors">
            Cancel
          </button>
          {!isPerfect && (
            <button
              onClick={handleSync}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2">
              <RefreshCw size={16} />
              Sync Structure (Using Source Base)
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
