use super::targets::{CleanableItem, CleanerCategory, ScanResult};
use rayon::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct Scanner;

impl Scanner {
    /// Discovers directories matching a given cleaner category for the current operating system.
    pub fn get_category_paths(category: CleanerCategory) -> Vec<PathBuf> {
        let mut paths = Vec::new();

        #[cfg(target_os = "windows")]
        {
            let local_app_data = std::env::var("LOCALAPPDATA").ok().map(PathBuf::from);
            let app_data = std::env::var("APPDATA").ok().map(PathBuf::from);
            let user_profile = std::env::var("USERPROFILE").ok().map(PathBuf::from);

            match category {
                CleanerCategory::UserTemp => {
                    paths.push(std::env::temp_dir());
                }
                CleanerCategory::SystemTemp => {
                    paths.push(PathBuf::from(r"C:\Windows\Temp"));
                }
                CleanerCategory::BrowserCache => {
                    if let Some(ref local) = local_app_data {
                        // Google Chrome Cache
                        paths.push(local.join(r"Google\Chrome\User Data\Default\Cache\Cache_Data"));
                        // Microsoft Edge Cache
                        paths.push(local.join(r"Microsoft\Edge\User Data\Default\Cache\Cache_Data"));
                        // Brave Cache
                        paths.push(local.join(r"BraveSoftware\Brave-Browser\User Data\Default\Cache\Cache_Data"));
                    }
                    if let Some(ref roaming) = app_data {
                        // Mozilla Firefox Cache
                        paths.push(roaming.join(r"Mozilla\Firefox\Profiles"));
                    }
                }
                CleanerCategory::CrashLogs => {
                    if let Some(ref local) = local_app_data {
                        paths.push(local.join(r"CrashDumps"));
                    }
                    if let Some(ref profile) = user_profile {
                        paths.push(profile.join(r"AppData\Local\Microsoft\Windows\WER\ReportArchive"));
                    }
                }
                CleanerCategory::ThumbnailCache => {
                    if let Some(ref local) = local_app_data {
                        paths.push(local.join(r"Microsoft\Windows\Explorer"));
                    }
                }
                CleanerCategory::RecycleBin => {
                    // Windows Recycle Bin is handled via shell call or $Recycle.Bin
                    paths.push(PathBuf::from(r"C:\$Recycle.Bin"));
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let home = std::env::var("HOME").ok().map(PathBuf::from);
            match category {
                CleanerCategory::UserTemp | CleanerCategory::SystemTemp => {
                    paths.push(PathBuf::from("/tmp"));
                    paths.push(PathBuf::from("/var/tmp"));
                }
                CleanerCategory::BrowserCache => {
                    if let Some(ref h) = home {
                        paths.push(h.join(".cache/google-chrome/Default/Cache"));
                        paths.push(h.join(".cache/mozilla/firefox"));
                    }
                }
                CleanerCategory::CrashLogs => {
                    paths.push(PathBuf::from("/var/log"));
                }
                CleanerCategory::ThumbnailCache => {
                    if let Some(ref h) = home {
                        paths.push(h.join(".cache/thumbnails"));
                    }
                }
                CleanerCategory::RecycleBin => {
                    if let Some(ref h) = home {
                        paths.push(h.join(".local/share/Trash"));
                    }
                }
            }
        }

        // Keep only directories that actually exist
        paths.into_iter().filter(|p| p.exists()).collect()
    }

    /// Scans a single category with symlink and permission safeguards.
    pub fn scan_category(category: CleanerCategory) -> ScanResult {
        let root_paths = Self::get_category_paths(category);
        let mut items = Vec::new();
        let mut total_bytes: u64 = 0;

        for root in root_paths {
            // Walk the tree. CRITICAL SECURITY: Do NOT follow symlinks to avoid symlink race traversal!
            for entry in WalkDir::new(&root)
                .follow_links(false)
                .max_depth(10)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path().to_path_buf();
                
                // Inspect metadata without dereferencing symlinks
                if let Ok(meta) = fs::symlink_metadata(&path) {
                    let is_symlink = meta.file_type().is_symlink();
                    
                    // Skip root directory itself
                    if path == root {
                        continue;
                    }

                    if meta.is_file() || is_symlink {
                        let size = if is_symlink { 0 } else { meta.len() };
                        
                        // Check if file is currently open/locked
                        let is_locked = if meta.is_file() {
                            fs::OpenOptions::new()
                                .read(true)
                                .open(&path)
                                .is_err()
                        } else {
                            false
                        };

                        total_bytes += size;
                        items.push(CleanableItem {
                            path,
                            size_bytes: size,
                            category,
                            is_locked,
                            is_symlink,
                        });
                    }
                }
            }
        }

        let file_count = items.len();
        ScanResult {
            category,
            file_count,
            total_bytes,
            items,
            is_pro_restricted: category.is_pro_only(),
        }
    }

    /// Scans multiple categories concurrently using Rayon thread-pool.
    pub fn scan_all(categories: &[CleanerCategory]) -> Vec<ScanResult> {
        categories
            .par_iter()
            .map(|&cat| Self::scan_category(cat))
            .collect()
    }
}
