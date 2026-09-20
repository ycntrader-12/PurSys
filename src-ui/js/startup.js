const StartupManagerView = {
  items: [],

  init() {
    this.bindEvents();
    this.loadStartupItems();
  },

  bindEvents() {
    $('#btn-refresh-startup')?.addEventListener('click', () => {
      this.loadStartupItems();
    });
  },

  async loadStartupItems() {
    const tbody = $('#startup-list-body');
    if (!tbody || !window.purSysApi) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">Reading autostart registry entries...</td>
      </tr>
    `;

    try {
      const items = await window.purSysApi.listStartup();
      this.items = items;
      this.renderTable(items);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">Failed to load startup items: ${err.message}</td>
        </tr>
      `;
    }
  },

  renderTable(items) {
    const tbody = $('#startup-list-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">No autostart applications detected.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    items.forEach((item) => {
      const tr = document.createElement('tr');

      const impactClass =
        item.impact === 'High'
          ? 'impact-high'
          : item.impact === 'Low'
          ? 'impact-low'
          : 'impact-medium';

      tr.innerHTML = `
        <td>
          <strong style="color: #fff;">${this.escapeHtml(item.name)}</strong>
        </td>
        <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 11px;" title="${this.escapeHtml(item.command)}">
          ${this.escapeHtml(item.command)}
        </td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
          ${this.escapeHtml(item.location)}
        </td>
        <td>
          <span class="impact-chip ${impactClass}">${item.impact}</span>
        </td>
        <td class="text-right">
          <label class="switch">
            <input type="checkbox" ${item.enabled ? 'checked' : ''} data-name="${this.escapeHtml(item.name)}">
            <span class="slider"></span>
          </label>
        </td>
      `;

      // Handle Switch Change
      const checkbox = tr.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;

        // Gating Check: Free users cannot toggle startup items
        if (window.AppState.licenseState.tier === 'free') {
          e.preventDefault();
          e.target.checked = !isChecked; // revert
          window.showProModal(
            'Pro Feature: Startup Optimization',
            'Modifying startup applications and non-destructive registry redirection is an advanced system performance tool restricted to PurSys Professional.'
          );
          return;
        }

        try {
          await window.purSysApi.toggleStartup(
            item.name,
            isChecked,
            window.AppState.licenseKey
          );
          window.showToast(
            `Startup item '${item.name}' ${isChecked ? 'enabled' : 'disabled'}.`,
            'success'
          );
        } catch (err) {
          e.target.checked = !isChecked; // revert
          window.showToast(`Failed to update startup item: ${err.message}`, 'error');
        }
      });

      tbody.appendChild(tr);
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

window.StartupManagerView = StartupManagerView;
