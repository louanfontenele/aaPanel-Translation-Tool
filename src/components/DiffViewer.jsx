import React, { useEffect, useState } from "react";

export function DiffViewer({ diff, onValueChange }) {
  // Local state to track edits before they are saved or to just show them live
  // However, for simplicity, we bubble up changes immediately to App.jsx state handler
  // or we can keep a local cache. Given the structure, let's assume onValueChange updates the parent's DiffResult directly.

  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-12">
        <p>Select two files to compare</p>
      </div>
    );
  }

  const { renamed, modified, added, deleted } = diff;

  if (
    renamed.length === 0 &&
    modified.length === 0 &&
    added.length === 0 &&
    deleted.length === 0
  ) {
    return (
      <div className="flex items-center justify-center h-full text-green-500 bg-slate-50 dark:bg-slate-900 rounded-lg p-12">
        <p>Files are identical!</p>
      </div>
    );
  }

  const renderValueInput = (value, onChange) => {
    // If value is a complex object/array, we just render a textarea with stringified JSON
    const stringVal =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);

    return (
      <textarea
        className="w-full h-full min-h-[40px] p-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
        value={stringVal}
        onChange={(e) => {
          // Try to parse back to JSON if possible, else string
          let newVal = e.target.value;
          try {
            if (typeof value !== "string") {
              newVal = JSON.parse(newVal);
            }
          } catch (e) {
            // keep as string if parse fails (user typing)
          }
          onChange(newVal);
        }}
        spellCheck={false}
      />
    );
  };

  return (
    <div className="w-full h-full overflow-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
      {/* Renamed Keys */}
      {renamed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider">
            Renamed Keys
          </h3>
          <div className="space-y-2">
            {renamed.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-slate-500 line-through">
                    {item.old_key}
                  </span>
                  <span className="text-blue-500">→</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {item.new_key}
                  </span>
                </div>
                <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                  {renderValueInput(item.value, (newVal) =>
                    onValueChange("renamed", idx, "value", newVal)
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modified Text */}
      {modified.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wider">
            Modified Values
          </h3>
          <div className="space-y-2">
            {modified.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md text-sm">
                <div className="font-mono font-medium text-slate-900 dark:text-slate-100 mb-1">
                  {item.key}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded text-red-700 dark:text-red-400 text-xs font-mono break-all opacity-70">
                    {typeof item.old_value === "string"
                      ? item.old_value
                      : JSON.stringify(item.old_value)}
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/10 p-1 rounded text-green-700 dark:text-green-400 text-xs font-mono break-all">
                    {renderValueInput(item.new_value, (newVal) =>
                      onValueChange("modified", idx, "new_value", newVal)
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Added Keys */}
      {added.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">
            New Keys
          </h3>
          <div className="space-y-1">
            {added.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md text-sm font-mono text-green-700 dark:text-green-400 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">+</span>
                  <span>{item.key}</span>
                </div>
                <div className="pl-4 border-l border-green-200 font-sans break-words">
                  {renderValueInput(item.value, (newVal) =>
                    onValueChange("added", idx, "value", newVal)
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Deleted Keys */}
      {deleted.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider">
            Deleted Keys
          </h3>
          <div className="space-y-1">
            {deleted.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md text-sm font-mono text-red-700 dark:text-red-400 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">-</span>
                  <span>{item.key}</span>
                </div>
                <div className="text-xs text-slate-500 pl-4 border-l border-red-200 font-sans break-words opacity-60">
                  {typeof item.value === "string"
                    ? item.value
                    : JSON.stringify(item.value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
