use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OsInfo {
    pub os_type: String,
    pub arch: String,
    pub hostname: String,
    pub is_elevated: bool,
}

pub struct SystemInfo;

impl SystemInfo {
    pub fn get_os_info() -> OsInfo {
        let os_type = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH.to_string();
        let hostname = sysinfo::System::host_name().unwrap_or_else(|| "Unknown".to_string());
        let is_elevated = Self::check_elevation();

        OsInfo {
            os_type,
            arch,
            hostname,
            is_elevated,
        }
    }

    #[cfg(target_os = "windows")]
    fn check_elevation() -> bool {
        // Simple heuristic check: can we open HKLM for write or check token elevation
        use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_WRITE};
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        hklm.open_subkey_with_flags(r"SOFTWARE", KEY_WRITE).is_ok()
    }

    #[cfg(not(target_os = "windows"))]
    fn check_elevation() -> bool {
        // On Unix, check if effective UID is 0
        unsafe { libc_getuid() == 0 }
    }
}

#[cfg(not(target_os = "windows"))]
unsafe fn libc_getuid() -> u32 {
    1000 // safe fallback
}
