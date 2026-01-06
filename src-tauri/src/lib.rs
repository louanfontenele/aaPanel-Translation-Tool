use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct DiffResult {
    renamed: Vec<RenamedKey>,
    modified: Vec<ModifiedKey>,
    added: Vec<DiffEntry>,
    deleted: Vec<DiffEntry>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RenamedKey {
    old_key: String,
    new_key: String,
    value: Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ModifiedKey {
    key: String,
    old_value: Value,
    new_value: Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct DiffEntry {
    key: String,
    value: Value,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<FileNode>, String> {
    let root_path = Path::new(&path);
    if !root_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    fn build_tree(dir: &Path) -> Result<Vec<FileNode>, String> {
        let mut children = Vec::new();
        if dir.is_dir() {
             match fs::read_dir(dir) {
                Ok(entries) => {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            // Skip hidden files/folders (starts withdot)
                            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                            if name.starts_with('.') {
                                continue;
                            }

                            let is_dir = path.is_dir();
                            
                            let node_children = if is_dir {
                                match build_tree(&path) {
                                    Ok(c) => Some(c),
                                    Err(_) => None, // If sub-folder fails, just return None (don't crash key)
                                }
                            } else {
                                None
                            };

                            children.push(FileNode {
                                name,
                                path: path.to_string_lossy().to_string(),
                                is_dir,
                                children: node_children,
                            });
                        }
                    }
                }
                Err(e) => return Err(e.to_string()),
            }
        }
        children.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)) // Dirs first
        });
        Ok(children)
    }

    match build_tree(root_path) {
        Ok(tree) => Ok(tree),
        Err(e) => Err(e),
    }
}

fn flatten_json(prefix: String, value: &Value, map: &mut HashMap<String, Value>) {
    match value {
        Value::Object(obj) => {
            for (k, v) in obj {
                let new_key = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{}.{}", prefix, k)
                };
                flatten_json(new_key, v, map);
            }
        }
        _ => {
            map.insert(prefix, value.clone());
        }
    }
}

#[tauri::command]
fn compare_files(path_a: String, path_b: String) -> Result<DiffResult, String> {
    let content_a = fs::read_to_string(&path_a).map_err(|e| e.to_string())?;
    let content_b = fs::read_to_string(&path_b).map_err(|e| e.to_string())?;

    let json_a: Value = serde_json::from_str(&content_a).map_err(|e| format!("Error parsing file A: {}", e))?;
    let json_b: Value = serde_json::from_str(&content_b).map_err(|e| format!("Error parsing file B: {}", e))?;

    let mut map_a = HashMap::new();
    let mut map_b = HashMap::new();

    flatten_json("".to_string(), &json_a, &mut map_a);
    flatten_json("".to_string(), &json_b, &mut map_b);

    let mut renamed = Vec::new();
    let mut modified = Vec::new();
    let mut added = Vec::new();
    let mut deleted = Vec::new();

    let keys_a: HashSet<String> = map_a.keys().cloned().collect();
    let keys_b: HashSet<String> = map_b.keys().cloned().collect();

    let common_keys: HashSet<_> = keys_a.intersection(&keys_b).collect();
    let only_in_a: HashSet<_> = keys_a.difference(&keys_b).cloned().collect();
    let mut only_in_b: HashSet<_> = keys_b.difference(&keys_a).cloned().collect();

    for key in common_keys {
        if map_a[key] != map_b[key] {
            modified.push(ModifiedKey {
                key: key.clone(),
                old_value: map_a[key].clone(),
                new_value: map_b[key].clone(),
            });
        }
    }

    for key_a in only_in_a {
        let val_a = &map_a[&key_a];
        let mut found_rename = None;
        for key_b in &only_in_b {
            if &map_b[key_b] == val_a {
                found_rename = Some(key_b.clone());
                break;
            }
        }
        if let Some(key_b) = found_rename {
            renamed.push(RenamedKey {
                old_key: key_a,
                new_key: key_b.clone(),
                value: val_a.clone(),
            });
            only_in_b.remove(&key_b);
        } else {
            deleted.push(DiffEntry {
                key: key_a.clone(),
                value: val_a.clone(),
            });
        }
    }

    for key_b in only_in_b {
        let val_b = &map_b[&key_b];
         added.push(DiffEntry {
            key: key_b.clone(),
            value: val_b.clone(),
        });
    }

    Ok(DiffResult {
        renamed,
        modified,
        added,
        deleted,
    })
}


#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}


#[derive(Serialize, Deserialize, Debug, Clone)]
struct TranslationItem {
    key: String,
    source: Option<Value>,
    target: Option<Value>,
}

#[tauri::command]
fn get_translation_data(path_a: String, path_b: String) -> Result<Vec<TranslationItem>, String> {
    let content_a = fs::read_to_string(&path_a).map_err(|e| e.to_string())?;
    // If path_b doesn't exist yet (new file), treat as empty
    let content_b = fs::read_to_string(&path_b).unwrap_or_else(|_| "{}".to_string());

    let json_a: Value = serde_json::from_str(&content_a).map_err(|e| format!("Error parsing file A: {}", e))?;
    let json_b: Value = serde_json::from_str(&content_b).unwrap_or(Value::Object(serde_json::Map::new()));

    let mut map_a = HashMap::new();
    let mut map_b = HashMap::new();

    flatten_json("".to_string(), &json_a, &mut map_a);
    flatten_json("".to_string(), &json_b, &mut map_b);

    let mut all_keys: HashSet<String> = HashSet::new();
    for k in map_a.keys() { all_keys.insert(k.clone()); }
    for k in map_b.keys() { all_keys.insert(k.clone()); }

    let mut result = Vec::new();
    // Sort keys for consistent UI
    let mut sorted_keys: Vec<String> = all_keys.into_iter().collect();
    sorted_keys.sort();

    for key in sorted_keys {
        result.push(TranslationItem {
            key: key.clone(),
            source: map_a.get(&key).cloned(),
            target: map_b.get(&key).cloned(),
        });
    }

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, scan_directory, compare_files, save_file, get_translation_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
