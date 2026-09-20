const OptimizerManager = {
  isFlushing: false,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    $('#btn-flush-ram')?.addEventListener('click', () => {
      this.handleFlushRam();
    });
  },

  updateFromMetrics(metrics) {
    const totalGB = (metrics.total_bytes / (1024 * 1024 * 1024)).toFixed(2);
    const usedGB = (metrics.used_bytes / (1024 * 1024 * 1024)).toFixed(2);
    const availGB = (metrics.available_bytes / (1024 * 1024 * 1024)).toFixed(2);

    $('#lbl-ram-total').textContent = `${totalGB} GB`;
    $('#lbl-ram-used').textContent = `${usedGB} GB`;
    $('#lbl-ram-avail').textContent = `${availGB} GB`;

    const usedPct = Math.min(100, Math.max(0, metrics.used_percentage));
    const availPct = 100 - usedPct;

    const usedBar = $('#ram-bar-used');
    const availBar = $('#ram-bar-avail');
    if (usedBar) usedBar.style.width = `${usedPct}%`;
    if (availBar) availBar.style.width = `${availPct}%`;
  },

  async handleFlushRam() {
    if (this.isFlushing) return;

    // Guard: RAM flush requires PRO tier
    if (window.AppState.licenseState.tier === 'free') {
      window.showProModal(
        'Pro Feature: RAM Working Set Compactor',
        'Direct operating system working set compaction (calling native EmptyWorkingSet sys-calls) is an enterprise performance feature restricted to PurSys Professional.'
      );
      return;
    }

    this.isFlushing = true;
    const btn = $('#btn-flush-ram');
    const logOutput = $('#ram-log-output');
    const logStatus = $('#ram-log-status');

    btn.disabled = true;
    btn.innerHTML = `<span>Compacting RAM...</span>`;
    logStatus.textContent = 'Flushing Working Set...';

    this.appendLog('[Engine] Initiating Win32 native EmptyWorkingSet on all accessible process handles...', 'text-cyan');

    try {
      const result = await window.purSysApi.flushRam(window.AppState.licenseKey);

      const reclaimedMB = (result.bytes_reclaimed_estimate / (1024 * 1024)).toFixed(1);
      this.appendLog(
        `[Kernel] Success: ${result.processes_trimmed} process working sets compacted.`,
        'text-green'
      );
      this.appendLog(
        `[Memory Manager] Estimated ~${reclaimedMB} MB of uncommitted page frames reclaimed.`,
        'text-green'
      );

      logStatus.textContent = `Optimized (+${reclaimedMB} MB)`;
      window.showToast(`RAM Flush successful: ~${reclaimedMB} MB freed!`, 'success');
    } catch (err) {
      this.appendLog(`[Error] Working set flush failed: ${err.message}`, 'text-muted');
      logStatus.textContent = 'Failed';
      window.showToast(`RAM Flush failed: ${err.message}`, 'error');
    } finally {
      this.isFlushing = false;
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        <span>Flush Working Set (RAM)</span>
      `;
    }
  },

  appendLog(message, cssClass = '') {
    const logOutput = $('#ram-log-output');
    if (!logOutput) return;
    const p = document.createElement('p');
    p.className = `log-line ${cssClass}`;
    p.textContent = message;
    logOutput.appendChild(p);
    logOutput.scrollTop = logOutput.scrollHeight;
  },
};

window.OptimizerManager = OptimizerManager;
