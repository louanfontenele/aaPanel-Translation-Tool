import React, { useState, useMemo } from "react";
import { Search, Filter, AlertCircle, CheckCircle2 } from "lucide-react";

export function EditorView({ data, onValueChange }) {
  const [filter, setFilter] = useState("all"); // all, missing
  const [search, setSearch] = useState("");

  // Calculate counts
  const missingCount = useMemo(() => {
    return data.filter(
      (item) =>
        !item.target || item.target === "" || item.target === item.source
    ).length;
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search logic
      const matchesSearch =
        item.key.toLowerCase().includes(search.toLowerCase()) ||
        (item.source &&
          JSON.stringify(item.source)
            .toLowerCase()
            .includes(search.toLowerCase())) ||
        (item.target &&
          JSON.stringify(item.target)
            .toLowerCase()
            .includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter logic
      if (filter === "missing") {
        return (
          item.target === null ||
          item.target === undefined ||
          item.target === "" ||
          item.target === item.source
        );
      }

      return true;
    });
  }, [data, filter, search]);

  const renderValueInput = (item, index) => {
    const value =
      item.target === undefined || item.target === null ? "" : item.target;
    // If value is object, stringify
    const stringVal =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);

    return (
      <textarea
        className="w-full min-h-[60px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-sans resize-y"
        value={stringVal}
        onChange={(e) => {
          let newVal = e.target.value;
          // Attempt parse if source was object? Or just keep strings for simple translations
          // If the original source was an object, we might want to try parsing
          if (item.source && typeof item.source !== "string") {
            try {
              newVal = JSON.parse(newVal);
            } catch (e) {}
          }
          onValueChange(index, newVal);
        }}
        placeholder="Enter translation..."
      />
    );
  };

  const getStatusColor = (item) => {
    if (!item.target) return "bg-red-500"; // Missing
    if (item.target === item.source) return "bg-yellow-500"; // Identical (Untranslated?)
    return "bg-green-500"; // Translated
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Toolbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search keys or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-md focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
              filter === "all"
                ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            All ({data.length})
          </button>
          <button
            onClick={() => setFilter("missing")}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
              filter === "missing"
                ? "bg-white dark:bg-slate-700 shadow text-red-600 dark:text-red-400"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            Missing ({missingCount})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredData.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            No keys found matching your filter.
          </div>
        ) : (
          filteredData.map((item, idx) => {
            // Find actual index in main data if needed for onValueChange
            // But for simplicity, we passed 'index' logic in App usually?
            // Wait, if we filter, idx is filter index. We need REAL index.
            // Or we pass Key to onValueChange.
            // Let's assume onValueChange takes (key, val) or we fix the parent.
            // Since data is an array, we better lookup by key in parent or pass key here.
            return (
              <div
                key={item.key}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <div
                    className="font-mono text-xs text-slate-500 truncate select-all"
                    title={item.key}>
                    {item.key}
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(item)}`}
                    title="Status"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  <div className="p-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-900/10">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 select-none">
                      Source
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {typeof item.source === "string"
                        ? item.source
                        : JSON.stringify(item.source, null, 2)}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 select-none">
                      Target
                    </div>
                    {renderValueInput(item, data.indexOf(item))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
