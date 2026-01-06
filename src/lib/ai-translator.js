/**
 * Simple AI Translator wrapper calling OpenAI or Gemini
 */

export async function fetchOpenAIModels(apiKey) {
  if (!apiKey) return [];
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error("Failed to fetch OpenAI models");
    const data = await response.json();
    return data.data
      .filter((m) => m.id.includes("gpt")) // Filter for GPT models
      .map((m) => m.id)
      .sort();
  } catch (e) {
    console.error("OpenAI Models Fetch Error:", e);
    return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]; // Fallback
  }
}

export async function fetchGeminiModels(apiKey) {
  if (!apiKey) return [];
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!response.ok) throw new Error("Failed to fetch Gemini models");
    const data = await response.json();
    return data.models
      .filter((m) => m.name.toLowerCase().includes("gemini")) // Broader filter
      .map((m) => m.name.replace("models/", "")) // Remove prefix
      .sort();
  } catch (e) {
    console.error("Gemini Models Fetch Error:", e);
    // Fallback list as of late 2024/early 2025
    return ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-pro"];
  }
}

export async function translateBatch(
  keys,
  sourceValues,
  targetValues,
  context,
  apiKey,
  provider = "gemini",
  modelValue = null,
  targetLang = "Portuguese (Brazil)",
  projectName = "Software Application",
  projectDescription = ""
) {
  if (!apiKey) throw new Error("API Key is missing. Please check Settings.");

  // Sanitize key just in case
  apiKey = apiKey.trim();

  if (apiKey.includes(" ")) {
    throw new Error(
      "Invalid API Key found. It seems to contain spaces or text. Please check Settings and paste ONLY the key (starts with AIza...)"
    );
  }

  const model =
    modelValue || (provider === "openai" ? "gpt-3.5-turbo" : "gemini-pro");
  // Ensure we have a target language
  const language = targetLang || "Portuguese (Brazil)";

  const systemPrompt = `You are a professional software localization expert.
You will receive a JSON object where keys are the specific IDs and values are the source text in English (or the source language).
Your task is to translate the source text into ${language} with HIGH FIDELITY to the software context.

### CRITICAL RULES:
1. **Preserve Case**: If the source is lowercase ("connect fail"), keeping it lowercase ("falha na conexão") is usually preferred unless it violates grammar significantly. If it's Title Case ("Connect Fail"), use Title Case ("Falha na Conexão").
2. **Preserve Variables**: Do not translate or alter HTML tags, placeholders like %s, {0}, {name}, or special tokens.
3. **Software Context**: This is for **${projectName}**${
    projectDescription ? `, which is ${projectDescription}` : ""
  }. Treat specific terms related to this software as technical terms.
4. **Natural & Professional**: Use idiomatic ${language}. Fix minor typos in the source if the intent is clear.
5. **No Hallucinations**: Do not explain your logic. Return ONLY valid JSON.

### USER CONTEXT:
The user provided this additional context: "${
    context || "Friendly but professional administrative panel tone"
  }"

### EXAMPLES:
Source: "connect fail" -> Target: "falha na conexão" (NOT "Falha Na Conexão" if source was lower)
Source: "Edit File" -> Target: "Editar Arquivo"
Source: "Invalid IP address" -> Target: "Endereço IP inválido"

Return ONLY the raw JSON object with all original keys and translated values. No Markdown block quotes.
`;

  // Construct the payload
  const payloadObject = {};
  keys.forEach((key, index) => {
    payloadObject[key] = sourceValues[index];
  });

  const userPrompt = JSON.stringify(payloadObject, null, 2);
  console.log(
    `[AI-Translator] Sending ${keys.length} keys to ${model} (${provider})`
  );

  let content = "";

  try {
    if (provider === "openai") {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "OpenAI API Error");
      }

      const data = await response.json();
      content = data.choices[0].message.content;
    } else {
      // Gemini (Google)
      // Model often needs to be part of URL: models/MODEL_NAME:generateContent
      const modelName = model.startsWith("models/") ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + "\n\nInput JSON:\n" + userPrompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json", // Force JSON output for models that support it
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Gemini API Error Detail:", err);
        const code = err.error?.code || response.status;
        const msg = err.error?.message || "Gemini API Error";
        throw new Error(`Gemini Error (${code}): ${msg}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        content = data.candidates[0].content.parts[0].text;
      } else {
        console.error("Gemini Unexpected Response:", data);
        throw new Error("Invalid response from Gemini (No candidates)");
      }
    }

    console.log(
      "[AI-Translator] Received Raw Content:",
      content.substring(0, 100) + "..."
    );

    // Clean up markdown block if present
    content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    // Parse
    const parsed = JSON.parse(content);
    console.log(`[AI-Translator] parsed ${Object.keys(parsed).length} keys.`);
    return parsed;
  } catch (e) {
    console.error("AI Translation Failed:", e);
    throw e;
  }
}
