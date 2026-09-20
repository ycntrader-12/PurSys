use super::verifier::{LicenseState, LicenseTier};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProFeature {
    DeepSystemTempCleaning,
    ThumbnailCacheCleaning,
    AdvancedRamFlush,
    StartupOptimization,
    AutomatedSchedule,
}

impl ProFeature {
    pub fn name(&self) -> &'static str {
        match self {
            ProFeature::DeepSystemTempCleaning => "Deep Windows System Temp Cleaner",
            ProFeature::ThumbnailCacheCleaning => "Explorer Thumbnail & Icon Cache Reset",
            ProFeature::AdvancedRamFlush => "Native Working Set RAM Compactor",
            ProFeature::StartupOptimization => "Startup Application Manager & Disabler",
            ProFeature::AutomatedSchedule => "Background Automated Maintenance",
        }
    }
}

pub struct FreemiumGuard;

impl FreemiumGuard {
    /// Enforces license permissions at the native Rust engine level.
    /// Returns Ok(()) if authorized, or Err(String) with explanation.
    pub fn check_permission(state: &LicenseState, feature: ProFeature) -> Result<(), String> {
        if !state.is_valid {
            return Err("License is invalid or has expired.".to_string());
        }

        match state.tier {
            LicenseTier::Pro | LicenseTier::Enterprise => Ok(()),
            LicenseTier::Free => Err(format!(
                "Feature '{}' is restricted to PurSys PRO subscribers. Upgrade your license to unlock.",
                feature.name()
            )),
        }
    }
}
