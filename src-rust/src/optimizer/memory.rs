use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub used_percentage: f32,
    pub cpu_usage_percentage: f32,
    pub process_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessSummary {
    pub pid: u32,
    pub name: String,
    pub memory_bytes: u64,
    pub cpu_usage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RamFlushResult {
    pub processes_trimmed: usize,
    pub bytes_reclaimed_estimate: u64,
    pub initial_used_bytes: u64,
    pub final_used_bytes: u64,
}

pub struct MemoryOptimizer;

impl MemoryOptimizer {
    /// Retrieves current real-time system performance and memory status.
    pub fn get_metrics() -> MemoryMetrics {
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_memory(MemoryRefreshKind::everything())
                .with_cpu(CpuRefreshKind::everything()),
        );
        sys.refresh_memory();
        sys.refresh_cpu_usage();

        let total = sys.total_memory();
        let used = sys.used_memory();
        let available = sys.available_memory();
        let used_percentage = if total > 0 {
            (used as f32 / total as f32) * 100.0
        } else {
            0.0
        };
        let cpu_usage_percentage = sys.global_cpu_usage();

        MemoryMetrics {
            total_bytes: total,
            used_bytes: used,
            available_bytes: available,
            used_percentage,
            cpu_usage_percentage,
            process_count: sys.processes().len(),
        }
    }

    /// Returns top memory-consuming processes.
    pub fn get_top_processes(limit: usize) -> Vec<ProcessSummary> {
        let mut sys = System::new_all();
        sys.refresh_all();

        let mut procs: Vec<ProcessSummary> = sys
            .processes()
            .iter()
            .map(|(pid, proc_info)| ProcessSummary {
                pid: pid.as_u32(),
                name: proc_info.name().to_string_lossy().to_string(),
                memory_bytes: proc_info.memory(),
                cpu_usage: proc_info.cpu_usage(),
            })
            .collect();

        procs.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
        procs.truncate(limit);
        procs
    }

    /// Flushes working set memory across processes using native system calls.
    /// On Windows, calls `EmptyWorkingSet` for accessible processes.
    pub fn flush_working_set() -> RamFlushResult {
        let initial_metrics = Self::get_metrics();
        let mut trimmed_count = 0;

        #[cfg(target_os = "windows")]
        {
            use windows_sys::Win32::Foundation::CloseHandle;
            use windows_sys::Win32::System::ProcessStatus::EmptyWorkingSet;
            use windows_sys::Win32::System::Threading::{
                OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA,
            };

            let mut sys = System::new_all();
            sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

            for (&pid, _) in sys.processes() {
                let pid_u32 = pid.as_u32();
                unsafe {
                    // Request permission to query info and adjust working set quota
                    let handle = OpenProcess(
                        PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA,
                        0,
                        pid_u32,
                    );
                    if handle != 0 {
                        let ok = EmptyWorkingSet(handle);
                        if ok != 0 {
                            trimmed_count += 1;
                        }
                        CloseHandle(handle);
                    }
                }
            }
        }

        // Sleep briefly to let OS reclaim pages
        std::thread::sleep(std::time::Duration::from_millis(150));
        let final_metrics = Self::get_metrics();

        let bytes_reclaimed = if initial_metrics.used_bytes > final_metrics.used_bytes {
            initial_metrics.used_bytes - final_metrics.used_bytes
        } else {
            0
        };

        RamFlushResult {
            processes_trimmed: trimmed_count,
            bytes_reclaimed_estimate: bytes_reclaimed,
            initial_used_bytes: initial_metrics.used_bytes,
            final_used_bytes: final_metrics.used_bytes,
        }
    }
}
