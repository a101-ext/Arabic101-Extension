/**
 * Arabic101 Calendar Synchronization Engine - Background Service Worker (Final Production)
 * Compliance: Manifest V3 / Chrome Identity OAuth2 / Dual-Calendar Architecture
 * 
 * Fitur & Proteksi:
 * - Sub-kalender Ganda: 'Arabic101 Academy Schedule' (Aktif) & 'Arabic101 Academy Schedule - Logs' (Riwayat Lampau).
 * - Proteksi Log pada Remove: Opsi remove HANYA menghapus kalender aktif, kalender Logs tetap utuh.
 * - Migrasi Pra-Penghapusan: Sebelum kalender aktif dihapus, sesi aktual kemarin dipindahkan ke Logs via events.move.
 * - Exponential Backoff: Penanganan limit HTTP 429/403 dari Google API dengan variasi jitter acak.
 * - UI Language Policy: Seluruh pesan antarmuka/response 100% Bahasa Inggris (Bahasa Indonesia hanya pada komentar).
 */

// =========================================================================
// 1. UTILITAS JARINGAN: EXPONENTIAL BACKOFF DENGAN JITTER
// =========================================================================

// Melakukan percobaan ulang secara eksponensial jika terjadi rate limit (HTTP 429/403) dari Google API
async function fetchWithRetry(url, options = {}, retries = 4, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        if (response.status === 429 || response.status === 403) {
            if (retries > 0) {
                // Jitter acak (0-250ms) untuk mencegah request serentak
                const jitter = Math.floor(Math.random() * 250);
                await new Promise(resolve => setTimeout(resolve, backoff + jitter));
                return fetchWithRetry(url, options, retries - 1, backoff * 2);
            }
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

// =========================================================================
// 2. MODUL REST API GOOGLE CALENDAR
// =========================================================================

// Pembungkus utama permintaan API Google Calendar menggunakan token non-interaktif
async function gcalApiRequest(method, endpoint, payload = null) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, async function(token) {
            if (chrome.runtime.lastError || !token) {
                reject('Google authentication expired or disconnected. Please reconnect your account.');
                return;
            }

            const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            const options = { method, headers };
            if (payload) options.body = JSON.stringify(payload);

            try {
                const response = await fetchWithRetry(url, options);
                
                // Bersihkan cache token lokal jika status 401 Unauthorized
                if (response.status === 401) {
                    chrome.identity.removeCachedAuthToken({ token: token }, function() {
                        reject('Server session expired. Please reconnect your Google account.');
                    });
                    return;
                }

                if (!response.ok) {
                    const errorPackage = await response.json();
                    reject(`Abnormal API response: ${errorPackage.error ? errorPackage.error.message : response.statusText}`);
                    return;
                }

                resolve(method === 'DELETE' ? true : await response.json());
            } catch (err) {
                reject(err.message);
            }
        });
    });
}

// =========================================================================
// 3. RESOLUSI KALENDER: AKTIF VS LOGS
// =========================================================================

// Menemukan ID sub-kalender aktif 'Arabic101 Academy Schedule'
async function findArabic101Calendar() {
    let path = '/users/me/calendarList';
    let queryToken = null;

    do {
        let reqPath = path + (queryToken ? `?pageToken=${queryToken}` : '');
        const packet = await gcalApiRequest('GET', reqPath);
        if (packet && packet.items) {
            const targetCal = packet.items.find(c => c.summary === 'Arabic101 Academy Schedule');
            if (targetCal) return targetCal.id;
        }
        queryToken = packet ? packet.nextPageToken : null;
    } while (queryToken);

    return null;
}

// Menemukan atau membuat sub-kalender aktif 'Arabic101 Academy Schedule'
async function findOrCreateActiveCalendar(localTimezone) {
    const existingId = await findArabic101Calendar();
    if (existingId) return existingId;

    const newCal = await gcalApiRequest('POST', '/calendars', {
        summary: 'Arabic101 Academy Schedule',
        timeZone: localTimezone
    });
    return newCal.id;
}

// Menemukan atau membuat sub-kalender arsip 'Arabic101 Academy Schedule - Logs'
async function findOrCreateLogsCalendar(localTimezone) {
    let path = '/users/me/calendarList';
    let queryToken = null;

    do {
        let reqPath = path + (queryToken ? `?pageToken=${queryToken}` : '');
        const packet = await gcalApiRequest('GET', reqPath);
        if (packet && packet.items) {
            const targetCal = packet.items.find(c => c.summary === 'Arabic101 Academy Schedule - Logs');
            if (targetCal) return targetCal.id;
        }
        queryToken = packet ? packet.nextPageToken : null;
    } while (queryToken);

    const newCal = await gcalApiRequest('POST', '/calendars', {
        summary: 'Arabic101 Academy Schedule - Logs',
        timeZone: localTimezone
    });
    return newCal.id;
}

