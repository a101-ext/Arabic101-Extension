/**
 * Arabic101 Realtime Chat Extension (Final Production Architecture)
 * Compliance: Manifest V3 / Role-Scoping Isolation / Multi-Tab Leader Election
 * Features:
 * - Multi-Tab Leader Election: Hanya 1 tab ketua (Leader) yang melakukan polling jaringan & alert audio.
 * - Follower Tabs: Mengikuti update tampilan 100% pasif via listener localStorage (0 bandwidth overhead).
 * - Preserved Heuristic String-Matching: Menggunakan JSON stringify global untuk memastikan akurasi deteksi
 *   kejadian grup (ti-calendar-event, ti-user-minus, ti-user-plus, dan fallback index 0 pembuat grup).
 * - XSS Protected: Menambahkan fungsi escapeHTML kontekstual untuk nama user pada badge sistem.
 */
(function () {
    'use strict';

    if (window.__a101Chat) return;
    window.__a101Chat = true;

    // =========================================================================
    // 1. ISOLASI PERAN DAN ENDPOINT API (ROLE SCOPING)
    // =========================================================================

    const pathLower = location.pathname.toLowerCase();
    const role = pathLower.includes('/management') ? 'management' : (pathLower.includes('/teacher') ? 'teacher' : 'student');
    const base = 'https://dashboard.arabic101.org';
    
    // Prefiks unik agar memori Teacher, Student, dan Management tidak saling menimpa
    const P_KEY = 'a101_' + role + '_';

    const api = {
      chats: base + '/' + role + '/chat/loadMoreChats',
      msgs: base + '/' + role + '/chat/loadMessages',
      send: base + '/' + role + '/chat/message/store',
      read: base + '/' + role + '/chat/read'
    };

    let activeChat = { id: '', name: 'Chat', img: base + '/storage/uploads/1762346132_logo-small.png', bio: 'Arabic101', members: '' };
    let lastMsgSig = '';
    let lastChatSig = '';
    let isFirst = true;
    let myMemberId = null;
    let chatState = {};

    // =========================================================================
    // 2. SISTEM MANAJEMEN PREFERENSI (LOCAL STORAGE)
    // =========================================================================

    const defaultOsNotif = false;
    const storedOsNotif = localStorage.getItem(P_KEY + 'os-notif');
    let allowOsNotification = storedOsNotif !== null ? storedOsNotif === 'true' : defaultOsNotif;

    if (allowOsNotification && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // =========================================================================
    // 3. PEMILIHAN TAB KETUA (LEADER ELECTION)
    // =========================================================================
    
    const tabId = Math.random().toString(36).substring(2, 12);
    let leaderThrottle = null;

    function pingLeader() {
        localStorage.setItem(P_KEY + 'leader', JSON.stringify({ id: tabId, time: Date.now() }));
    }

    function isLeader() {
        try {
            const l = JSON.parse(localStorage.getItem(P_KEY + 'leader') || '{}');
            if (!l.id || l.id === tabId || Date.now() - l.time > 15000) {
                pingLeader();
                return true;
            }
            return false;
        } catch(e) { return true; }
    }

    function claimLeadership() {
        if (leaderThrottle) return;
        pingLeader();
        leaderThrottle = setTimeout(() => { leaderThrottle = null; }, 2000);
    }

    // Rebut kepemimpinan saat tab aktif disentuh pengguna
    window.addEventListener('focus', claimLeadership);
    window.addEventListener('click', claimLeadership);
    window.addEventListener('keydown', claimLeadership);

    // Detak jantung tab ketua setiap 5 detik
    setInterval(() => { if (isLeader()) pingLeader(); }, 5000);

    // =========================================================================
    // 4. SINKRONISASI DATA ANTAR-TAB (STORAGE LISTENER)
    // =========================================================================
    
    function saveSharedData(key, data) {
        localStorage.setItem(P_KEY + key, JSON.stringify(data));
    }

    function getSharedData(key) {
        try { return JSON.parse(localStorage.getItem(P_KEY + key)); } catch(e) { return null; }
    }

    window.addEventListener('storage', (e) => {
        if (e.key === P_KEY + 'shared_chats') {
            const data = getSharedData('shared_chats');
            if (data) processSharedChats(data);
        }
        if (e.key && e.key.startsWith(P_KEY + 'shared_msgs_')) {
            const chatId = e.key.replace(P_KEY + 'shared_msgs_', '');
            if (activeChat.id === chatId) {
                const data = getSharedData('shared_msgs_' + chatId);
                if (data) processSharedMsgs(data, chatId);
            }
        }
    });

    // =========================================================================
    // 5. UTILITAS WARNA, AVATAR, DAN SANITASI XSS
    // =========================================================================

    const nameColors = ['#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];

    function getSenderColor(name) {
      if (!name) return '#0ea5e9';
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return nameColors[Math.abs(hash) % nameColors.length];
    }

    function getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }

    /**
     * Sanitasi karakter berbahaya untuk menutup celah XSS pada teks nama atau pesan sistem
     */
    function escapeHTML(str) {
        return String(str || '').replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    }

    // =========================================================================
    // 6. INJEKSI ATURAN CSS TERISOLASI
    // =========================================================================

    const style = document.createElement('style');
    style.textContent = `
      #a101-root, #a101-root * { box-sizing: border-box !important; }
      #a101-root { position:fixed; bottom:20px; right:20px; z-index:999999; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; font-size:13px; display:flex; flex-direction:column; align-items:flex-end; gap:8px; }

      .a101-card { width:350px; height:520px; max-height:520px; border-radius:16px; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,0.28); display:flex; flex-direction:column; background:var(--bg,#fff); color:var(--text,#0f172a); border:1px solid var(--border,#cbd5e1); position: relative; }
      .a101-card.body-win { width:390px; height:560px; max-height:560px; }

      .a101-head { background:#0f172a; color:#fff; padding:9px 12px; display:flex; align-items:center; justify-content:space-between; flex:0 0 auto !important; height:auto !important; }
      .a101-head h6 { margin:0 !important; font-size:13.5px !important; font-weight:600 !important; color:#fff !important; line-height:1.2 !important; }
      .a101-head small { color:#94a3b8 !important; font-size:10px !important; line-height:1.2 !important; display:block !important; }

      #a101-contacts { flex: 1 1 auto !important; height: 100% !important; overflow-y: auto !important; padding: 0 !important; background: var(--bg,#fff) !important; display: block !important; }
      .a101-item { padding:8px 10px; display:flex; align-items:center; gap:10px; cursor:pointer; border-bottom:1px solid var(--border,#f1f5f9); background:var(--bg,#fff); color:var(--text,#0f172a); }
      .a101-item:hover { background:var(--hover,#f8fafc); }

      #a101-msgs { flex: 1 1 auto !important; height: 100% !important; max-height: 100% !important; overflow-y: auto !important; overflow-x: hidden !important; padding: 10px !important; background: var(--chat-bg,#f1f5f9) !important; display: block !important; }
      .a101-msg-row { display: flex !important; width: 100% !important; height: auto !important; margin-bottom: 6px !important; align-items: flex-end !important; clear: both !important; }
      .a101-msg-row.is-out { justify-content: flex-end !important; }
      .a101-msg-row.is-in { justify-content: flex-start !important; }
      .a101-msg-row.is-system { justify-content: center !important; margin: 12px 0 !important; }

      .a101-avatar { width:24px !important; height:24px !important; min-width:24px !important; border-radius:50% !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; font-size:9.5px !important; font-weight:700 !important; color:#fff !important; margin-right:6px !important; margin-bottom:2px !important; flex:0 0 24px !important; }
      .a101-avatar-out { width:24px !important; height:24px !important; min-width:24px !important; border-radius:50% !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; font-size:9.5px !important; font-weight:700 !important; color:#fff !important; margin-left:6px !important; margin-bottom:2px !important; flex:0 0 24px !important; background:#2563eb !important; }

      .a101-bubble { display: inline-block !important; position: relative !important; max-width: 76% !important; padding: 5px 9px !important; font-size: 12.5px !important; line-height: 1.35 !important; word-break: break-word !important; white-space: normal !important; }
      .a101-in { background:var(--in-bg,#fff) !important; color:var(--text,#0f172a) !important; border:1px solid var(--in-b,#e2e8f0) !important; border-radius:10px 10px 10px 2px !important; box-shadow:0 1px 2px rgba(0,0,0,0.04) !important; }
      .a101-out { background:#2563eb !important; color:#fff !important; border-radius:10px 10px 2px 10px !important; box-shadow:0 1.5px 3px rgba(37,99,235,0.25) !important; }
      .a101-sender { font-size:10.5px !important; font-weight:700 !important; margin-bottom:2px !important; display:block !important; line-height:1.2 !important; }
      .a101-time { font-size:9px !important; float:right !important; margin-left:12px !important; margin-top:4px !important; opacity:0.65 !important; clear:both; }

      .a101-system-badge { background: transparent !important; color: var(--text,#475569) !important; font-size: 10.5px !important; padding: 6px 14px !important; border-radius: 12px !important; border: 1px solid var(--border,#cbd5e1) !important; text-align: center !important; margin: 4px auto !important; max-width: 85% !important; box-shadow: 0 1px 1px rgba(0,0,0,0.02) !important; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
      .a101-date-separator { background: #334155 !important; color: #fff !important; font-size: 11px !important; padding: 4px 10px !important; border-radius: 8px !important; text-align: center !important; margin: 12px auto 8px auto !important; font-weight: 600 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important; display: inline-block; }

      .a101-foot { padding:8px 10px; background:var(--bg,#fff); border-top:1px solid var(--border,#e2e8f0); display:flex; gap:6px; align-items:center; flex:0 0 auto !important; }
      .a101-input { flex:1; border:1px solid var(--border,#cbd5e1); background:var(--input-bg,#f8fafc); color:var(--text,#0f172a); padding:6px 12px; border-radius:20px; outline:none; font-size:12px; }
      .a101-input:focus { border-color:#2563eb; background:var(--bg,#fff); }
      .a101-btn-send { width:30px; height:30px; border-radius:50%; background:#2563eb; color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex:0 0 30px !important; }

      .a101-dock-btn { border:none; border-radius:24px; padding:7px 14px; font-weight:600; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); }
      .a101-head-btn { background: rgba(255,255,255,0.15); border:none; color:#fff; border-radius:6px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer; transition: background 0.2s; }
      .a101-head-btn:hover { background: rgba(255,255,255,0.3); }

      #a101-settings-popup { display: none; position: absolute; top: 45px; right: 10px; background: var(--bg,#fff); border: 1px solid var(--border,#cbd5e1); box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; z-index: 100; width: 220px; color: var(--text,#0f172a); }
      .a101-setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; margin-bottom: 8px; }
      .a101-setting-row:last-child { margin-bottom: 0; }

      .a101-toggle { appearance: none; width: 34px; height: 18px; background: #cbd5e1; border-radius: 10px; position: relative; cursor: pointer; outline: none; transition: background 0.3s; }
      .a101-toggle:checked { background: #10b981; }
      .a101-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
      .a101-toggle:checked::after { transform: translateX(16px); }

      .a101-dark { --bg:#161b22; --text:#f0f6fc; --border:#30363d; --chat-bg:#0d1117; --hover:#1f242c; --in-bg:#21262d; --in-b:#30363d; --input-bg:#0d1117; }
    `;
    document.head.appendChild(style);

    // =========================================================================
    // 7. NOTIFIKASI AUDIO DAN SISTEM OPERASI
    // =========================================================================

    const soundUrl = base + '/mn-notify.wav';

    function playAlert(senderName, msgText) {
      try {
        const audio = new Audio(soundUrl);
        const playPromise = audio.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
      } catch (e) {}

      if (allowOsNotification && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(senderName ? senderName + ' (Arabic101)' : 'Arabic101 Chat', {
            body: msgText || 'New message received',
            icon: activeChat.img || base + '/storage/uploads/1762346132_logo-small.png'
          });
          n.onclick = () => {
            window.focus();
            setWindow('body');
            n.close();
          };
        } catch (e) {}
      }
    }

    // =========================================================================
    // 8. PENGAMBILAN CSRF DAN TRANSMISI FORM DATA
    // =========================================================================

    function getCsrf() {
      return document.querySelector('meta[name="csrf-token"]')?.content ||
             document.querySelector('input[name="_token"]')?.value ||
             window.chatRealtimeConfig?.csrfToken || '';
    }

    function postData(url, data) {
      const fd = new FormData();
      fd.append('_token', getCsrf());
      Object.entries(data).forEach(([k, v]) => fd.append(k, v));
      return fetch(url, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: fd });
    }

    // =========================================================================
    // 9. ELEMEN DOM ROOT WIDGET OBROLAN
    // =========================================================================

    const root = document.createElement('div');
    root.id = 'a101-root';
    root.innerHTML = `
      <div id="a101-menu" class="a101-card" style="display:none;">
        <div class="a101-head">
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${base}/storage/uploads/1762346132_logo-small.png" width="20" height="20" style="border-radius:50%;">
            <h6>Arabic101 Chats</h6>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <button id="a101-btn-newtab" class="a101-head-btn" title="Open Main Chat in New Tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
            <button id="a101-btn-settings" class="a101-head-btn" title="Notification Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
            <button id="a101-close-menu" class="a101-head-btn" style="font-size: 16px;" title="Close Menu">&times;</button>
          </div>
        </div>

        <div id="a101-settings-popup">
          <div style="font-weight:700; margin-bottom:10px; font-size:12px; border-bottom:1px solid var(--border,#e2e8f0); padding-bottom:5px;">Notification Settings</div>
          <div class="a101-setting-row">
            <span>Audio Notification (Browser)</span>
            <span style="font-size:10px; font-weight:bold; color:#10b981;">Always On</span>
          </div>
          <div class="a101-setting-row" style="margin-top:10px;">
            <span>OS Notification (Device)</span>
            <input type="checkbox" id="a101-os-toggle" class="a101-toggle" ${allowOsNotification ? 'checked' : ''}>
          </div>
          <div style="font-size:9.5px; color:#64748b; margin-top:8px; line-height:1.2;">OS notifications only trigger if the browser window is minimized or hidden.</div>
        </div>

        <div style="padding:8px 10px;border-bottom:1px solid var(--border,#cbd5e1);flex:0 0 auto;">
          <input type="text" id="a101-search" class="a101-input" placeholder="Search group contacts..." style="width:100%;box-sizing:border-box;">
        </div>
        <div id="a101-contacts">
          <div style="padding:24px;text-align:center;color:#64748b;">Loading data...</div>
        </div>
      </div>

      <div id="a101-body" class="a101-card body-win" style="display:none;">
        <div class="a101-head">
          <div style="display:flex;align-items:center;gap:8px;max-width:260px;overflow:hidden;">
            <img id="a101-head-img" src="${activeChat.img}" width="28" height="28" style="border-radius:50%;flex-shrink:0;">
            <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <h6 id="a101-head-name">${activeChat.name}</h6>
              <small id="a101-head-members" style="text-overflow:ellipsis;white-space:nowrap;overflow:hidden;max-width:220px;">${activeChat.members || activeChat.bio}</small>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <button id="a101-btn-back" class="a101-head-btn" title="Back to List">
               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <button id="a101-close-body" class="a101-head-btn" style="font-size: 16px;" title="Close Chat">&times;</button>
          </div>
        </div>
        <div id="a101-msgs">
          <div style="padding:24px;text-align:center;color:#64748b;font-size:12px;">Please select an active conversation from the menu.</div>
        </div>
        <form id="a101-send-form" class="a101-foot">
          <input type="text" id="a101-msg-input" class="a101-input" placeholder="Type a message..." autocomplete="off">
          <button type="submit" class="a101-btn-send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>

      <div style="display:flex;gap:8px;align-items:center;">
        <button id="a101-dock-body" class="a101-dock-btn" style="background:#1e293b;color:#fff;display:none;">
          <span style="width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
          <span id="a101-dock-label" style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Chat</span>
        </button>
        <button id="a101-dock-menu" class="a101-dock-btn" style="background:#2563eb;color:#fff;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          <span>Chat</span>
          <span id="a101-badge" style="display:none;background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;">0</span>
        </button>
      </div>
    `;
    document.body.appendChild(root);

    // =========================================================================
    // 10. MANAJEMEN EVENT DOM DAN BINDING KONTROL
    // =========================================================================

    const menuEl = document.getElementById('a101-menu');
    const bodyEl = document.getElementById('a101-body');
    const msgsEl = document.getElementById('a101-msgs');
    const dockBodyBtn = document.getElementById('a101-dock-body');
    const badgeEl = document.getElementById('a101-badge');
    const settingsPopup = document.getElementById('a101-settings-popup');

    function checkTheme() {
      const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' || document.body.classList.contains('dark-theme');
      menuEl.classList.toggle('a101-dark', isDark);
      bodyEl.classList.toggle('a101-dark', isDark);
      settingsPopup.classList.toggle('a101-dark', isDark);
    }

    function setWindow(win) {
      checkTheme();
      menuEl.style.display = win === 'menu' ? 'flex' : 'none';
      bodyEl.style.display = win === 'body' ? 'flex' : 'none';
      settingsPopup.style.display = 'none';

      if (win === 'body' && activeChat.id) {
        dockBodyBtn.style.display = 'flex';
        if (!document.hidden && document.hasFocus()) markRead(activeChat.id);
        loadMsgs(activeChat.id);
      }
    }

    window.addEventListener('focus', () => {
      if (bodyEl.style.display !== 'none' && activeChat.id) markRead(activeChat.id);
    });

    document.getElementById('a101-dock-menu').onclick = () => { claimLeadership(); setWindow(menuEl.style.display === 'none' ? 'menu' : 'none'); };
    document.getElementById('a101-dock-body').onclick = () => { claimLeadership(); setWindow(bodyEl.style.display === 'none' ? 'body' : 'none'); };
    document.getElementById('a101-close-menu').onclick = () => setWindow('none');
    document.getElementById('a101-close-body').onclick = () => setWindow('none');
    document.getElementById('a101-btn-back').onclick = () => setWindow('menu');

    document.getElementById('a101-btn-newtab').onclick = () => {
      window.open(base + '/' + role + '/chat', '_blank');
    };

    document.getElementById('a101-btn-settings').onclick = (e) => {
      settingsPopup.style.display = settingsPopup.style.display === 'none' ? 'block' : 'none';
      e.stopPropagation();
    };

    document.getElementById('a101-os-toggle').onchange = (e) => {
      allowOsNotification = e.target.checked;
      localStorage.setItem(P_KEY + 'os-notif', allowOsNotification);
      if (allowOsNotification && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };

    document.addEventListener('click', (e) => {
      if (settingsPopup.style.display === 'block' && !settingsPopup.contains(e.target) && e.target.id !== 'a101-btn-settings' && !e.target.closest('#a101-btn-settings')) {
        settingsPopup.style.display = 'none';
      }
    });

    // =========================================================================
    // 11. INTELIJEN PARSER: SINKRONISASI PESAN & HEURISTIK KEJADIAN GRUP
    // =========================================================================

    async function markRead(chatId) {
      if (!chatId) return;
      postData(api.read, { chat_id: chatId }).catch(() => {});
    }

    function processSharedMsgs(payload, chatId) {
        if (!payload || !Array.isArray(payload.items)) return;

        if (payload.myMemberId) myMemberId = payload.myMemberId;
        if (payload.membersText) {
            activeChat.members = payload.membersText;
            const subEl = document.getElementById('a101-head-members');
            if (subEl) subEl.textContent = payload.membersText;
        }

        const items = payload.items;
        const sig = chatId + '_' + items.length + '_' + (items[items.length - 1]?.id || '');
        if (sig !== lastMsgSig) {
            if (renderMsgs(items)) {
                lastMsgSig = sig;
            }
        }
    }

    let isFetchingMsgs = false;

    async function loadMsgs(chatId) {
      if (!chatId) return;

      if (!isLeader()) {
          const cached = getSharedData('shared_msgs_' + chatId);
          if (cached) processSharedMsgs(cached, chatId);
          return;
      }

      if (isFetchingMsgs) return;
      isFetchingMsgs = true;
      try {
        const res = await postData(api.msgs, { chat_id: chatId, offset: 0 });
        if (!res.ok) return;
        const data = await res.json();

        let currentMyMemberId = null;
        if (data.member?.id) currentMyMemberId = data.member.id;

        const membersText = data.chat?.members || data.members_text || document.getElementById('group-members-under-title')?.textContent?.trim();

        if (!data || !Array.isArray(data.items)) return;

        let items = data.items;
        const withTime = items.filter(i => i.created_at);
        if (withTime.length >= 2) {
            const firstDate = new Date(withTime[0].created_at).getTime();
            const lastDate = new Date(withTime[withTime.length - 1].created_at).getTime();
            if (firstDate > lastDate) items.reverse();
        }

        const payload = { items: items, membersText: membersText, myMemberId: currentMyMemberId };
        saveSharedData('shared_msgs_' + chatId, payload);
        processSharedMsgs(payload, chatId);
      } catch (e) {
      } finally {
        isFetchingMsgs = false;
      }
    }

    function resolveSenderName(m, isMe) {
      if (isMe) return 'You';
      return m.member?.user?.name ||
             m.member?.name ||
             m.user?.name ||
             (m.member?.user?.first_name ? (m.member.user.first_name + ' ' + (m.member.user.last_name || '')) : '') ||
             m.sender_name ||
             'Member';
    }

    function renderMsgs(items) {
      try {
          if (!items.length) {
            msgsEl.innerHTML = '<div style="padding:24px;text-align:center;color:#64748b;font-size:12px;">No interactions yet. Send the first message!</div>';
            return true;
          }

          let htmlString = '';
          let previousDate = '';

          items.forEach((m, index) => {
            try {
                let timeString = '';
                let dateString = '';

                if (m.created_at) {
                    const rawDate = new Date(m.created_at);
                    if (!isNaN(rawDate.getTime())) {
                        timeString = rawDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                        dateString = rawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                }

                if (dateString && dateString !== previousDate) {
                    htmlString += `<div style="display:flex; justify-content:center; width:100%;"><div class="a101-date-separator">${dateString}</div></div>`;
                    previousDate = dateString;
                }

                const isMe = (myMemberId && m.member_id == myMemberId) || m.is_me === true;
                const sender = resolveSenderName(m, isMe);

                // SERIALISASI JSON GLOBAL: Kunci pertahanan akurasi deteksi sistem (JANGAN DIUBAH)
                const rawJson = JSON.stringify(m).toLowerCase();
                const textContent = String(m.text || m.body || m.message || m.content || m.html || m.view || '').trim();
                const hasAttachment = !!(m.file || m.attachment || m.file_path || m.image || m.file_name);
                const isSystemUser = !m.member_id && !m.user_id && !m.sender_name && !isMe;

                const isSystemEvent = m.is_system === true ||
                                      m.type === 'system' ||
                                      m.type === 'event' ||
                                      m.is_event === true ||
                                      isSystemUser ||
                                      rawJson.includes('"type":"system"') ||
                                      rawJson.includes('"is_system":true') ||
                                      rawJson.includes('chat-join-left') ||
                                      rawJson.includes('chat-event-with-id') ||
                                      (m.action && m.action !== 'message' && m.action !== 'send') ||
                                      (!textContent && !hasAttachment);

                if (isSystemEvent) {
                    let isCreated = false;
                    let isLeft = false;
                    let isJoin = false;

                    // Evaluasi heuristik komprehensif
                    if (rawJson.includes('ti-calendar-event') || rawJson.includes('created this group chat')) {
                        isCreated = true;
                    } else if (rawJson.includes('ti-user-minus') || rawJson.includes('left the chat') || rawJson.includes('"action":"remove"') || rawJson.includes('"is_left":true') || rawJson.includes('"type":2') || rawJson.includes('"type":"2"')) {
                        isLeft = true;
                    } else if (rawJson.includes('ti-user-plus') || rawJson.includes('joined the chat') || rawJson.includes('"action":"join"') || rawJson.includes('"is_join":true') || rawJson.includes('"type":1') || rawJson.includes('"type":"1"')) {
                        isJoin = true;
                    } else {
                        if (rawJson.includes('left') || rawJson.includes('remove')) {
                            isLeft = true;
                        } else if (rawJson.includes('join') || rawJson.includes('add')) {
                            isJoin = true;
                        } else if (index === 0) {
                            isCreated = true; // Heuristik kronologis pembentuk grup
                        } else {
                            isJoin = true;
                        }
                    }

                    let iconSvg = '';
                    let finalSysText = '';
                    // Proteksi XSS: Nama dieksekusi melalui escapeHTML
                    const safeSenderName = escapeHTML(sender);
                    const creatorName = isMe ? "You" : safeSenderName;

                    if (isCreated) {
                        let dStr = ""; let tStr = "";
                        if (m.created_at) {
                            const d = new Date(m.created_at);
                            if (!isNaN(d.getTime())) {
                                dStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                tStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                            }
                        }
                        finalSysText = `${creatorName} created this group chat` + (dStr ? ` on <strong>${dStr}</strong> at <strong>${tStr}</strong>` : "") + ".";
                        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
                    } else if (isLeft) {
                        finalSysText = `${safeSenderName} <span class="text-lowercase" style="font-style:italic;opacity:0.9;">left the chat</span>.`;
                        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="11" x2="23" y2="11"></line></svg>`;
                    } else {
                        finalSysText = `${safeSenderName} <span class="text-lowercase" style="font-style:italic;opacity:0.9;">joined the chat</span>.`;
                        iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>`;
                    }

                    htmlString += `<div class="a101-msg-row is-system"><div class="a101-system-badge">${iconSvg}<span>${finalSysText}</span></div></div>`;
                    return; 
                }

                const color = getSenderColor(sender);
                const initials = getInitials(sender);

                const safeText = document.createElement('div');
                safeText.textContent = textContent;
                let text = safeText.innerHTML;

                if (!text && hasAttachment) {
                    text = '<em>[Attachment]</em>';
                }

                htmlString += `
                  <div class="a101-msg-row ${isMe ? 'is-out' : 'is-in'}">
                    ${!isMe ? `<div class="a101-avatar" style="background:${color};">${initials}</div>` : ''}
                    <div class="a101-bubble ${isMe ? 'a101-out' : 'a101-in'}">
                      ${!isMe ? `<span class="a101-sender" style="color:${color} !important;">${escapeHTML(sender)}</span>` : ''}
                      <span>${text}</span>
                      <span class="a101-time">${timeString}</span>
                    </div>
                    ${isMe ? `<div class="a101-avatar-out">ME</div>` : ''}
                  </div>
                `;
            } catch (err) {}
          });

          msgsEl.innerHTML = htmlString;
          msgsEl.scrollTop = msgsEl.scrollHeight;
          return true;
      } catch (fatalErr) {
          return false;
      }
    }

    // =========================================================================
    // 12. PENGIRIMAN PESAN OPTIMISTIS (OPTIMISTIC UI UPDATE)
    // =========================================================================

    document.getElementById('a101-send-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById('a101-msg-input');
      const text = input.value.trim();
      if (!text || !activeChat.id) return;
      input.value = '';

      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const row = document.createElement('div');
      row.className = 'a101-msg-row is-out';
      row.innerHTML = `<div class="a101-bubble a101-out"><span>${escapeHTML(text)}</span><span class="a101-time">${time}</span></div><div class="a101-avatar-out">ME</div>`;
      msgsEl.appendChild(row);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      claimLeadership();
      await postData(api.send, { chat_id: activeChat.id, text });
      setTimeout(() => loadMsgs(activeChat.id), 250);
    };

    // =========================================================================
    // 13. SINKRONISASI DAFTAR KONTAK OBROLAN (LEADER ONLY FETCH)
    // =========================================================================

    function processSharedChats(chats) {
        let totalUnread = 0;
        chats.forEach(c => { 
            totalUnread += c.unread; 
            if (!chatState[c.id]) chatState[c.id] = {};
            chatState[c.id].unread = c.unread;
        });

        const sig = chats.map(c => c.id + ':' + c.unread).join('|');
        if (sig !== lastChatSig && chats.length) {
            lastChatSig = sig;
            if (!activeChat.id && chats[0]) activeChat = chats[0];
            renderContacts(chats);
        }

        isFirst = false;
        badgeEl.textContent = totalUnread > 99 ? '99+' : totalUnread;
        badgeEl.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }

    let isFetchingChats = false;

    async function loadChats() {
      if (!isLeader()) {
          const cached = getSharedData('shared_chats');
          if (cached) processSharedChats(cached);
          return;
      }

      if (isFetchingChats) return;
      isFetchingChats = true;
      try {
        let raw = Array.from(document.querySelectorAll('#chat-list .chat-contact-list-item, #outer-chat-list .chat-contact-list-item'));

        if (!raw.length) {
          const res = await postData(api.chats, { page: 0, channel_type: '', search: '' });
          if (res.ok) {
            const d = await res.json();
            if (d?.html) {
              const parser = new DOMParser();
              raw = Array.from(parser.parseFromString('<div>' + d.html + '</div>', 'text/html').querySelectorAll('.chat-contact-list-item, li[data-chat_id]'));
            }
          }
        }

        const seen = new Set();
        const chats = [];

        raw.forEach(el => {
          const id = el.getAttribute('data-chat_id') || el.id?.replace(/^(inner_|outer_)/, '');
          if (!id || seen.has(id)) return;
          seen.add(id);

          const isOpenAndFocused = bodyEl.style.display !== 'none' && activeChat.id === id && !document.hidden && document.hasFocus();
          const badge = el.querySelector('.group-seen');
          const unread = isOpenAndFocused ? 0 : (parseInt(badge?.textContent || el.getAttribute('data-unread_count') || '0', 10) || 0);

          const chatName = el.querySelector('.chat-title, .chat-contact-name, h6')?.textContent?.trim() || 'Group';

          let prevUnreadCount = chatState[id] ? chatState[id].unread : 0;
          if (!isFirst && unread > prevUnreadCount) {
             playAlert(chatName, 'New message received in the chat.');
          }

          if (!chatState[id]) chatState[id] = {};
          chatState[id].unread = unread;

          chats.push({
            id,
            name: chatName,
            img: el.querySelector('img')?.src || base + '/storage/uploads/1762346132_logo-small.png',
            bio: el.getAttribute('data-chat_bio') || 'Arabic101',
            members: el.getAttribute('data-members') || '',
            unread
          });
        });

        saveSharedData('shared_chats', chats);
        processSharedChats(chats);
      } catch (e) {
      } finally {
        isFetchingChats = false;
      }
    }

    function renderContacts(chats) {
      const listEl = document.getElementById('a101-contacts');
      listEl.innerHTML = chats.map(c => `
        <div class="a101-item" data-id="${c.id}">
          <img src="${c.img}" width="32" height="32" style="border-radius:50%;object-fit:cover;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(c.name)}</strong>
              ${c.unread > 0 ? `<span style="background:#2563eb;color:#fff;border-radius:10px;padding:0 6px;font-size:10px;font-weight:700;">${c.unread}</span>` : ''}
            </div>
            <div style="font-size:10.5px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(c.members || c.bio)}</div>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.a101-item').forEach(item => {
        item.onclick = () => {
          claimLeadership();
          const id = item.getAttribute('data-id');
          const c = chats.find(x => x.id === id);
          if (!c) return;
          activeChat = c;
          document.getElementById('a101-head-name').textContent = c.name;
          document.getElementById('a101-dock-label').textContent = c.name;
          document.getElementById('a101-head-img').src = c.img;
          document.getElementById('a101-head-members').textContent = c.members || c.bio || 'Arabic101';
          setWindow('body');
        };
      });
    }

    document.getElementById('a101-search').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#a101-contacts .a101-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
      });
    };

    // =========================================================================
    // 14. PEMANTAUAN SINKRONISASI BERKALA
    // =========================================================================

    function sync() {
      checkTheme();
      loadChats();

      if (activeChat.id && bodyEl.style.display !== 'none') {
        loadMsgs(activeChat.id);
      }
    }

    sync();
    setInterval(() => {
        if (isLeader()) sync();
    }, 5000);

})();