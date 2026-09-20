use std::io::{self, BufRead, Write};
use serde::{Deserialize, Serialize};

use pursys_core::{
    Cleaner, CleanerCategory, FreemiumGuard, LicenseTier, LicenseVerifier,
    MemoryOptimizer, ProFeature, Scanner, StartupManager, SystemInfo,
};

#[derive(Debug, Deserialize)]
#[serde(tag = "action", content = "payload")]
enum IpcRequest {
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "get_os_info")]
    GetOsInfo,
    #[serde(rename = "get_metrics")]
    GetMetrics,
    #[serde(rename = "get_hwid")]
    GetHwid,
    #[serde(rename = "verify_license")]
    VerifyLicense { key: String },
    #[serde(rename = "scan")]
    Scan { categories: Vec<CleanerCategory> },
    #[serde(rename = "clean")]
    Clean {
        categories: Vec<CleanerCategory>,
        license_key: Option<String>,
    },
    #[serde(rename = "flush_ram")]
    FlushRam { license_key: Option<String> },
    #[serde(rename = "list_startup")]
    ListStartup,
    #[serde(rename = "toggle_startup")]
    ToggleStartup {
        name: String,
        enable: bool,
        license_key: Option<String>,
    },
}

#[derive(Debug, Serialize)]
struct IpcResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T> IpcResponse<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    // Line-delimited JSON-RPC loop over stdio
    for line in stdin.lock().lines() {
        let input = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if input.trim().is_empty() {
            continue;
        }

        let req: Result<IpcRequest, _> = serde_json::from_str(&input);
        match req {
            Ok(IpcRequest::Ping) => {
                let resp = IpcResponse::ok("pong");
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::GetOsInfo) => {
                let info = SystemInfo::get_os_info();
                let resp = IpcResponse::ok(info);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::GetMetrics) => {
                let metrics = MemoryOptimizer::get_metrics();
                let resp = IpcResponse::ok(metrics);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::GetHwid) => {
                let hwid = LicenseVerifier::get_hwid();
                let resp = IpcResponse::ok(hwid);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::VerifyLicense { key }) => {
                let state = LicenseVerifier::verify_key(&key);
                let resp = IpcResponse::ok(state);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::Scan { categories }) => {
                let results = Scanner::scan_all(&categories);
                let resp = IpcResponse::ok(results);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::Clean { categories, license_key }) => {
                // HARDENED FREEMIUM ENFORCEMENT IN RUST:
                let lic_state = LicenseVerifier::verify_key(license_key.as_deref().unwrap_or(""));
                
                // If any category is pro-only, check license
                let has_pro_cat = categories.iter().any(|c| c.is_pro_only());
                if has_pro_cat {
                    if let Err(e) = FreemiumGuard::check_permission(&lic_state, ProFeature::DeepSystemTempCleaning) {
                        let resp: IpcResponse<()> = IpcResponse::err(e);
                        send_response(&mut stdout, &resp);
                        continue;
                    }
                }

                // Execute scans and cleans
                let scan_results = Scanner::scan_all(&categories);
                let clean_results: Vec<_> = scan_results
                    .iter()
                    .map(|scan| Cleaner::clean_scan_result(scan))
                    .collect();

                let resp = IpcResponse::ok(clean_results);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::FlushRam { license_key }) => {
                // Check Pro license for RAM flush
                let lic_state = LicenseVerifier::verify_key(license_key.as_deref().unwrap_or(""));
                if let Err(e) = FreemiumGuard::check_permission(&lic_state, ProFeature::AdvancedRamFlush) {
                    let resp: IpcResponse<()> = IpcResponse::err(e);
                    send_response(&mut stdout, &resp);
                    continue;
                }

                let result = MemoryOptimizer::flush_working_set();
                let resp = IpcResponse::ok(result);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::ListStartup) => {
                let items = StartupManager::list_items();
                let resp = IpcResponse::ok(items);
                send_response(&mut stdout, &resp);
            }
            Ok(IpcRequest::ToggleStartup { name, enable, license_key }) => {
                // Check Pro license for startup toggle
                let lic_state = LicenseVerifier::verify_key(license_key.as_deref().unwrap_or(""));
                if let Err(e) = FreemiumGuard::check_permission(&lic_state, ProFeature::StartupOptimization) {
                    let resp: IpcResponse<()> = IpcResponse::err(e);
                    send_response(&mut stdout, &resp);
                    continue;
                }

                match StartupManager::toggle_item(&name, enable) {
                    Ok(_) => {
                        let resp = IpcResponse::ok(format!("Startup item '{}' set to enabled={}", name, enable));
                        send_response(&mut stdout, &resp);
                    }
                    Err(e) => {
                        let resp: IpcResponse<()> = IpcResponse::err(e);
                        send_response(&mut stdout, &resp);
                    }
                }
            }
            Err(e) => {
                let resp: IpcResponse<()> = IpcResponse::err(format!("Invalid request format: {}", e));
                send_response(&mut stdout, &resp);
            }
        }
    }
}

fn send_response<T: Serialize>(stdout: &mut io::Stdout, resp: &T) {
    if let Ok(serialized) = serde_json::to_string(resp) {
        let _ = writeln!(stdout, "{}", serialized);
        let _ = stdout.flush();
    }
}
