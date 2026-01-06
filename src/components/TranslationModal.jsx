import React from "react";
import { X, Languages, Sparkles } from "lucide-react";

export function TranslationModal({ isOpen, onClose, onTranslate }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Sparkles size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Translate
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Choose how you want to apply AI translations using your configured API
          key.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onTranslate("missing")}
            className="w-full p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left flex items-center gap-3 group">
            <div className="bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 p-2 rounded text-slate-600 dark:text-slate-300">
              <Languages size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
                Resume / Translate Missing
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Fills empty keys & re-translates items identical to source.
              </div>
            </div>
          </button>

          <button
            onClick={() => onTranslate("all")}
            className="w-full p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800 transition-colors text-left flex items-center gap-3 group">
            <div className="bg-red-50 dark:bg-red-900/20 group-hover:bg-white dark:group-hover:bg-red-900/30 p-2 rounded text-red-600 dark:text-red-400">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
                Translate All
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Re-translates every key (Overwrites existing).
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