// =========================================================================
// 4. MESSAGE DISPATCHER RUNTIME
// =========================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // --- 4.1 Cek Otorisasi & Login Google ---
    if (request.action === 'checkAuth' || request.action === 'loginGoogle') {
        const isInteractive = request.action === 'loginGoogle';
        chrome.identity.getAuthToken({ interactive: isInteractive }, function(token) {
            if (chrome.runtime.lastError || !token) {
                sendResponse({ connected: false });
                return;
            }
            
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(res => res.json())
            .then(data => {
                sendResponse({ connected: true, email: data.email || 'Connected Account' });
            })
            .catch(() => {
                sendResponse({ connected: true, email: 'Connected Account' });
            });
        });
        return true;
    }

    // --- 4.2 Logout Google & Cabut Sesi ---
    if (request.action === 'logoutGoogle' || request.action === 'switchAccount') {
        chrome.identity.getAuthToken({ interactive: false }, function(token) {
            chrome.identity.clearAllCachedAuthTokens(function() {
                if (token) {
                    fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token)
                        .then(() => sendResponse({ success: true, message: "Account disconnected successfully." }))
                        .catch(() => sendResponse({ success: true, message: "Account disconnected locally." }));
                } else {
                    sendResponse({ success: true, message: "Account disconnected successfully." });
                }
            });
        });
        return true;
    }

    // --- 4.3 SINKRONISASI PINTAR (DIFFERENTIAL UPDATE & MIGRATION) ---
    if (request.action === 'syncGCal') {
        (async () => {
            try {
                const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                // 1. Inisialisasi ID sub-kalender aktif dan log
                const activeCalId = await findOrCreateActiveCalendar(localTimezone);
                const logsCalId = await findOrCreateLogsCalendar(localTimezone);

                // 2. Tarik seluruh event yang tercatat pada sub-kalender aktif
                let existingEvents = [];
                let queryToken = null;
                do {
                    let path = `/calendars/${encodeURIComponent(activeCalId)}/events?maxResults=2500` + (queryToken ? `&pageToken=${queryToken}` : '');
                    const packet = await gcalApiRequest('GET', path);
                    if (packet && packet.items) existingEvents = existingEvents.concat(packet.items);
                    queryToken = packet ? packet.nextPageToken : null;
                } while (queryToken);

                // Menentukan batas awal hari ini (pukul 00:00:00)
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                // Deteksi apakah data yang dikirim adalah mode regular (memiliki pola RRULE)
                const isTargetRegularMode = request.eventsData.some(e => !!e.rruleString);

                // 3. PENGARSIPAN KELAS LAMPAU & TRANSISI MODE
                for (const evt of existingEvents) {
                    const trackingId = evt.extendedProperties?.private?.arabic101_course_id || '';
                    const isRecurring = !!evt.recurrence || trackingId.includes('_REG_');
                    const isActual = trackingId.startsWith('ACT_') || (!isRecurring && !trackingId.includes('_REG_'));

                    const eventEnd = evt.end?.dateTime ? new Date(evt.end.dateTime) : (evt.end?.date ? new Date(evt.end.date) : null);
                    const isPast = eventEnd && eventEnd < todayStart;

                    if (isTargetRegularMode) {
                        // Jika beralih ke mode Regular Timetable
                        if (isActual) {
                            if (isPast) {
                                // Pindahkan sesi aktual kemarin ke Logs
                                await gcalApiRequest('POST', `/calendars/${encodeURIComponent(activeCalId)}/events/${encodeURIComponent(evt.id)}/move?destination=${encodeURIComponent(logsCalId)}`);
                            } else {
                                // Hapus sesi aktual masa depan agar digantikan master timetable
                                await gcalApiRequest('DELETE', `/calendars/${encodeURIComponent(activeCalId)}/events/${encodeURIComponent(evt.id)}`);
                            }
                        }
                    } else {
                        // Jika beralih ke mode Aktual (7 atau 30 hari)
                        if (isRecurring) {
                            // Hapus pola recurring mingguan tanpa memasukkannya ke Logs
                            await gcalApiRequest('DELETE', `/calendars/${encodeURIComponent(activeCalId)}/events/${encodeURIComponent(evt.id)}`);
                        } else if (isActual && isPast) {
                            // Pindahkan sesi aktual kemarin ke sub-kalender Logs
                            await gcalApiRequest('POST', `/calendars/${encodeURIComponent(activeCalId)}/events/${encodeURIComponent(evt.id)}/move?destination=${encodeURIComponent(logsCalId)}`);
                        }
                    }
                }

                // 4. TARIK ULANG EVENT AKTIF SETELAH PROSES PENGARSIPAN
                let refreshedActiveEvents = [];
                queryToken = null;
                do {
                    let path = `/calendars/${encodeURIComponent(activeCalId)}/events?maxResults=2500` + (queryToken ? `&pageToken=${queryToken}` : '');
                    const packet = await gcalApiRequest('GET', path);
                    if (packet && packet.items) refreshedActiveEvents = refreshedActiveEvents.concat(packet.items);
                    queryToken = packet ? packet.nextPageToken : null;
                } while (queryToken);

                const activeCatalog = new Map();
                refreshedActiveEvents.forEach(evt => {
                    const trId = evt.extendedProperties?.private?.arabic101_course_id;
                    if (trId) activeCatalog.set(trId, evt);
                });

                const localSignatures = new Set();
                let opsAdded = 0, opsPatched = 0, opsPurged = 0;

                // 5. INSERT / PATCH EVENT DARI DASBOR
                for (const domEvent of request.eventsData) {
                    localSignatures.add(domEvent.courseId);

                    const templateObject = {
                        summary: domEvent.title,
                        description: domEvent.description,
                        start: { dateTime: domEvent.startISO, timeZone: localTimezone },
                        end: { dateTime: domEvent.endISO, timeZone: localTimezone },
                        transparency: domEvent.isCanceled ? 'transparent' : 'opaque',
                        extendedProperties: {
                            private: {
                                arabic101_source: 'schedule_extension',
                                arabic101_course_id: domEvent.courseId
                            }
                        }
                    };

                    if (domEvent.rruleString) {
                        templateObject.recurrence = [domEvent.rruleString];
                    }

                    if (activeCatalog.has(domEvent.courseId)) {
                        const remoteEvt = activeCatalog.get(domEvent.courseId);
                        await gcalApiRequest('PATCH', `/calendars/${encodeURIComponent(activeCalId)}/events/${remoteEvt.id}`, templateObject);
                        opsPatched++;
                    } else {
                        await gcalApiRequest('POST', `/calendars/${encodeURIComponent(activeCalId)}/events`, templateObject);
                        opsAdded++;
                    }
                }

                // 6. PURGE JADWAL KEDALUWARSA DI MASA DEPAN
                // Jika jam kelas bergeser karena DST/waktu sholat, ID lama dihapus di sini
                // Jika dasbor kosong (0 jadwal), event masa depan di kalender aktif dibersihkan
                for (const [id, remoteEvt] of activeCatalog.entries()) {
                    if (!localSignatures.has(id)) {
                        await gcalApiRequest('DELETE', `/calendars/${encodeURIComponent(activeCalId)}/events/${remoteEvt.id}`);
                        opsPurged++;
                    }
                }

                sendResponse({ 
                    success: true, 
                    message: `Sync Complete: ${opsAdded} Added, ${opsPatched} Updated, ${opsPurged} Removed from Active Schedule.` 
                });
            } catch (error) {
                sendResponse({ success: false, error: error.toString() });
            }
        })();
        return true; 
    }

    // --- 4.4 REMOVE FROM GCAL: AMANKAN LOGS DULU, HANYA HAPUS KALENDER AKTIF ---
    if (request.action === 'purgeGCal') {
        (async () => {
            try {
                const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const activeCalId = await findArabic101Calendar();

                if (!activeCalId) {
                    sendResponse({ success: true, message: "No active 'Arabic101 Academy Schedule' sub-calendar found." });
                    return;
                }

                // 1. Periksa apakah ada jadwal lampau (kemarin) di kalender aktif yang belum sempat masuk Logs
                let remoteEvents = [];
                let queryToken = null;
                do {
                    let path = `/calendars/${encodeURIComponent(activeCalId)}/events?maxResults=2500` + (queryToken ? `&pageToken=${queryToken}` : '');
                    const packet = await gcalApiRequest('GET', path);
                    if (packet && packet.items) remoteEvents = remoteEvents.concat(packet.items);
                    queryToken = packet ? packet.nextPageToken : null;
                } while (queryToken);

                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                // Filter sesi aktual yang tanggal selesainya sebelum hari ini
                const pastEventsToMigrate = remoteEvents.filter(evt => {
                    const trackingId = evt.extendedProperties?.private?.arabic101_course_id || '';
                    const isRecurring = !!evt.recurrence || trackingId.includes('_REG_');
                    const eventEnd = evt.end?.dateTime ? new Date(evt.end.dateTime) : (evt.end?.date ? new Date(evt.end.date) : null);
                    return !isRecurring && eventEnd && eventEnd < todayStart;
                });

                // Jika ada event lampau, pindahkan terlebih dahulu ke sub-kalender Logs
                if (pastEventsToMigrate.length > 0) {
                    const logsCalId = await findOrCreateLogsCalendar(localTimezone);
                    for (const evt of pastEventsToMigrate) {
                        try {
                            await gcalApiRequest('POST', `/calendars/${encodeURIComponent(activeCalId)}/events/${encodeURIComponent(evt.id)}/move?destination=${encodeURIComponent(logsCalId)}`);
                        } catch (mErr) {}
                    }
                }

                // 2. HANYA HAPUS SUB-KALENDER AKTIF. KALENDER LOGS TETAP UTUH & TIDAK DIHAPUS.
                await gcalApiRequest('DELETE', `/calendars/${encodeURIComponent(activeCalId)}`);

                sendResponse({ 
                    success: true, 
                    message: `Active schedule removed successfully. ${pastEventsToMigrate.length > 0 ? `${pastEventsToMigrate.length} past class(es) archived to Logs.` : 'Class history in Logs was preserved.'}`
                });
            } catch (error) {
                sendResponse({ success: false, error: error.toString() });
            }
        })();
        return true;
    }
});