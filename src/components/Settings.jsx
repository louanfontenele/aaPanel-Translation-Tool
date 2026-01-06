import { useState, useEffect } from "react";
import { X, Save, RefreshCw } from "lucide-react";
import { fetchGeminiModels, fetchOpenAIModels } from "../lib/ai-translator";
import { MODEL_SPECS } from "../lib/ai-models";

export function SettingsModal({ isOpen, onClose, onSave }) {
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [context, setContext] = useState("");

  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [openaiModel, setOpenaiModel] = useState("gpt-3.5-turbo");
  const [targetLang, setTargetLang] = useState("Portuguese (Brazil)");
  const [projectName, setProjectName] = useState("aaPanel");
  const [projectDescription, setProjectDescription] = useState("");
  const [batchSize, setBatchSize] = useState(600); // New state for chunk size

  const [geminiModelsList, setGeminiModelsList] = useState([]);
  const [openaiModelsList, setOpenaiModelsList] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const gKey = localStorage.getItem("gemini_key") || "";
      const oKey = localStorage.getItem("openai_key") || "";
      setGeminiKey(gKey);
      setOpenaiKey(oKey);
      setContext(localStorage.getItem("translation_context") || "");
      setTargetLang(
        localStorage.getItem("target_lang") || "Portuguese (Brazil)"
      );
      setProjectName(localStorage.getItem("project_name") || "aaPanel");
      setProjectDescription(localStorage.getItem("project_description") || "");
      setBatchSize(parseInt(localStorage.getItem("batch_size")) || 600);

      setGeminiModel(
        localStorage.getItem("gemini_model") || "gemini-1.5-flash"
      );
      setOpenaiModel(localStorage.getItem("openai_model") || "gpt-3.5-turbo");

      // Auto-fetch if keys exist
      if (gKey) loadGeminiModels(gKey);
      if (oKey) loadOpenAIModels(oKey);
    }
  }, [isOpen]);

  const loadGeminiModels = async (key) => {
    try {
      setLoadingModels(true);
      const list = await fetchGeminiModels(key);
      if (list.length > 0) {
        setGeminiModelsList(list);
        console.log("Fetched Gemini models:", list);
      } else {
        // Fallback to basic known text models if list is empty but no error?
        // Or just show specs list? User wants API source.
        setGeminiModelsList(Object.keys(MODEL_SPECS));
      }
    } catch (e) {
      console.error("Failed to fetch models, falling back to known list:", e);
      setGeminiModelsList(Object.keys(MODEL_SPECS));
    } finally {
      setLoadingModels(false);
    }
  };

  const loadOpenAIModels = async (key) => {
    try {
      const list = await fetchOpenAIModels(key);
      if (list.length > 0) setOpenaiModelsList(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshModels = async () => {
    setLoadingModels(true);
    await Promise.all([
      loadGeminiModels(geminiKey),
      loadOpenAIModels(openaiKey),
    ]);
    setLoadingModels(false);
  };

  const handleSave = () => {
    // Sanitize keys (remove whitespace)
    const cleanGeminiKey = geminiKey.trim();
    const cleanOpenaiKey = openaiKey.trim();

    setGeminiKey(cleanGeminiKey);
    setOpenaiKey(cleanOpenaiKey);

    if (cleanGeminiKey.includes(" ")) {
      alert(
        "Invalid Gemini API Key: API Keys cannot contain spaces. You seem to have pasted a sentence/text instead of the actual code starting with 'AIza...'. Please check and paste ONLY the key."
      );
      return;
    }

    if (cleanOpenaiKey.includes(" ")) {
      alert("Invalid OpenAI API Key: API Keys cannot contain spaces.");
      return;
    }

    localStorage.setItem("gemini_key", cleanGeminiKey);
    localStorage.setItem("openai_key", cleanOpenaiKey);
    localStorage.setItem("translation_context", context);
    localStorage.setItem("target_lang", targetLang);
    localStorage.setItem("project_name", projectName);
    localStorage.setItem("project_description", projectDescription);
    localStorage.setItem("batch_size", batchSize);
    localStorage.setItem("gemini_model", geminiModel);
    localStorage.setItem("openai_model", openaiModel);
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleRefreshModels}
              disabled={loadingModels}
              className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700">
              <RefreshCw
                size={12}
                className={loadingModels ? "animate-spin" : ""}
              />{" "}
              Refresh Models
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              onBlur={() => loadGeminiModels(geminiKey)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter Gemini API key"
            />
            {geminiModelsList.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Model:</span>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="text-sm bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-1">
                  {geminiModelsList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              onBlur={() => loadOpenAIModels(openaiKey)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter OpenAI API key"
            />
            {openaiModelsList.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Model:</span>
                <select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="text-sm bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-1">
                  {openaiModelsList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Project Name (to be translated)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g. aaPanel, WordPress"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Where is the project?
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full h-20 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Brief description (e.g., 'Web Hosting Control Panel', 'E-commerce Store')"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between">
              <span>Batch Size (Lines per request)</span>
              <span className="text-xs font-normal text-slate-400">
                Default: 600
              </span>
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 600)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="600"
              min="10"
              max="2000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Target Language
            </label>
            <input
              type="text"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g. Portuguese (Brazil), Spanish, French"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Translation Context
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Describe the project context, tone of voice, terminology, etc..."
            />
            <p className="text-xs text-slate-500">
              This context will be sent to the AI to improve translation
              accuracy.
            </p>
          </div>
        </div>

        <footer className="flex-none px-6 py-4 bg-slate-50 dark:bg-slate-950/50 rounded-b-lg border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2">
            <Save size={16} />
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
}
