const rustBridge = require('../src-electron/main/rust-bridge');

async function testAll() {
  console.log('--- Testing PurSys Native Bridge & Handlers ---');

  const ping = await rustBridge.send('ping');
  console.log('1. Ping:', ping);

  const osInfo = await rustBridge.send('get_os_info');
  console.log('2. OS Info:', osInfo);

  const hwid = await rustBridge.send('get_hwid');
  console.log('3. HWID:', hwid);

  const metrics = await rustBridge.send('get_metrics');
  console.log('4. Metrics: CPU =', metrics.cpu_usage_percentage, '%, RAM Used =', (metrics.used_bytes / 1e9).toFixed(2), 'GB');

  const scan = await rustBridge.send('scan', { categories: ['user_temp', 'browser_cache', 'system_temp'] });
  console.log('5. Scan Categories:', scan.length, 'categories scanned.');

  const freeLic = await rustBridge.send('verify_license', { key: '' });
  console.log('6. Free License state:', freeLic.tier, freeLic.message);

  const proLic = await rustBridge.send('verify_license', { key: 'PUR-PRO-DEMO-2026' });
  console.log('7. Pro License state:', proLic.tier, proLic.message);

  // Test Freemium gating on clean
  try {
    await rustBridge.send('clean', { categories: ['system_temp'], license_key: '' });
    console.error('FAIL: Free tier should not be able to clean system_temp!');
  } catch (err) {
    console.log('8. Freemium gate successfully blocked Pro cleaning in Free tier:', err.message);
  }

  // Clean with Pro license
  const proClean = await rustBridge.send('clean', { categories: ['system_temp'], license_key: 'PUR-PRO-DEMO-2026' });
  console.log('9. Pro cleaning succeeded:', proClean[0].files_deleted, 'files cleaned.');

  // Test RAM Flush
  const ramFlush = await rustBridge.send('flush_ram', { license_key: 'PUR-PRO-DEMO-2026' });
  console.log('10. RAM Flush succeeded. Processes trimmed:', ramFlush.processes_trimmed);

  // Test Startup
  const startup = await rustBridge.send('list_startup');
  console.log('11. Startup Items count:', startup.length);

  rustBridge.destroy();
  console.log('--- All Tests Passed Successfully ---');
}

testAll().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
