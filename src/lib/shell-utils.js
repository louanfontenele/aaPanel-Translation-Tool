export const openFile = async (path) => {
  try {
    // Use Tauri's shell plugin to open the file with the system default application.
    // This requires "shell": {"allow": [{"name": "open", "cmd": "open"}]} permission,
    // or effectively `shell:allow-open` which we added.
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(path);
  } catch (e) {
    console.error("Failed to open file", e);
    throw e;
  }
};
