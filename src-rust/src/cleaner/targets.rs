use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Categories of files that PurSys can scan and clean.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CleanerCategory {
    UserTemp,
    SystemTemp,
    BrowserCache,
    CrashLogs,
    ThumbnailCache,
    RecycleBin,
}

impl CleanerCategory {
    /// Returns true if this category is exclusive to Pro tier users.
    pub fn is_pro_only(&self) -> bool {
        matches!(self, CleanerCategory::SystemTemp | CleanerCategory::ThumbnailCache)
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            CleanerCategory::UserTemp => "User Temporary Files",
            CleanerCategory::SystemTemp => "System & Windows Temp (Admin/Pro)",
            CleanerCategory::BrowserCache => "Web Browser Caches (Edge, Chrome, Firefox)",
            CleanerCategory::CrashLogs => "Application Crash Dumps & Logs",
            CleanerCategory::ThumbnailCache => "System Thumbnail & Icon Cache (Pro)",
            CleanerCategory::RecycleBin => "Recycle Bin / Trash",
        }
    }
}

/// Description of an individual cleanable file or folder entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanableItem {
    pub path: PathBuf,
    pub size_bytes: u64,
    pub category: CleanerCategory,
    pub is_locked: bool,
    pub is_symlink: bool,
}

/// Summary report of a scan operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub category: CleanerCategory,
    pub file_count: usize,
    pub total_bytes: u64,
    pub items: Vec<CleanableItem>,
    pub is_pro_restricted: bool,
}

/// Result of an actual cleaning execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanResult {
    pub category: CleanerCategory,
    pub files_deleted: usize,
    pub bytes_freed: u64,
    pub errors: Vec<String>,
}
