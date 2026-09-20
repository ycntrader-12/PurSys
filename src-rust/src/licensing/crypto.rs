use sha2::{Digest, Sha256};

pub struct HardwareFingerprint;

impl HardwareFingerprint {
    /// Generates a robust, reproducible hardware fingerprint (HWID) for this machine.
    pub fn generate() -> String {
        let mut hasher = Sha256::new();

        #[cfg(target_os = "windows")]
        {
            use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ};
            use winreg::RegKey;

            // Use MachineGuid from Windows Registry
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            if let Ok(crypto_key) = hklm.open_subkey_with_flags(
                r"SOFTWARE\Microsoft\Cryptography",
                KEY_READ,
            ) {
                if let Ok(guid) = crypto_key.get_value::<String, _>("MachineGuid") {
                    hasher.update(guid.as_bytes());
                }
            }
        }

        // Include OS architecture and environment factors
        hasher.update(std::env::consts::ARCH.as_bytes());
        hasher.update(std::env::consts::OS.as_bytes());

        if let Ok(user) = std::env::var("USERNAME").or_else(|_| std::env::var("USER")) {
            hasher.update(user.as_bytes());
        }

        let result = hasher.finalize();
        format!("{:x}", result)
    }
}
