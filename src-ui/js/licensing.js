const LicensingManager = {
  async init() {
    this.bindEvents();
    await this.loadHwid();

    // Verify initial stored key
    const initialKey = window.AppState.licenseKey;
    if (initialKey) {
      $('#license-input').value = initialKey;
      await this.verifyAndApply(initialKey);
    } else {
      this.updateUiForTier('free');
    }
  },

  bindEvents() {
    $('#btn-copy-hwid')?.addEventListener('click', () => {
      this.copyHwid();
    });

    $('#btn-activate-lic')?.addEventListener('click', () => {
      const key = $('#license-input')?.value || '';
      this.verifyAndApply(key);
    });

    $('#license-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const key = $('#license-input')?.value || '';
        this.verifyAndApply(key);
      }
    });
  },

  async loadHwid() {
    try {
      if (!window.purSysApi) return;
      const hwid = await window.purSysApi.getHwid();
      window.AppState.licenseState.hwid = hwid;
      const hwidEl = $('#hwid-value');
      if (hwidEl) hwidEl.textContent = hwid;
    } catch (err) {
      console.warn('Failed to compute HWID:', err);
    }
  },

  async copyHwid() {
    const hwid = window.AppState.licenseState.hwid;
    if (!hwid) return;
    try {
      await navigator.clipboard.writeText(hwid);
      window.showToast('Hardware ID copied to clipboard!', 'success');
    } catch (err) {
      window.showToast('Failed to copy HWID to clipboard.', 'error');
    }
  },

  async activateWithKey(key) {
    if ($('#license-input')) $('#license-input').value = key;
    await this.verifyAndApply(key);
  },

  async verifyAndApply(key) {
    const btn = $('#btn-activate-lic');
    const resultBox = $('#activation-result');
    const msgEl = $('#activation-msg');

    if (btn) btn.disabled = true;

    try {
      const result = await window.purSysApi.verifyLicense(key);
      window.AppState.licenseState = result;

      if (result.is_valid && result.tier !== 'free') {
        window.AppState.licenseKey = key;
        localStorage.setItem('pursys_license_key', key);

        this.updateUiForTier(result.tier);

        if (resultBox && msgEl) {
          resultBox.style.display = 'block';
          resultBox.style.background = 'rgba(16, 185, 129, 0.1)';
          resultBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          msgEl.style.color = '#34d399';
          msgEl.textContent = `✓ ${result.message}`;
        }
        window.showToast(`License activated: Welcome to PurSys ${result.tier.toUpperCase()}!`, 'success');
      } else {
        this.updateUiForTier('free');
        if (resultBox && msgEl) {
          resultBox.style.display = 'block';
          resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
          resultBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          msgEl.style.color = '#f87171';
          msgEl.textContent = `✗ ${result.message}`;
        }
      }
    } catch (err) {
      this.updateUiForTier('free');
      if (resultBox && msgEl) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
        resultBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        msgEl.style.color = '#f87171';
        msgEl.textContent = `✗ Verification failed: ${err.message}`;
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  updateUiForTier(tier) {
    const isPro = tier === 'pro' || tier === 'enterprise';
    const headerBadge = $('#license-badge');
    const headerTierText = $('#license-tier-text');
    const pill = $('#lic-tier-pill');

    if (isPro) {
      if (headerBadge) {
        headerBadge.className = 'badge badge-pro';
      }
      if (headerTierText) {
        headerTierText.textContent = `${tier.toUpperCase()} EDITION ACTIVE`;
      }
      if (pill) {
        pill.className = 'tag tag-pro';
        pill.textContent = `${tier.toUpperCase()} ACTIVE`;
      }
    } else {
      if (headerBadge) {
        headerBadge.className = 'badge badge-free';
      }
      if (headerTierText) {
        headerTierText.textContent = 'FREE EDITION';
      }
      if (pill) {
        pill.className = 'tag tag-free';
        pill.textContent = 'FREE ACTIVE';
      }
    }

    // Update Cleaner View locks
    if (window.CleanerManager && typeof window.CleanerManager.updateProAccess === 'function') {
      window.CleanerManager.updateProAccess(isPro);
    }
  },
};

window.LicensingManager = LicensingManager;
