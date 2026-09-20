use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
    pub impact: String, // "High", "Medium", "Low"
}

pub struct StartupManager;

impl StartupManager {
    /// Lists startup items across Windows registry and user startup directory.
    pub fn list_items() -> Vec<StartupItem> {
        let mut items = Vec::new();

        #[cfg(target_os = "windows")]
        {
            use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
            use winreg::RegKey;

            // 1. Scan HKCU Run (Active)
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok(run_key) = hkcu.open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                KEY_READ,
            ) {
                for (name, val) in run_key.enum_values().filter_map(|x| x.ok()) {
                    let cmd = val.to_string();
                    let impact = Self::estimate_impact(&name, &cmd);
                    items.push(StartupItem {
                        id: format!("hkcu_run_{}", name),
                        name: name.clone(),
                        command: cmd,
                        location: "HKCU\\...\\Run".to_string(),
                        enabled: true,
                        impact,
                    });
                }
            }

            // 2. Scan PurSys Disabled registry branch
            if let Ok(disabled_key) = hkcu.open_subkey_with_flags(
                r"Software\PurSys\DisabledStartup",
                KEY_READ,
            ) {
                for (name, val) in disabled_key.enum_values().filter_map(|x| x.ok()) {
                    let cmd = val.to_string();
                    let impact = Self::estimate_impact(&name, &cmd);
                    items.push(StartupItem {
                        id: format!("hkcu_disabled_{}", name),
                        name: name.clone(),
                        command: cmd,
                        location: "PurSys\\Disabled".to_string(),
                        enabled: false,
                        impact,
                    });
                }
            }

            // 3. Scan HKLM Run (Read-only without elevation)
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            if let Ok(run_key) = hklm.open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                KEY_READ,
            ) {
                for (name, val) in run_key.enum_values().filter_map(|x| x.ok()) {
                    let cmd = val.to_string();
                    let impact = Self::estimate_impact(&name, &cmd);
                    items.push(StartupItem {
                        id: format!("hklm_run_{}", name),
                        name: name.clone(),
                        command: cmd,
                        location: "HKLM\\...\\Run".to_string(),
                        enabled: true,
                        impact,
                    });
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            // Cross-platform fallback / POSIX mock items
            items.push(StartupItem {
                id: "posix_sample_1".to_string(),
                name: "PurSys Agent".to_string(),
                command: "/opt/pursys/pursys-agent --daemon".to_string(),
                location: "~/.config/autostart".to_string(),
                enabled: true,
                impact: "Low".to_string(),
            });
        }

        items
    }

    /// Toggles an item between enabled and disabled non-destructively.
    pub fn toggle_item(name: &str, enable: bool) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            use winreg::enums::{HKEY_CURRENT_USER, KEY_ALL_ACCESS};
            use winreg::RegKey;

            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let active_path = r"Software\Microsoft\Windows\CurrentVersion\Run";
            let disabled_path = r"Software\PurSys\DisabledStartup";

            if enable {
                // Move from disabled to active
                let (disabled_key, _) = hkcu.create_subkey(disabled_path).map_err(|e| e.to_string())?;
                let val: String = disabled_key.get_value(name).map_err(|e| e.to_string())?;
                
                let (active_key, _) = hkcu.create_subkey(active_path).map_err(|e| e.to_string())?;
                active_key.set_value(name, &val).map_err(|e| e.to_string())?;
                let _ = disabled_key.delete_value(name);
            } else {
                // Move from active to disabled
                let active_key = hkcu.open_subkey_with_flags(active_path, KEY_ALL_ACCESS).map_err(|e| e.to_string())?;
                let val: String = active_key.get_value(name).map_err(|e| e.to_string())?;
                
                let (disabled_key, _) = hkcu.create_subkey(disabled_path).map_err(|e| e.to_string())?;
                disabled_key.set_value(name, &val).map_err(|e| e.to_string())?;
                let _ = active_key.delete_value(name);
            }
            Ok(())
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = (name, enable);
            Ok(())
        }
    }

    fn estimate_impact(name: &str, cmd: &str) -> String {
        let text = format!("{} {}", name, cmd).to_lowercase();
        if text.contains("update") || text.contains("helper") || text.contains("tray") {
            "Low".to_string()
        } else if text.contains("cloud") || text.contains("sync") || text.contains("discord") || text.contains("steam") {
            "High".to_string()
        } else {
            "Medium".to_string()
        }
    }
}
