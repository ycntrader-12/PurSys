const { ipcMain } = require('electron');
const rustBridge = require('./rust-bridge');

const VALID_CATEGORIES = new Set([
  'user_temp',
  'system_temp',
  'browser_cache',
  'crash_logs',
  'thumbnail_cache',
  'recycle_bin',
]);

function registerIpcHandlers() {
  ipcMain.handle('pursys:get-os-info', async () => {
    return await rustBridge.send('get_os_info');
  });

  ipcMain.handle('pursys:get-metrics', async () => {
    return await rustBridge.send('get_metrics');
  });

  ipcMain.handle('pursys:get-hwid', async () => {
    return await rustBridge.send('get_hwid');
  });

  ipcMain.handle('pursys:verify-license', async (_event, key) => {
    if (typeof key !== 'string' || key.length > 128) {
      throw new Error('Invalid license format provided.');
    }
    return await rustBridge.send('verify_license', { key });
  });

  ipcMain.handle('pursys:scan-system', async (_event, categories) => {
    if (!Array.isArray(categories)) {
      throw new Error('Categories must be an array of category identifiers.');
    }
    const sanitized = categories.filter((c) => VALID_CATEGORIES.has(c));
    return await rustBridge.send('scan', { categories: sanitized });
  });

  ipcMain.handle('pursys:clean-system', async (_event, { categories, licenseKey }) => {
    if (!Array.isArray(categories)) {
      throw new Error('Categories must be an array.');
    }
    const sanitized = categories.filter((c) => VALID_CATEGORIES.has(c));
    const safeKey = typeof licenseKey === 'string' ? licenseKey : '';
    return await rustBridge.send('clean', {
      categories: sanitized,
      license_key: safeKey,
    });
  });

  ipcMain.handle('pursys:flush-ram', async (_event, licenseKey) => {
    const safeKey = typeof licenseKey === 'string' ? licenseKey : '';
    return await rustBridge.send('flush_ram', { license_key: safeKey });
  });

  ipcMain.handle('pursys:list-startup', async () => {
    return await rustBridge.send('list_startup');
  });

  ipcMain.handle('pursys:toggle-startup', async (_event, { name, enable, licenseKey }) => {
    if (typeof name !== 'string' || name.length > 256) {
      throw new Error('Invalid startup entry name.');
    }
    const safeKey = typeof licenseKey === 'string' ? licenseKey : '';
    return await rustBridge.send('toggle_startup', {
      name,
      enable: Boolean(enable),
      license_key: safeKey,
    });
  });
}

module.exports = { registerIpcHandlers };
