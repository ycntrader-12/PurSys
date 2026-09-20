// Global PurSys Application State
const AppState = {
  currentView: 'dashboard',
  licenseKey: localStorage.getItem('pursys_license_key') || '',
  licenseState: {
    tier: 'free',
    is_valid: true,
    hwid: '',
  },
  osInfo: null,
};

// UI Element Helpers
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

// Format bytes to human readable string (KB, MB, GB)
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0.00 MB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Pro Feature Modal Handling
function showProModal(featureTitle, featureDesc) {
  const modal = $('#pro-modal');
  if (featureTitle) $('#modal-feature-title').textContent = featureTitle;
  if (featureDesc) $('#modal-feature-desc').textContent = featureDesc;
  modal.classList.add('open');
}

function closeProModal() {
  $('#pro-modal').classList.remove('open');
}

// Navigation & Tab Router
function initNavigation() {
  const navButtons = $$('.nav-item[data-view]');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewName = btn.getAttribute('data-view');
      switchView(viewName);
    });
  });

  $('#btn-goto-cleaner')?.addEventListener('click', () => {
    switchView('cleaner');
  });

  $('#btn-close-modal')?.addEventListener('click', closeProModal);
  $('#pro-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#pro-modal')) closeProModal();
  });

  // Demo Unlock Button
  $('#btn-quick-unlock-pro')?.addEventListener('click', async () => {
    closeProModal();
    if (window.LicensingManager) {
      await window.LicensingManager.activateWithKey('PUR-PRO-DEMO-2026');
    }
  });
}

function switchView(viewName) {
  AppState.currentView = viewName;
  $$('.nav-item').forEach((b) => b.classList.remove('active'));
  $(`.nav-item[data-view="${viewName}"]`)?.classList.add('active');

  $$('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${viewName}`)?.classList.add('active');

  // Trigger view specific refresh if needed
  if (viewName === 'startup' && window.StartupManagerView) {
    window.StartupManagerView.loadStartupItems();
  }
}

// System Information Initialization
async function initSystemInfo() {
  try {
    if (!window.purSysApi) return;
    const osInfo = await window.purSysApi.getOsInfo();
    AppState.osInfo = osInfo;

    const platformLabel = `${osInfo.os_type} (${osInfo.arch})`;
    $('#summary-platform').textContent = platformLabel;
    $('#info-os').textContent = platformLabel;
    $('#info-host').textContent = osInfo.hostname;
    $('#summary-privilege').textContent = osInfo.is_elevated ? 'Elevated (Admin)' : 'Standard';

    if (osInfo.is_elevated) {
      $('#summary-privilege').style.color = '#34d399';
    }
  } catch (err) {
    console.error('Failed to load OS info:', err);
  }
}

// App Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  await initSystemInfo();

  if (window.LicensingManager) {
    await window.LicensingManager.init();
  }
  if (window.DashboardManager) {
    window.DashboardManager.init();
  }
  if (window.CleanerManager) {
    window.CleanerManager.init();
  }
  if (window.OptimizerManager) {
    window.OptimizerManager.init();
  }
  if (window.StartupManagerView) {
    window.StartupManagerView.init();
  }
});

window.AppState = AppState;
window.showToast = showToast;
window.showProModal = showProModal;
window.switchView = switchView;
window.formatBytes = formatBytes;
