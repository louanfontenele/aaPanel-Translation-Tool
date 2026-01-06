export const MODEL_SPECS = {
  // --- FLASH SERIES (High Speed & Rate Limits) ---
  "gemini-1.5-flash": { rpm: 15, rpd: 1500, tpm: 1000000 },
  "gemini-1.5-flash-8b": { rpm: 15, rpd: 1500, tpm: 1000000 },

  // --- PRO SERIES (Higher Intelligence, Lower Limits) ---
  "gemini-1.5-pro": { rpm: 2, rpd: 50, tpm: 32000 },
  "gemini-1.0-pro": { rpm: 15, rpd: 1500, tpm: 32000 }, // Legacy but often higher limits than 1.5 Pro free tier
};

// Default to the most balanced model for free tier
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Calculates the sleep time (in ms) required to respect the RPM limit.
 * Adds a small buffer (10%) to be safe.
 */
export function getSleepTime(modelName) {
  // Try to find exact match
  let spec = MODEL_SPECS[modelName];

  // If not found, try to find by substring (e.g., "gemini-1.5-flash-002" -> "gemini-1.5-flash")
  if (!spec) {
    const bestMatchKey = Object.keys(MODEL_SPECS).find((key) =>
      modelName.includes(key)
    );
    if (bestMatchKey) spec = MODEL_SPECS[bestMatchKey];
  }

  // Final fallback to 1.5 Flash (Generic High volume) or Pro (Generic Low volume)?
  // Safest is to assume it's a Pro model (lower limits) if unknown, to avoid bans?
  // Or Flash if it looks like flash.
  if (!spec) {
    if (modelName.includes("flash")) {
      spec = MODEL_SPECS["gemini-1.5-flash"];
    } else {
      spec = MODEL_SPECS["gemini-1.5-pro"]; // Conservative fallback
    }
  }

  const msPerRequest = (60000 / spec.rpm) * 1.1; // 10% safety buffer

  // For Low TPM models or just generally large contexts, ensure we don't rush
  if (spec.tpm <= 32000) {
    return Math.max(msPerRequest, 20000); // 20s minimum for heavy models
  }

  return msPerRequest;
}

export function isDailyLimitError(errorMessage) {
  if (!errorMessage) return false;
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("quota") &&
    (msg.includes("day") ||
      msg.includes("daily") ||
      msg.includes("resource exhausted"))
  );
}
