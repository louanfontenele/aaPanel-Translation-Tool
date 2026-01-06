import { useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { tauriBridge } from "./lib/tauri-bridge";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { DiffViewer } from "./components/DiffViewer";
import { SettingsModal } from "./components/Settings";
import { TranslationModal } from "./components/TranslationModal";
import { openFile } from "./lib/shell-utils";
import { translateBatch, fetchGeminiModels } from "./lib/ai-translator"; // fetchGeminiModels might be unused here but keeping imports safe
import { getSleepTime, isDailyLimitError } from "./lib/ai-models";
import { EditorView } from "./components/EditorView";
import { invoke } from "@tauri-apps/api/core";
import {
  Folder,
  FileJson,
  Moon,
  Sun,
  Search,
  GitCompare,
  FolderOpen,
  ArrowRight,
  Settings,
  Edit,
  FileText,
  Save,
  Languages,
} from "lucide-react";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

// Recursive File Tree Component
const FileTreeItem = ({ node, onSelect, selectedFiles }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isSelected = selectedFiles.includes(node.path);
  const selectionIndex = selectedFiles.indexOf(node.path);

  if (node.is_dir) {
    return (
      <div className="pl-2">
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer select-none transition-colors"
          onClick={() => setIsOpen(!isOpen)}>
          <Folder size={16} className="text-blue-500 fill-blue-500/20" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {node.name}
          </span>
        </div>
        {isOpen && node.children && (
          <div className="border-l border-slate-200 dark:border-slate-800 ml-2">
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                onSelect={onSelect}
                selectedFiles={selectedFiles}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pl-2">
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer select-none transition-all group ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/50"
            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
        }`}
        onClick={() => onSelect(node.path)}>
        <FileJson
          size={14}
          className={
            isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
          }
        />
        <span className="text-sm truncate flex-1">{node.name}</span>
        {isSelected && (
          <span className="text-[10px] font-bold bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
            {selectionIndex + 1}
          </span>
        )}
      </div>
    </div>
  );
};

function AppContent() {
  const { theme, setTheme } = useTheme();
  /* State */
  const [projectPath, setProjectPath] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]); // [pathA, pathB]

  const [viewMode, setViewMode] = useState("diff"); // 'diff' | 'editor'
  const [diffResult, setDiffResult] = useState(null);
  const [editorData, setEditorData] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);

  // Helper to write file (Tauri)
  const writeTextFile = async (path, content) => {
    await tauriBridge.writeFile(path, content);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper to scan directory
  const scanPath = async (path) => {
    setIsLoading(true);
    setError(null);
    try {
      const tree = await tauriBridge.scanDirectory(path);
      if (Array.isArray(tree)) {
        setFileTree(tree);
        setProjectPath(path);
        localStorage.setItem("last_project_path", path);
      } else {
        setFileTree([]);
        console.warn("Invalid tree returned:", tree);
      }
      setSelectedFiles([]);
      setDiffResult(null);
      setEditorData(null);
      setViewMode("diff");
    } catch (err) {
      console.error(err);
      setError("Failed to scan directory: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const lastPath = localStorage.getItem("last_project_path");
    if (lastPath) scanPath(lastPath);
  }, []);

  const handleOpenProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        recursive: true,
      });
      if (selected) scanPath(selected);
    } catch (err) {
      setError("Failed to open dialog: " + err);
    }
  };

  const handleFileSelect = (path) => {
    setSelectedFiles((prev) => {
      if (prev.includes(path)) return prev.filter((p) => p !== path);
      if (prev.length >= 2) return [prev[0], path];
      return [...prev, path];
    });
  };

  /* Compare Logic (Diff View) */
  const handleCompare = async () => {
    if (selectedFiles.length !== 2) return;
    setIsLoading(true);
    setDiffResult(null);
    setViewMode("diff");
    try {
      const result = await tauriBridge.compareFiles(
        selectedFiles[0],
        selectedFiles[1]
      );
      setDiffResult(result);
    } catch (err) {
      console.error(err);
      setError("Comparison failed: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  /* Editor Logic (Editor View) */
  const handleSwitchToEditor = async () => {
    if (selectedFiles.length !== 2) return;
    setIsLoading(true);
    setEditorData(null);
    setViewMode("editor");
    try {
      const data = await tauriBridge.getTranslationData(
        selectedFiles[0],
        selectedFiles[1]
      );
      setEditorData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load editor data: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  /* Diff Value Change (Deprecated/Read-only in Diff View usually, but we kept it editable before) 
     For now, let's keep Diff View simple (Visual) and Editor View for heavy editing.
     But the user might want old behavior. Let's keep Diff View simple (Visual) and Editor for work. 
  */
  const handleDiffValueChange = (type, index, field, newValue) => {
    // Optional: Allow editing in Diff View too?
    // User said "Comparison as it was before". Before it was editable.
    // But "Editor Mode" implies THAT is where editing happens.
    // Let's keep Diff View as mainly visual for now to avoid syncing hell between two states.
    // Or simpler: handleDiffValueChange updates diffResult.
    setDiffResult((prev) => {
      if (!prev) return prev;
      const clone = { ...prev };
      const list = [...clone[type]];
      list[index] = { ...list[index], [field]: newValue };
      clone[type] = list;
      return clone;
    });
  };

  /* Editor Value Change */
  const handleEditorValueChange = (index, newValue) => {
    setEditorData((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], target: newValue };
      return clone;
    });
  };

  const handleTranslateClick = () => {
    setIsTranslationModalOpen(true);
  };

  const [loadingStatus, setLoadingStatus] = useState("");

  // Ref for cancellation
  const isCancelledRef = useRef(false);
  const [progress, setProgress] = useState(0);

  const handleCancelTranslation = () => {
    isCancelledRef.current = true;
  };

  const performTranslation = async (mode) => {
    setIsTranslationModalOpen(false);
    setIsLoading(true);
    setLoadingStatus("Preparing translation...");
    setProgress(0);
    isCancelledRef.current = false;

    try {
      const geminiKey = localStorage.getItem("gemini_key");
      const openaiKey = localStorage.getItem("openai_key");
      const context = localStorage.getItem("translation_context");
      const targetLang =
        localStorage.getItem("target_lang") || "Portuguese (Brazil)";
      const projectName =
        localStorage.getItem("project_name") || "Software Application";
      const projectDescription =
        localStorage.getItem("project_description") || ""; // Fixed: Defined variable

      const provider = geminiKey ? "gemini" : "openai";
      const apiKey = geminiKey || openaiKey;

      const model =
        provider === "gemini"
          ? localStorage.getItem("gemini_model") || "gemini-pro"
          : localStorage.getItem("openai_model") || "gpt-3.5-turbo";

      if (!apiKey) {
        alert(
          "No API Key found! Please add your Gemini or OpenAI key in Settings."
        );
        setIsLoading(false);
        setLoadingStatus("");
        return;
      }

      if (!editorData) return;

      const itemsToTranslate = [];
      editorData.forEach((item) => {
        // Consider "missing" if:
        // 1. Target is empty/null
        // 2. Target is identical to Source (assuming it hasn't been translated yet)
        const isMissing =
          !item.target ||
          item.target === "" ||
          (typeof item.source === "string" && item.target === item.source);

        if (mode === "all" || (mode === "missing" && isMissing)) {
          if (typeof item.source === "string") {
            itemsToTranslate.push(item);
          }
        }
      });

      if (itemsToTranslate.length === 0) {
        alert("Nothing to translate!");
        setIsLoading(false);
        setLoadingStatus("");
        return;
      }

      // 3. Prepare batches
      // 3. Prepare batches
      const savedBatchSize = parseInt(
        localStorage.getItem("batch_size") || "600"
      );
      const batchSize = isNaN(savedBatchSize) ? 600 : savedBatchSize;
      // User requested manual configuration. Using value from settings or default 600.
      const totalBatches = Math.ceil(itemsToTranslate.length / batchSize);
      const translationsMap = {};

      for (let i = 0; i < totalBatches; i++) {
        if (isCancelledRef.current) {
          setLoadingStatus("Cancelled. Saving progress...");
          break;
        }

        const start = i * batchSize;
        const end = Math.min(start + batchSize, itemsToTranslate.length);
        const batchItems = itemsToTranslate.slice(start, end);

        setLoadingStatus(
          `Translating batch ${i + 1}/${totalBatches} using ${model}...`
        );

        // Calculate progress percentage
        const currentProgress = Math.round((i / totalBatches) * 100);
        setProgress(currentProgress);

        const keys = batchItems.map((item) => item.key);
        const sources = batchItems.map((item) => item.source);

        try {
          const result = await translateBatch(
            keys,
            sources,
            null,
            context,
            apiKey,
            provider,
            model,
            targetLang,
            projectName,
            projectDescription
          );
          Object.assign(translationsMap, result);

          // --- AUTO-SAVE (Flush) ---
          // Save progress to disk after every batch to prevent data loss
          // Actually, simplest is to update editorData in place or just save what we have in translationsMap overlaid on editorData?
          // But translationsMap only has NEW translations.

          // Better approach: Update the in-memory editorData for the next save
          // But React state unused in loop. So we construct the file content from:
          // 1. Original Structure (we need to know where keys belong)
          // 2. translationsMap (which accumulates ALL results so far)

          // Wait, translationsMap is accumulative for this session? Yes, defined above loop.
          // But we need to merge with existing translations if any?
          // The logic below loop applies translationsMap to editorData.
          // To flush safely, we should assume translationsMap + existing editorData.

          // Simplified Flush: Just saving the current batch isn't enough, we need the whole file.
          // Let's defer "write to disk" to a slightly safer logic or just update state?
          // Updating state in loop is bad.
          // Let's trigger a specialized "saveProgress" function.

          // User asked: "Save output file every block".
          // We can construct the final JSON object here.
          const currentFullObj = {};
          const setByPath = (obj, path, value) => {
            const keys = path.split(".");
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
              if (!current[keys[i]]) current[keys[i]] = {};
              current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
          };

          // Rebuild full object
          editorData.forEach((item) => {
            // Priority: 1. New Translation 2. Existing Target 3. Empty
            let val = translationsMap[item.key];
            if (val === undefined) val = item.target;
            if (val !== undefined && val !== null) {
              setByPath(currentFullObj, item.key, val);
            }
          });

          await writeTextFile(
            selectedFiles[1],
            JSON.stringify(currentFullObj, null, 4)
          );
          // ------------------------

          // --- SMART SLEEP ---
          let sleepMs = getSleepTime(model);

          // Optimization: With large chunks (600 lines), generation takes longer.
          // Enforce a minimum sleep of 5 seconds to be safe on top of calculation
          if (sleepMs < 5000) sleepMs = 5000;

          setLoadingStatus(
            `Cooldown: Waiting ${Math.round(
              sleepMs / 1000
            )}s (Rate Limit Protection)...`
          );
          await sleep(sleepMs);
        } catch (err) {
          console.error(`Batch ${i + 1} failed:`, err);

          // Check for critical errors checking error message content
          const isDaily = isDailyLimitError(err.message);

          const isCritical =
            isDaily ||
            err.message.includes("429") ||
            err.message.includes("API Key") ||
            err.message.includes("401");

          if (isCritical) {
            let msg = `Translation stopped due to API error: ${err.message}`;
            if (isDaily) {
              msg = `DAILY QUOTA EXCEEDED for ${model}. Please switch to a different model in Settings and try again. Your progress was saved.`;
            } else if (err.message.includes("429")) {
              msg = `Rate Limit (RPM) exceeded. The system tried to sleep but was blocked. Try a slower model.`;
            }

            setLoadingStatus(`Error: ${err.message}. Stopping...`);
            setError(msg);
            isCancelledRef.current = true; // Stop future batches
            break; // Break immediately
          }
        }
      }

      setProgress(100);

      // Apply translations (even if cancelled, we save what we got)
      setEditorData((prev) => {
        return prev.map((item) => {
          if (translationsMap[item.key]) {
            return { ...item, target: translationsMap[item.key] };
          }
          return item;
        });
      });

      setLoadingStatus(isCancelledRef.current ? "Cancelled!" : "Done!");
      setTimeout(() => {
        setLoadingStatus("");
        setProgress(0);
      }, 2000);
    } catch (e) {
      console.error(e);
      setError("Translation error: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editorData || !selectedFiles[1]) return;
    setIsLoading(true);
    try {
      const finalObj = {};
      const setByPath = (obj, path, value) => {
        const keys = path.split(".");
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      };

      editorData.forEach((item) => {
        if (item.target !== undefined && item.target !== null) {
          setByPath(finalObj, item.key, item.target);
        }
      });

      await writeTextFile(selectedFiles[1], JSON.stringify(finalObj, null, 4));
      alert("File saved successfully!");

      // Optionally reload data?
      // await handleSwitchToEditor();
    } catch (e) {
      console.error(e);
      setError("Failed to save file: " + e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToBase = async () => {
    if (!selectedFiles[0] || !selectedFiles[1]) return;
    if (!confirm("Overwrite target with base?")) return;
    setIsLoading(true);
    try {
      const contentA = await readTextFile(selectedFiles[0]);
      await writeTextFile(selectedFiles[1], contentA);
      await handleSwitchToEditor(); // Reloads editor data
      alert("Reset complete.");
    } catch (e) {
      setError(e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden font-sans">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => {}}
      />
      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        onTranslate={performTranslation}
      />

      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 transition-all">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-900">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded p-1">
              LD
            </span>
            <span>LingoDiff</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
              title="Settings">
              <Settings size={18} />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1 overflow-hidden">
          <button
            onClick={handleOpenProject}
            className="flex items-center justify-center gap-2 w-full py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md transition-colors font-medium text-sm mb-4 border border-slate-200 dark:border-slate-800">
            <FolderOpen size={16} />{" "}
            {projectPath ? "Change Project" : "Open Folder"}
          </button>
          {projectPath && (
            <div
              className="text-xs font-mono text-slate-400 truncate mb-2 px-1"
              title={projectPath}>
              {projectPath}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 -ml-2">
            {fileTree.length > 0 ? (
              fileTree.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  onSelect={handleFileSelect}
                  selectedFiles={selectedFiles}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 text-sm mt-10">
                No files
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Selection Status */}
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Comparison
          </div>
          <div className="space-y-2">
            <div
              className={`text-xs truncate py-1 px-2 rounded ${
                selectedFiles[0]
                  ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "text-slate-400 italic"
              }`}>
              <span className="font-bold mr-1 text-slate-400 select-none">
                A:
              </span>{" "}
              {selectedFiles[0]
                ? selectedFiles[0].split(/[\\/]/).pop()
                : "Select Base"}
            </div>
            <div
              className={`text-xs truncate py-1 px-2 rounded ${
                selectedFiles[1]
                  ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "text-slate-400 italic"
              }`}>
              <span className="font-bold mr-1 text-slate-400 select-none">
                B:
              </span>{" "}
              {selectedFiles[1]
                ? selectedFiles[1].split(/[\\/]/).pop()
                : "Select Target"}
            </div>
          </div>
          <button
            disabled={selectedFiles.length !== 2 || isLoading}
            onClick={handleCompare}
            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-500/20">
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
            ) : (
              <GitCompare size={16} />
            )}
            Run Comparison
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-6 justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            {selectedFiles.length === 2 ? (
              <>
                <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <FileText size={14} /> {selectedFiles[0].split(/[\\/]/).pop()}
                </span>
                <ArrowRight size={14} />
                <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <FileText size={14} /> {selectedFiles[1].split(/[\\/]/).pop()}
                </span>
                {viewMode === "diff" && (
                  <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                    Diff Mode
                  </span>
                )}
                {viewMode === "editor" && (
                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                    Editor Mode
                  </span>
                )}
              </>
            ) : (
              <span>Select two files to start</span>
            )}
          </div>

          <div className="flex gap-2">
            {/* Toolbar Actions */}
            {viewMode === "diff" && diffResult && (
              <button
                onClick={handleSwitchToEditor}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">
                <Edit size={14} /> Open Editor
              </button>
            )}

            {viewMode === "editor" && editorData && (
              <>
                <button
                  onClick={handleResetToBase}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded border border-transparent hover:border-red-200 transition-colors mr-2">
                  Reset to Original
                </button>
                <button
                  onClick={handleTranslateClick}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded shadow-sm">
                  <Languages size={14} /> Translate
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow-sm">
                  <Save size={14} /> Save Changes
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
              <div className="text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg max-w-md text-center">
                <p className="font-bold mb-1">Error</p>
                <p className="text-sm mb-4">{error}</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-200 dark:hover:bg-slate-700">
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      setProjectPath(null);
                      setFileTree([]);
                      localStorage.removeItem("last_project_path");
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                    Close Project
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {viewMode === "diff" && diffResult && (
                <DiffViewer
                  diff={diffResult}
                  onValueChange={handleDiffValueChange}
                />
              )}
              {viewMode === "editor" && editorData && (
                <EditorView
                  data={editorData}
                  onValueChange={handleEditorValueChange}
                />
              )}

              {!diffResult && !editorData && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 dark:bg-slate-900">
                  <GitCompare size={48} className="mb-4 opacity-20" />
                  <p>Select two files and click "Run Comparison"</p>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 z-20 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md space-y-4 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>

                    {loadingStatus && (
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 animate-pulse">
                        {loadingStatus}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}></div>
                    </div>

                    <button
                      onClick={handleCancelTranslation}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors">
                      Cancel Operation
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="lingodiff-theme">
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
