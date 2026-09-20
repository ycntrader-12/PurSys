pub mod cleaner;
pub mod optimizer;
pub mod startup;
pub mod licensing;
pub mod sys;

// Re-exports for convenient public API usage
pub use cleaner::{CleanResult, Cleaner, CleanerCategory, ScanResult, Scanner};
pub use optimizer::{MemoryMetrics, MemoryOptimizer, ProcessSummary, RamFlushResult};
pub use startup::{StartupItem, StartupManager};
pub use licensing::{
    FreemiumGuard, HardwareFingerprint, LicenseState, LicenseTier, LicenseVerifier, ProFeature,
};
pub use sys::{OsInfo, SystemInfo};
