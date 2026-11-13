(async function loadArabic101Version() {
  const VERSION_JSON_URL = 'https://a101-ext.github.io/Arabic101-Extension/version.json';
  const MANIFEST_FALLBACK_URL =
    'https://raw.githubusercontent.com/a101-ext/Arabic101-Extension/main/Arabic101%20Chat%20%26%20Schedule/manifest.json';

  let data = null;

  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) data = await res.json();
  } catch (e) {}

  if (!data || !data.version) {
    try {
      const mRes = await fetch(`${MANIFEST_FALLBACK_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (mRes.ok) {
        const manifest = await mRes.json();
        data = {
          name: manifest.name || 'Arabic101 Assistant',
          version: manifest.version || '1.1.0.0',
          lastUpdated: '',
          releaseDate: '',
          changelog: []
        };
      }
    } catch (e) {}
  }

  if (!data || !data.version) return;

  // Mendukung format 3 segmen (1.0.6) maupun 4 segmen (1.1.0.0)
  const verRegex = /\b(v?)(\d+\.\d+\.\d+(?:\.\d+)?)\b/gi;
  const replaceVer = (_, prefix) => `${prefix || ''}${data.version}`;

  // 1. Update elemen eksplisit
  document.querySelectorAll('[data-a101-version]').forEach(el => {
    el.textContent = `v${data.version}`;
  });
  document.querySelectorAll('[data-a101-version-raw]').forEach(el => {
    el.textContent = data.version;
  });
  if (data.lastUpdated) {
    document.querySelectorAll('[data-a101-last-updated]').forEach(el => {
      el.textContent = data.lastUpdated;
    });
  }
  if (data.releaseDate) {
    document.querySelectorAll('[data-a101-date]').forEach(el => {
      el.textContent = data.releaseDate;
    });
  }

  // 2. Auto-replace teks versi statis di seluruh halaman jika ada
  if (document.body) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const parentTag = node.parentElement?.tagName;
      if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'TEXTAREA') continue;
      if (verRegex.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(verRegex, replaceVer);
      }
      verRegex.lastIndex = 0;
    }
  }

  // 3. Render daftar changelog otomatis jika elemen [data-a101-changelog] ada
  if (Array.isArray(data.changelog) && data.changelog.length > 0) {
    document.querySelectorAll('[data-a101-changelog]').forEach(ul => {
      ul.innerHTML = data.changelog
        .map(item => `<li>${item.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</li>`)
        .join('');
    });
  }

  // 4. Update versi di <title> jika memuat pola versi
  if (verRegex.test(document.title)) {
    document.title = document.title.replace(verRegex, replaceVer);
  }
})();
