use super::targets::{CleanResult, CleanerCategory, ScanResult};
use rayon::prelude::*;
use std::fs;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Mutex;

pub struct Cleaner;

impl Cleaner {
    /// Cleans items found in a scan result.
    /// Employs parallel deletion, TOCTOU safety, and robust error collection.
    pub fn clean_scan_result(scan: &ScanResult) -> CleanResult {
        // Special case for Recycle Bin on Windows
        #[cfg(target_os = "windows")]
        if scan.category == CleanerCategory::RecycleBin {
            return Self::empty_windows_recycle_bin();
        }

        let files_deleted = AtomicUsize::new(0);
        let bytes_freed = AtomicU64::new(0);
        let errors = Mutex::new(Vec::new());

        scan.items.par_iter().for_each(|item| {
            // If already flagged as locked or is symlink in dangerous territory, verify safely
            let path = &item.path;

            // Attempt deletion
            match fs::symlink_metadata(path) {
                Ok(meta) => {
                    let result = if meta.is_dir() && !meta.file_type().is_symlink() {
                        fs::remove_dir(path)
                    } else {
                        // remove_file will remove a symlink without touching the target!
                        fs::remove_file(path)
                    };

                    match result {
                        Ok(_) => {
                            files_deleted.fetch_add(1, Ordering::Relaxed);
                            bytes_freed.fetch_add(item.size_bytes, Ordering::Relaxed);
                        }
                        Err(e) => {
                            // Non-fatal: File might be in-use by an active application or system service
                            if let Ok(mut err_guard) = errors.lock() {
                                if err_guard.len() < 50 {
                                    // Limit error log size to avoid memory bloat
                                    err_guard.push(format!("{}: {}", path.display(), e));
                                }
                            }
                        }
                    }
                }
                Err(_) => {
                    // File already deleted or moved (TOCTOU handled gracefully)
                }
            }
        });

        CleanResult {
            category: scan.category,
            files_deleted: files_deleted.into_inner(),
            bytes_freed: bytes_freed.into_inner(),
            errors: errors.into_inner().unwrap_or_default(),
        }
    }

    #[cfg(target_os = "windows")]
    fn empty_windows_recycle_bin() -> CleanResult {
        use windows_sys::Win32::UI::Shell::SHEmptyRecycleBinW;
        use std::ptr::null;

        // Flags: SHERB_NOCONFIRMATION (0x1) | SHERB_NOPROGRESSUI (0x2) | SHERB_NOSOUND (0x4)
        let flags: u32 = 0x00000001 | 0x00000002 | 0x00000004;
        let res = unsafe { SHEmptyRecycleBinW(0, null(), flags) };

        if res == 0 {
            CleanResult {
                category: CleanerCategory::RecycleBin,
                files_deleted: 1,
                bytes_freed: 0, // OS handles internals
                errors: Vec::new(),
            }
        } else {
            CleanResult {
                category: CleanerCategory::RecycleBin,
                files_deleted: 0,
                bytes_freed: 0,
                errors: vec![format!("SHEmptyRecycleBinW returned code: 0x{:X}", res)],
            }
        }
    }
}
