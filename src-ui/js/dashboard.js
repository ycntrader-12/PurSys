const DashboardManager = {
  pollingInterval: null,

  init() {
    this.startMetricsPolling();
    this.bindEvents();
  },

  bindEvents() {
    $('#btn-quick-clean')?.addEventListener('click', () => {
      this.handleQuickClean();
    });
  },

  startMetricsPolling() {
    this.fetchAndUpdate();
    this.pollingInterval = setInterval(() => {
      this.fetchAndUpdate();
    }, 2000);
  },

  async fetchAndUpdate() {
    if (!window.purSysApi) return;
    try {
      const metrics = await window.purSysApi.getMetrics();
      this.updateGauges(metrics);
      this.updateHealthScore(metrics);
    } catch (err) {
      console.warn('Metrics polling error:', err);
    }
  },

  updateGauges(metrics) {
    const circumference = 314; // 2 * pi * 50

    // CPU Gauge
    const cpuVal = Math.round(metrics.cpu_usage_percentage);
    const cpuOffset = circumference - (circumference * Math.min(100, Math.max(0, cpuVal))) / 100;
    const cpuCircle = $('#cpu-gauge-circle');
    if (cpuCircle) {
      cpuCircle.style.strokeDashoffset = cpuOffset;
      // Change color based on load
      if (cpuVal > 80) {
        cpuCircle.style.stroke = '#ef4444';
      } else if (cpuVal > 50) {
        cpuCircle.style.stroke = '#f59e0b';
      } else {
        cpuCircle.style.stroke = '#3b82f6';
      }
    }
    $('#cpu-percentage').textContent = `${cpuVal}%`;
    $('#process-count').textContent = `${metrics.process_count} processes`;

    // RAM Gauge
    const ramVal = Math.round(metrics.used_percentage);
    const ramOffset = circumference - (circumference * Math.min(100, Math.max(0, ramVal))) / 100;
    const ramCircle = $('#ram-gauge-circle');
    if (ramCircle) {
      ramCircle.style.strokeDashoffset = ramOffset;
    }
    $('#ram-percentage').textContent = `${ramVal}%`;

    const usedGB = (metrics.used_bytes / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (metrics.total_bytes / (1024 * 1024 * 1024)).toFixed(1);
    $('#ram-used-text').textContent = `${usedGB} GB Used`;
    $('#ram-avail-text').textContent = `${totalGB} GB Total`;

    // Share metrics with Optimizer view if needed
    if (window.OptimizerManager && typeof window.OptimizerManager.updateFromMetrics === 'function') {
      window.OptimizerManager.updateFromMetrics(metrics);
    }
  },

  updateHealthScore(metrics) {
    // Health score formula based on CPU and RAM usage
    let score = 100;
    if (metrics.used_percentage > 70) score -= 15;
    if (metrics.used_percentage > 85) score -= 20;
    if (metrics.cpu_usage_percentage > 60) score -= 10;
    if (metrics.cpu_usage_percentage > 85) score -= 15;

    const scoreEl = $('#health-score-val');
    const badgeEl = $('#health-status-badge');
    if (scoreEl) scoreEl.textContent = Math.max(25, score);

    if (badgeEl) {
      if (score >= 85) {
        badgeEl.textContent = 'Optimal';
        badgeEl.style.color = '#34d399';
        badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else if (score >= 60) {
        badgeEl.textContent = 'Fair';
        badgeEl.style.color = '#fbbf24';
        badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      } else {
        badgeEl.textContent = 'Critical';
        badgeEl.style.color = '#f87171';
        badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }
    }
  },

  async handleQuickClean() {
    const btn = $('#btn-quick-clean');
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
      <span>Cleaning...</span>
    `;

    try {
      // Clean safe default free categories
      const categories = ['user_temp', 'browser_cache'];
      const results = await window.purSysApi.cleanSystem(categories, window.AppState.licenseKey);
      const totalFreed = results.reduce((acc, r) => acc + (r.bytes_freed || 0), 0);
      window.showToast(`Quick Clean complete: ${window.formatBytes(totalFreed)} reclaimed!`, 'success');
    } catch (err) {
      window.showToast(`Clean failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
        <span>1-Click Quick Clean</span>
      `;
    }
  },
};

window.DashboardManager = DashboardManager;
