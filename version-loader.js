(async function loadArabic101Version() {
  const VERSION_JSON_URL = 'https://a101-ext.github.io/Arabic101-Extension/version.json';
  const MANIFEST_FALLBACK_URL =
    'https://raw.githubusercontent.com/a101-ext/Arabic101-Extension/main/Arabic101%20Chat%20%26%20Schedule/manifest.json';

  let data = null;

  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) data = await res.json();
  } catch (e) {}

  // Fallback otomatis ke manifest.json di GitHub jika version.json gagal dimuat
  if (!data || !data.version) {
    try {
      const mRes = await fetch(`${MANIFEST_FALLBACK_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (mRes.ok) {
        const manifest = await mRes.json();
        data = {
          name: manifest.name || 'Arabic101 Assistant',
          version: manifest.version || '1.1.0.0',
          releaseDate: '',
          description: manifest.description || '',
          changelog: []
        };
      }
    } catch (e) {}
  }

  if (!data || !data.version) return;

  // 1. Update semua elemen berlabel data-a101-version (format: v1.1.0.0)
  document.querySelectorAll('[data-a101-version]').forEach(el => {
    el.textContent = `v${data.version}`;
  });

  // 2. Update elemen versi tanpa huruf "v" (format: 1.1.0.0)
  document.querySelectorAll('[data-a101-version-raw]').forEach(el => {
    el.textContent = data.version;
  });

  // 3. Update tanggal rilis
  if (data.releaseDate) {
    document.querySelectorAll('[data-a101-date]').forEach(el => {
      el.textContent = data.releaseDate;
    });
  }

  // 4. Update nama & deskripsi ekstensi
  if (data.name) {
    document.querySelectorAll('[data-a101-name]').forEach(el => {
      el.textContent = data.name;
    });
  }
  if (data.description) {
    document.querySelectorAll('[data-a101-desc]').forEach(el => {
      el.textContent = data.description;
    });
  }

  // 5. Render daftar changelog otomatis jika ada kontainer [data-a101-changelog]
  if (Array.isArray(data.changelog) && data.changelog.length > 0) {
    document.querySelectorAll('[data-a101-changelog]').forEach(ul => {
      ul.innerHTML = data.changelog
        .map(item => `<li>${item.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</li>`)
        .join('');
    });
  }

  // 6. Update versi di <title> halaman secara otomatis jika mengandung pola vX.X.X
  if (/v\d+\.\d+\.\d+(?:\.\d+)?/i.test(document.title)) {
    document.title = document.title.replace(/v\d+\.\d+\.\d+(?:\.\d+)?/i, `v${data.version}`);
  }
})();
