const { apiGet, apiPost } = SongloftPlugin;

// ─── DOM Elements ───
const elUrl = document.getElementById('lxserverUrl');
const elToken = document.getElementById('lxserverToken');
const elUsername = document.getElementById('lxserverUsername');
const elQuality = document.getElementById('defaultQuality');
const elPlatform = document.getElementById('defaultPlatform');
const elStatusDot = document.getElementById('statusDot');
const elStatusText = document.getElementById('statusText');
const elBtnSave = document.getElementById('btnSave');
const elBtnRefresh = document.getElementById('btnRefresh');
const elSearchInput = document.getElementById('searchInput');
const elBtnSearch = document.getElementById('btnSearch');
const elSearchResults = document.getElementById('searchResults');
const elSearchLoading = document.getElementById('searchLoading');
const elSearchEmpty = document.getElementById('searchEmpty');
const elResultsCount = document.getElementById('resultsCount');
const elResultsTime = document.getElementById('resultsTime');
const elResultsList = document.getElementById('resultsList');

// ─── Source Labels ───
const SOURCE_LABELS = {
  kg: '酷狗', kw: '酷我', tx: 'QQ', wy: '网易', mg: '咪咕'
};

// ─── Config ───
async function loadConfig() {
  try {
    const resp = await apiGet('/api/config');
    const config = resp.data || resp;
    elUrl.value = config.lxserverUrl || '';
    elToken.value = '';
    elToken.placeholder = config.lxserverToken ? '已配置（留空保持不变）' : '可选';
    elUsername.value = config.lxserverUsername || '';
    elQuality.value = config.defaultQuality || '320k';
    elPlatform.value = config.defaultPlatform || 'all';
  } catch (e) {
    showSnackbar('加载配置失败');
    console.error('loadConfig error:', e);
  }
}

// ─── Health Check ───
async function checkHealth() {
  elStatusDot.className = 'status-dot';
  elStatusText.textContent = '检查中...';
  elBtnRefresh.disabled = true;

  try {
    const resp = await apiGet('/api/health');
    const data = resp.data || resp;
    if (data.connected) {
      elStatusDot.className = 'status-dot connected';
      elStatusText.textContent = '已连接';
    } else {
      elStatusDot.className = 'status-dot disconnected';
      elStatusText.textContent = data.error ? `失败：${data.error}` : '无法连接';
    }
  } catch (e) {
    elStatusDot.className = 'status-dot disconnected';
    elStatusText.textContent = '检查失败';
  }

  elBtnRefresh.disabled = false;
}

// ─── Save Config ───
async function saveConfig() {
  elBtnSave.disabled = true;

  const body = {
    lxserverUrl: elUrl.value.trim(),
    lxserverUsername: elUsername.value.trim(),
    defaultQuality: elQuality.value,
    defaultPlatform: elPlatform.value,
  };

  const token = elToken.value.trim();
  if (token) {
    body.lxserverToken = token;
  }

  try {
    await apiPost('/api/config', body);
    showSnackbar('配置已保存');
    setTimeout(checkHealth, 500);
  } catch (e) {
    showSnackbar('保存失败');
    console.error('saveConfig error:', e);
  }

  elBtnSave.disabled = false;
}

// ─── Search Test ───
async function doSearch() {
  const keyword = elSearchInput.value.trim();
  if (!keyword) {
    showSnackbar('请输入搜索关键词');
    return;
  }

  elBtnSearch.disabled = true;
  elSearchResults.classList.add('hidden');
  elSearchEmpty.classList.add('hidden');
  elSearchLoading.classList.remove('hidden');

  const t0 = performance.now();

  try {
    const resp = await apiPost('/api/search', {
      keyword,
      page: 1,
      page_size: 20,
    });

    const elapsed = Math.round(performance.now() - t0);

    // createSearchHandler returns { results: [...] } or { error: "..." }
    if (resp.error) {
      elSearchLoading.classList.add('hidden');
      showSnackbar(`搜索失败：${resp.error}`);
      elBtnSearch.disabled = false;
      return;
    }

    const items = resp.results || [];

    elSearchLoading.classList.add('hidden');

    if (!items.length) {
      elSearchEmpty.classList.remove('hidden');
      return;
    }

    elResultsCount.textContent = `${items.length} 条结果`;
    elResultsTime.textContent = `${elapsed}ms`;
    elResultsList.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'result-item';

      const source = item.source || '';
      const sourceLabel = SOURCE_LABELS[source] || source.toUpperCase();
      const sourceClass = `source-${source}`;
      const coverHtml = item.cover_url
        ? `<img src="${escapeHtml(item.cover_url)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>music_note</span>'">`
        : '<span class="material-symbols-outlined">music_note</span>';

      el.innerHTML = `
        <div class="result-cover">${coverHtml}</div>
        <div class="result-info">
          <div class="result-name">${escapeHtml(item.title || '')}</div>
          <div class="result-meta">
            <span>${escapeHtml(item.artist || '')}</span>
            ${item.album ? `<span>· ${escapeHtml(item.album)}</span>` : ''}
            ${item.duration ? `<span>· ${formatDuration(item.duration)}</span>` : ''}
          </div>
        </div>
        <span class="result-source ${sourceClass}">${sourceLabel}</span>
      `;

      elResultsList.appendChild(el);
    }

    elSearchResults.classList.remove('hidden');
  } catch (e) {
    elSearchLoading.classList.add('hidden');
    showSnackbar('搜索失败');
    console.error('doSearch error:', e);
  }

  elBtnSearch.disabled = false;
}

// ─── Helpers ───
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showSnackbar(message) {
  const snackbar = document.getElementById('snackbar');
  snackbar.textContent = message;
  snackbar.classList.add('show');
  setTimeout(() => snackbar.classList.remove('show'), 3000);
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  elBtnSave.onclick = saveConfig;
  elBtnRefresh.onclick = checkHealth;
  elBtnSearch.onclick = doSearch;
  elSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  loadConfig();
  checkHealth();
});
