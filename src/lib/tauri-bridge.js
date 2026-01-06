import { invoke } from "@tauri-apps/api/core";

export const tauriBridge = {
  /**
   * Test command
   * @param {string} name
   * @returns {Promise<string>}
   */
  greet: async (name) => {
    return await invoke("greet", { name });
  },

  /**
   * Scan directory recursively
   * @param {string} path
   * @returns {Promise<Array<any>>}
   */
  scanDirectory: async (path) => {
    return await invoke("scan_directory", { path });
  },

  /**
   * Compare two files and get smart diff
   * @param {string} pathA
   * @param {string} pathB
   * @returns {Promise<{renamed: Array, modified: Array, added: Array, deleted: Array}>}
   */
  compareFiles: async (pathA, pathB) => {
    return await invoke("compare_files", { pathA, pathB });
  },

  /**
   * Save content to file
   * @param {string} path
   * @param {string} content
   * @returns {Promise<void>}
   */
  writeFile: async (path, content) => {
    return await invoke("save_file", { path, content });
  },

  getTranslationData: async (pathA, pathB) => {
    return await invoke("get_translation_data", { pathA, pathB });
  },
};
