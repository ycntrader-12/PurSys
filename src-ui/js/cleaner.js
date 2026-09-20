const CleanerManager = {
  scanResults: {},
  isScanning: false,
  isCleaning: false,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    $('#btn-clean-scan')?.addEventListener('click', () => {
      this.runScan();
    });

    $('#btn-clean-execute')?.addEventListener('click', () => {
      this.runClean();
    });

    // Pro-locked category click guard
    $$('.category-card.pro-locked').forEach((card) => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('click', (e) => {
        if (window.AppState.licenseState.tier === 'free') {
          e.preventDefault();
          const catName = card.querySelector('.cat-name').textContent;
          window.showProModal(
            `Pro Feature: ${catName}`,
            'Deep system and icon cache cleaning requires a PurSys Professional subscription. Upgrade to unlock this category.'
          );
        }
      });
    });
  },

  getSelectedCategories() {
    const checkboxes = $$('.category-card input[type="checkbox"]:checked');
    return Array.from(checkboxes).map((cb) => cb.value);
  },

  async runScan() {
    if (this.isScanning) return;
    this.isScanning = true;

    const scanBtn = $('#btn-clean-scan');
    const cleanBtn = $('#btn-clean-execute');
    const progressBar = $('#clean-progress-bar');

    scanBtn.disabled = true;
    scanBtn.innerHTML = `<span>Scanning...</span>`;
    progressBar.style.width = '30%';

    const allCategories = [
      'user_temp',
      'system_temp',
      'browser_cache',
      'crash_logs',
      'thumbnail_cache',
      'recycle_bin',
    ];

    try {
      progressBar.style.width = '60%';
      const results = await window.purSysApi.scanSystem(allCategories);

      let totalBytes = 0;
      let totalFiles = 0;

      results.forEach((res) => {
        this.scanResults[res.category] = res;
        totalBytes += res.total_bytes;
        totalFiles += res.file_count;

        const statEl = $(`#stat-${res.category}`);
        if (statEl) {
          statEl.textContent = `${window.formatBytes(res.total_bytes)} (${res.file_count} files)`;
        }
      });

      progressBar.style.width = '100%';
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 800);

      $('#clean-total-size').textContent = window.formatBytes(totalBytes);
      $('#clean-total-files').textContent = `${totalFiles} cleanable files identified`;

      cleanBtn.disabled = false;
      window.showToast(`System scan complete: ${window.formatBytes(totalBytes)} ready to purge!`, 'success');
    } catch (err) {
      window.showToast(`Scan error: ${err.message}`, 'error');
      progressBar.style.width = '0%';
    } finally {
      this.isScanning = false;
      scanBtn.disabled = false;
      scanBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Analyze System</span>
      `;
    }
  },

  async runClean() {
    if (this.isCleaning) return;
    const selected = this.getSelectedCategories();
    if (selected.length === 0) {
      window.showToast('Please select at least one category to clean.', 'error');
      return;
    }

    // Check if any selected is Pro
    const hasPro = selected.some((c) => c === 'system_temp' || c === 'thumbnail_cache');
    if (hasPro && window.AppState.licenseState.tier === 'free') {
      window.showProModal(
        'Pro Category Selected',
        'One or more selected categories require PurSys Professional. Upgrade or uncheck Pro categories.'
      );
      return;
    }

    this.isCleaning = true;
    const cleanBtn = $('#btn-clean-execute');
    const progressBar = $('#clean-progress-bar');

    cleanBtn.disabled = true;
    cleanBtn.innerHTML = `<span>Purging Files...</span>`;
    progressBar.style.width = '40%';

    try {
      const results = await window.purSysApi.cleanSystem(selected, window.AppState.licenseKey);
      progressBar.style.width = '100%';

      const totalFreed = results.reduce((acc, r) => acc + (r.bytes_freed || 0), 0);
      const totalDeleted = results.reduce((acc, r) => acc + (r.files_deleted || 0), 0);

      window.showToast(`Successfully reclaimed ${window.formatBytes(totalFreed)} across ${totalDeleted} files!`, 'success');

      // Update UI stats for cleaned categories
      selected.forEach((cat) => {
        const statEl = $(`#stat-${cat}`);
        if (statEl) statEl.textContent = '0.00 MB (Cleaned)';
      });

      $('#clean-total-size').textContent = '0.00 MB';
      $('#clean-total-files').textContent = '0 files';

      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 600);
    } catch (err) {
      window.showToast(`Cleaning error: ${err.message}`, 'error');
      progressBar.style.width = '0%';
    } finally {
      this.isCleaning = false;
      cleanBtn.disabled = false;
      cleanBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Clean Selected Files</span>
      `;
    }
  },

  updateProAccess(isPro) {
    $$('.category-card.pro-locked').forEach((card) => {
      const tag = card.querySelector('.tag');
      if (isPro) {
        card.classList.remove('pro-locked');
        if (tag) {
          tag.className = 'tag tag-free';
          tag.textContent = 'PRO ACTIVE';
        }
      } else {
        card.classList.add('pro-locked');
        if (tag) {
          tag.className = 'tag tag-pro';
          tag.textContent = 'PRO ONLY';
        }
      }
    });
  },
};

window.CleanerManager = CleanerManager;
