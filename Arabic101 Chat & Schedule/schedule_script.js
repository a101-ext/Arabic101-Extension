/**
 * Arabic101 Calendar Synchronization Engine - Content Script (Final Production)
 * Compliance: Manifest V3 / DOM Asymmetry Mitigation / Multi-Role Dashboard Adaptor
 *
 * Karakteristik & Fitur:
 * - Offline Settings & Export ICS: Ikon Gear selalu tampil saat belum login dengan opsi "Calendar Mode".
 * - Penyesuaian Menu Unauthenticated: Fitur Target Profile dan Auto-Sync Background disembunyikan jika belum login.
 * - UI/UX 100% Bahasa Inggris (Dialog, Toast, Button, Popup, Setting). Bahasa Indonesia HANYA di komentar script.
 * - Format Judul Bersih: Tag status + "A101 - Nama - Inisial Kursus" (tanpa kurung siku pada A101).
 * - Pemetaan Status:
 *   * Cancel / Student Cancel -> [Canceled] (Waktu disetel Free/Transparent di GCal)
 *   * Absent / Student Absent -> [Absent] (Waktu disetel Free/Transparent di GCal)
 *   * Attended -> [Attended]
 *   * Waiting / Running -> [Ongoing]
 *   * Pending / Active -> Tanpa prefix tag
 * - Unicode-Safe Profile Extractor: Mendukung nama beraksara Arab dan pembersihan emoji.
 */
(function() {
    'use strict';

    // Mengambil URL halaman aktif saat ini
    const currentUrl = window.location.href;

    // 1. GATEWAY ROUTING: Pembatasan eksekusi hanya pada lingkungan guru (/teacher/) dan siswa (/student/)
    if (currentUrl.includes('/management/')) return;
    if (!currentUrl.includes('/teacher/') && !currentUrl.includes('/student/')) return;

    // 2. DETEKSI STATUS EKSISTENSI CHROME API (Mencegah "Context Invalidated" Error)
    function isContextValid() {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    }

    // 3. EKSTRAKSI PROFIL DASBOR (Mendukung Aksara Arab & Pembersihan Emoji)
    function extractDashboardProfile() {
        let profile = { name: '', role: '', avatar: '', email: '' };
        try {
            const dropdown = document.querySelector('.profile-dropdown');
            if (dropdown) {
                const img = dropdown.querySelector('img');
                const h5 = dropdown.querySelector('h5');
                const span = dropdown.querySelector('h5 span');
                const p = dropdown.querySelector('p');

                if (img) profile.avatar = img.src;
                if (h5) {
                    let clone = h5.cloneNode(true);
                    let spanEl = clone.querySelector('span');
                    if (spanEl) spanEl.remove();

                    // Membersihkan emoji grafis tanpa membuang karakter aksara Arab (U+0600 - U+06FF)
                    profile.name = clone.innerText
                        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "")
                        .trim();
                }
                if (span) profile.role = span.innerText.replace(/[^a-zA-Z]/g, '').trim();
                if (p) profile.email = p.innerText.trim();
            }
        } catch(e) {}

        return profile;
    }

    const domProfile = extractDashboardProfile();
    const defaultRole = domProfile.role ? domProfile.role.toLowerCase() : (currentUrl.includes('/teacher/') ? 'teacher' : 'student');

    if (!isContextValid()) return;

    // Menyimpan data peran dan profil ke penyimpanan lokal Chrome
    chrome.storage.local.get(['arabic101_visited_roles'], function(data) {
        if (!isContextValid()) return;

        let roles = data.arabic101_visited_roles || [];
        if (!roles.includes(defaultRole)) {
            roles.push(defaultRole);
            chrome.storage.local.set({ 'arabic101_visited_roles': roles });
        }

        if (domProfile.role) {
            let cacheObj = {};
            cacheObj[`arabic101_cached_profile_${defaultRole}`] = domProfile;
            chrome.storage.local.set(cacheObj);
        }
    });

    // Mencegah panel kontrol ekstensi diinjeksi dua kali ke DOM
    if (document.getElementById('arabic101-sync-wrapper')) return;

    // Menentukan arah lontaran menu popup dropdown (ke atas pada rute /timetable agar tidak terpotong layar)
    const isTimetableRoute = currentUrl.includes('/timetable');
    const popupVerticalPosition = isTimetableRoute ? 'bottom: calc(100% + 10px); top: auto;' : 'top: calc(100% + 10px); bottom: auto;';

    // --- ASET IKON VEKTOR SVG ---
    const iconGoogleG = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
    const iconLogout = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
    const iconSync = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    const iconDownload = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    const iconTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    const iconExternal = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
    const iconGear = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    const iconHamburger = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;

    // --- FUNGSI UTILITAS BANTU ---

    // Menampilkan toast notifikasi di layar dalam Bahasa Inggris
    function showToast(message, isError = false) {
        let toast = document.getElementById('arabic101-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'arabic101-toast';
            document.body.appendChild(toast);
            const style = document.createElement('style');
            style.innerHTML = `#arabic101-toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; color: white; font-size: 14px; font-weight: 500; z-index: 999999; opacity: 0; transition: opacity 0.3s, transform 0.3s; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.25); text-align: center;} #arabic101-toast.show { opacity: 1; transform: translateX(-50%) translateY(-10px); } #arabic101-toast.success { background-color: #198754; border: 1px solid #146c43; } #arabic101-toast.error { background-color: #dc3545; border: 1px solid #b02a37; }`;
            document.head.appendChild(style);
        }
        toast.className = isError ? 'error show' : 'success show';
        toast.innerText = message;
        if (window.arabic101ToastTimeout) clearTimeout(window.arabic101ToastTimeout);
        window.arabic101ToastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 4000);
    }

    function formatDateForURL(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Menghapus pemisah tanggal dan waktu agar sesuai spesifikasi iCalendar (ICS)
    function encodeToICSFormat(dateObject) {
        return dateObject.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    function getCourseInitials(courseName) {
        if (!courseName) return "CLASS";
        let cleanName = courseName.split('-')[0].replace(/\(.*?\)/g, '').trim();
        return cleanName.split(/\s+/).map(word => word.charAt(0).toUpperCase()).join('');
    }

    function calculateDurationSpan(durationText) {
        if (!durationText) return 60;
        const semanticText = durationText.toLowerCase();
        let computeMinutes = 60;
        if (semanticText.includes("hour")) {
            const parsed = semanticText.match(/(\d+)/);
            if (parsed) computeMinutes = parseInt(parsed[1]) * 60;
        } else if (semanticText.includes("m")) {
            const parsed = semanticText.match(/(\d+)/);
            if (parsed) computeMinutes = parseInt(parsed[1]);
        }
        return computeMinutes;
    }

    function extractTextPolyfill(node) {
        if (!node) return "";
        if (typeof node.innerText === 'string' && node.innerText.length > 0) return node.innerText;
        const clone = node.cloneNode(true);
        const blockElements = clone.querySelectorAll('br, div, p, tr, li, h6, span, small');
        blockElements.forEach(el => el.insertAdjacentText('afterend', '\n'));
        return clone.textContent.replace(/\n\s*\n/g, '\n').trim();
    }

    // --- MESIN PARSER 1: JADWAL TIMETABLE MINGGUAN (REGULER BERULANG) ---
    function digestRegularTimetable(rootNode = document) {
        const activeEventsArray = [];
        const DAY_MAP = { 'sat': "0", 'sun': "1", 'mon': "2", 'tue': "3", 'wed': "4", 'thu': "5", 'fri': "6" };
        const DAY_TRANSLATION_MAP = { "0": "SA", "1": "SU", "2": "MO", "3": "TU", "4": "WE", "5": "TH", "6": "FR" };

        const headers = Array.from(rootNode.querySelectorAll('th, .fc-col-header-cell, [class*="header"], .cal-header'))
            .filter(h => extractTextPolyfill(h).match(/(Sat|Sun|Mon|Tue|Wed|Thu|Fri)/i));

        const headerBounds = headers.map(h => {
            const dayText = extractTextPolyfill(h).match(/(Sat|Sun|Mon|Tue|Wed|Thu|Fri)/i)[0].toLowerCase();
            return { dayIndex: DAY_MAP[dayText], rect: h.getBoundingClientRect ? h.getBoundingClientRect() : null };
        }).filter(h => h.rect !== null);

        const allElements = rootNode.querySelectorAll('.event-item, .fc-event, .schedule-item, button[data-course]');
        const eventBlocks = Array.from(allElements).filter(el => {
            if (el.children.length > 10) return false;
            const txt = extractTextPolyfill(el);
            return el.hasAttribute('data-start') || el.hasAttribute('data-course') || txt.match(/\d{1,2}:\d{2}\s*(AM|PM)/i) !== null;
        });

        const uniqueBlocks = eventBlocks.filter(el => {
            const hasEventChild = Array.from(el.querySelectorAll('*')).some(child => eventBlocks.includes(child));
            return !hasEventChild;
        });

        uniqueBlocks.forEach((block, index) => {
            const txt = extractTextPolyfill(block);
            if (txt.includes('Not Available') || block.classList.contains('availability-segment') || block.getAttribute('data-event-type') === 'availability') return;

            let dayIndex = block.getAttribute('data-day');

            if (!dayIndex && headerBounds.length > 0 && block.getBoundingClientRect && block.getBoundingClientRect().width > 0) {
                const blockRect = block.getBoundingClientRect();
                const blockCenter = blockRect.left + (blockRect.width / 2);
                for (const bound of headerBounds) {
                    if (blockCenter >= (bound.rect.left - 15) && blockCenter <= (bound.rect.right + 15)) {
                        dayIndex = bound.dayIndex; break;
                    }
                }
            }

            if (!dayIndex) {
                let parent = block.closest('[data-day], [data-date], .fc-day');
                if (parent) {
                    dayIndex = parent.getAttribute('data-day');
                    if (!dayIndex && parent.classList.contains('fc-day')) {
                        const classMatch = parent.className.match(/fc-day-(sat|sun|mon|tue|wed|thu|fri)/i);
                        if (classMatch) dayIndex = DAY_MAP[classMatch[1].toLowerCase()];
                    }
                }
            }
            dayIndex = dayIndex || "0";

            let initiationTime = block.getAttribute('data-start');
            let timeSpan = block.getAttribute('data-duration') || "1 hour(s)";
            let validationStatus = block.getAttribute('data-status') || "Active";
            let curriculumSubject = block.getAttribute('data-material');
            let participantStudent = block.getAttribute('data-student') || "Student";
            let participantTeacher = block.getAttribute('data-teacher') || "";

            if (!initiationTime || !curriculumSubject) {
                let cleanLines = txt.split('\n').map(l => l.trim()).filter(l => l !== '');
                let people = [];
                for (let line of cleanLines) {
                    if (!initiationTime && line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)) initiationTime = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)[1];
                    else if (line.match(/(\d+\s*(?:hour\(s\)|hour|m|mins?))/i)) timeSpan = line.match(/(\d+\s*(?:hour\(s\)|hour|m|mins?))/i)[1];
                    else if (line.match(/^(Active|Inactive|Cancel|Cancelled|Absent)$/i)) validationStatus = line;
                    else if (line.match(/Course|Tier|Literacy|Mastery/i)) { if (!curriculumSubject) curriculumSubject = line; }
                    else if (line.length > 3 && !line.match(/\d{1,2}:\d{2}/)) people.push(line);
                }
                if (!curriculumSubject) {
                    participantStudent = people.length > 0 ? people[0] : participantStudent;
                    participantTeacher = people.length > 1 ? people[1] : participantTeacher;
                    curriculumSubject = `Class: ${participantStudent}`;
                }
            }

            if (!initiationTime) {
                const fallbackTime = txt.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                if (fallbackTime) initiationTime = fallbackTime[1]; else return;
            }

            const safeDayAbbr = DAY_TRANSLATION_MAP[dayIndex];
            const rawId = block.getAttribute('data-course') || block.getAttribute('data-event-id') || `reg_${index}`;
            const structuralId = `${rawId}_REG_${safeDayAbbr}_${initiationTime.replace(/\s/g,'')}`;

            const standardJsDay = (parseInt(dayIndex) + 6) % 7;
            const datePrototypical = new Date();
            const delta = (standardJsDay + 7 - datePrototypical.getDay()) % 7;
            datePrototypical.setDate(datePrototypical.getDate() + delta);

            const timeTokens = initiationTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            let hrs = parseInt(timeTokens[1], 10);
            if (timeTokens[3].toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
            if (timeTokens[3].toUpperCase() === 'AM' && hrs === 12) hrs = 0;
            datePrototypical.setHours(hrs, parseInt(timeTokens[2], 10), 0, 0);

            const definitiveEnd = new Date(datePrototypical.getTime() + calculateDurationSpan(timeSpan) * 60000);

            const statusLower = validationStatus.toLowerCase();
            let prefixState = '';
            let isCanceledOrAbsent = false;

            if (statusLower.includes('cancel')) {
                prefixState = '[Canceled] ';
                isCanceledOrAbsent = true;
            } else if (statusLower.includes('absent')) {
                prefixState = '[Absent] ';
                isCanceledOrAbsent = true;
            } else if (statusLower.includes('attended')) {
                prefixState = '[Attended] ';
            } else if (statusLower.includes('waiting') || statusLower.includes('running')) {
                prefixState = '[Ongoing] ';
            } else {
                prefixState = '';
            }

            const courseInitials = getCourseInitials(curriculumSubject);
            const shortStudentName = participantStudent.split(' ')[0];
            const formattedTitle = `${prefixState}A101 - ${shortStudentName} - ${courseInitials}`;

            let detailedSynopsis = `Student: ${participantStudent}\nCourse: ${curriculumSubject}\nStatus: ${validationStatus}\nMode: Regular Timetable\nOrigin: Arabic101 Extension`;

            activeEventsArray.push({
                courseId: structuralId,
                title: formattedTitle,
                description: detailedSynopsis,
                startISO: datePrototypical.toISOString(),
                endISO: definitiveEnd.toISOString(),
                rruleString: `RRULE:FREQ=WEEKLY;BYDAY=${safeDayAbbr}`,
                isCanceled: isCanceledOrAbsent,
                icsStartNotation: encodeToICSFormat(datePrototypical),
                icsEndNotation: encodeToICSFormat(definitiveEnd)
            });
        });

        const deduplicatedMap = new Map();
        activeEventsArray.forEach(ev => deduplicatedMap.set(ev.courseId, ev));
        return Array.from(deduplicatedMap.values());
    }

    // --- MESIN PARSER 2: JADWAL AKTUAL HARIAN (SOLUSI ASIMETRI GURU VS SISWA) ---
    function digestActualSchedule(rootNode, activeProfile) {
        const eventsArray = [];
        const rows = rootNode.querySelectorAll('.table-border-bottom-0 tr');
        let detectedRole = activeProfile;

        rows.forEach((row, idx) => {
            const cols = row.querySelectorAll('td');
            if (cols.length < 5) return;

            let dateStr = '', timeStr = '', studentName = '', courseName = '', statusStr = '', durationStr = '60 m';

            if (detectedRole === 'teacher') {
                const dtParts = extractTextPolyfill(cols[1]).split('\n').map(s => s.trim()).filter(s => s !== '');
                dateStr = dtParts[0] || '';
                timeStr = dtParts[1] || '';
                studentName = extractTextPolyfill(cols[2]).split('\n').map(s => s.trim()).filter(s => s !== '')[0] || '';

                const courseParts = extractTextPolyfill(cols[3]).split('\n').map(s => s.trim()).filter(s => s !== '');
                courseName = courseParts[0] || '';

                const durMatch = extractTextPolyfill(cols[3]).match(/\((\d+)\)/);
                if (durMatch) durationStr = durMatch[1] + ' m';

                statusStr = extractTextPolyfill(cols[4]).replace(/\n/g, ' ').trim();
            } else {
                dateStr = extractTextPolyfill(cols[0]).trim();
                timeStr = extractTextPolyfill(cols[1]).trim();
                studentName = extractTextPolyfill(cols[2]).trim();

                const courseParts = extractTextPolyfill(cols[4]).split('\n').map(s => s.trim()).filter(s => s !== '');
                courseName = courseParts[0] || '';

                const durMatch = extractTextPolyfill(cols[4]).match(/\((\d+)\)/);
                if (durMatch) durationStr = durMatch[1] + ' m';

                statusStr = extractTextPolyfill(cols[6]).replace(/\n/g, ' ').trim();
            }

            if (!dateStr || !timeStr) return;

            const startDateTime = new Date(`${dateStr} ${timeStr}`);
            if (isNaN(startDateTime.getTime())) return;

            const endDateTime = new Date(startDateTime.getTime() + calculateDurationSpan(durationStr) * 60000);
            const structuralId = `ACT_${detectedRole}_${dateStr}_${timeStr.replace(/\s/g,'')}_${idx}`;

            const statusLower = statusStr.toLowerCase();
            let prefixState = '';
            let isCanceledOrAbsent = false;

            if (statusLower.includes('cancel')) {
                prefixState = '[Canceled] ';
                isCanceledOrAbsent = true;
            } else if (statusLower.includes('absent')) {
                prefixState = '[Absent] ';
                isCanceledOrAbsent = true;
            } else if (statusLower.includes('attended')) {
                prefixState = '[Attended] ';
            } else if (statusLower.includes('waiting') || statusLower.includes('running')) {
                prefixState = '[Ongoing] ';
            } else {
                prefixState = '';
            }

            const courseInitials = getCourseInitials(courseName);
            const shortStudentName = studentName.split(' ')[0];
            const formattedTitle = `${prefixState}A101 - ${shortStudentName} - ${courseInitials}`;

            let classLink = '';
            const actionTd = row.querySelector('td[class^="actions"]');
            if (actionTd) {
                const idMatch = actionTd.className.match(/actions(\d+)/);
                if (idMatch && idMatch[1]) {
                    const historyEndpoint = detectedRole === 'teacher' ? 'course-history' : 'student-history';
                    classLink = `${window.location.origin}/${detectedRole}/${historyEndpoint}/${idMatch[1]}/class`;
                }
            }

            let detailedSynopsis = `Student: ${studentName}\nCourse: ${courseName}\nStatus: ${statusStr}\nMode: Actual Date Sync\nOrigin: Arabic101 Extension`;
            if (classLink) detailedSynopsis += `\n\nClass Link: ${classLink}`;

            eventsArray.push({
                courseId: structuralId,
                title: formattedTitle,
                description: detailedSynopsis,
                startISO: startDateTime.toISOString(),
                endISO: endDateTime.toISOString(),
                rruleString: null,
                isCanceled: isCanceledOrAbsent,
                icsStartNotation: encodeToICSFormat(startDateTime),
                icsEndNotation: encodeToICSFormat(endDateTime)
            });
        });

        return eventsArray;
    }

    // --- FITUR EKSPOR BERKAS .ICS (OFFLINE MODE) ---
    function generateICSFromDataset(processedSchedules) {
        if (!processedSchedules || processedSchedules.length === 0) {
            showToast('Extraction Failed: No valid schedule items found.', true);
            return;
        }

        let documentBuffer = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Arabic101 Extension System//EN\r\nCALSCALE:GREGORIAN\r\n";

        processedSchedules.forEach(sched => {
            const executionStamp = encodeToICSFormat(new Date());
            documentBuffer += "BEGIN:VEVENT\r\n";
            documentBuffer += `UID:${sched.courseId}_sys@arabic101.org\r\n`;
            documentBuffer += `DTSTAMP:${executionStamp}\r\n`;
            documentBuffer += `DTSTART:${sched.icsStartNotation}\r\n`;
            documentBuffer += `DTEND:${sched.icsEndNotation}\r\n`;
            if (sched.rruleString) {
                documentBuffer += `${sched.rruleString}\r\n`;
            }
            documentBuffer += `SUMMARY:${sched.title}\r\n`;
            documentBuffer += `DESCRIPTION:${sched.description.replace(/\n/g, '\\n')}\r\n`;
            documentBuffer += "END:VEVENT\r\n";
        });

        documentBuffer += "END:VCALENDAR\r\n";

        const binaryContainer = new Blob([documentBuffer], { type: 'text/calendar;charset=utf-8' });
        const virtualRoute = URL.createObjectURL(binaryContainer);
        const invisibleAnchor = document.createElement('a');
        invisibleAnchor.href = virtualRoute;
        invisibleAnchor.download = `Arabic101_Schedule_${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(invisibleAnchor);
        invisibleAnchor.click();
        document.body.removeChild(invisibleAnchor);
        showToast("ICS file exported successfully!");
    }

    // --- ALGORITMA PERUTEAN CERDAS & FALLBACK ---
    async function executeSmartFetch(targetProfile, syncMode) {
        const resolveTargetEndpoint = (profile, mode) => {
            if (mode === 'regular') {
                return profile === 'teacher' ? '/teacher/timetable/' : '/student/timetable';
            } else {
                let duration = mode === 'actual_30' ? 30 : 7;
                let today = new Date();
                let future = new Date();
                future.setDate(today.getDate() + duration);
                let dateParam = formatDateForURL(today) + '+to+' + formatDateForURL(future);
                return profile === 'teacher' ? `/teacher/home?date=${dateParam}` : `/student/today-sessions?date=${dateParam}`;
            }
        };

        // KOMENTAR PENTING: Fungsi utilitas untuk menghapus role yang sudah mati dari setting lokal,
        // lalu memicu pembaruan UI (refreshUIState) agar dropdown menu 'Target Profile' disembunyikan.
        const purgeDeadRole = (deadRole) => {
            if (!isContextValid()) return;
            chrome.storage.local.get(['arabic101_visited_roles'], function(data) {
                let roles = data.arabic101_visited_roles || [];
                roles = roles.filter(r => r !== deadRole);
                chrome.storage.local.set({ 'arabic101_visited_roles': roles }, () => refreshUIState());
            });
        };

        try {
            let activeProfile = targetProfile;
            let currentUrl = resolveTargetEndpoint(activeProfile, syncMode);
            let res = await fetch(currentUrl);

            // KOMENTAR PENTING: Logika Fallback 1 - Cek ketersediaan session awal.
            // Jika hasilnya 404 ATAU ter-redirect ke URL yang BUKAN rolenya (misal dilempar ke login/management),
            // maka role ini dianggap TIDAK AKTIF.
            let isDeadSession = !res.ok || res.status === 404 || !res.url.includes(`/${activeProfile}/`);

            if (isDeadSession) {
                // Hapus role pertama (yang mati) dari storage lokal
                purgeDeadRole(activeProfile);

                // Tentukan role cadangan (jika yang mati teacher, cek student. Jika student, cek teacher)
                let altProfile = activeProfile === 'teacher' ? 'student' : 'teacher';

                // Cek setting lokal: Apakah role cadangan ini masih tercatat aktif sebelumnya?
                const localData = await new Promise(resolve => chrome.storage.local.get(['arabic101_visited_roles'], resolve));
                const activeRoles = localData.arabic101_visited_roles || [];

                if (activeRoles.includes(altProfile)) {
                    // Logika Fallback 2: Jika murid/guru cadangan masih ada di lokal, fetch data mereka
                    activeProfile = altProfile;
                    currentUrl = resolveTargetEndpoint(activeProfile, syncMode);
                    res = await fetch(currentUrl);

                    // Lakukan verifikasi ulang, apakah yang cadangan ini juga mati?
                    let isAltDead = !res.ok || res.status === 404 || !res.url.includes(`/${activeProfile}/`);

                    if (isAltDead) {
                        // Jika role cadangan JUGA mati, hapus dari lokal.
                        // Karena keduanya mati, fetch mengembalikan error dan interval stop parsing.
                        purgeDeadRole(activeProfile);
                        return { error: `Kedua sesi tidak aktif. Proses sinkronisasi dihentikan.` };
                    } else {
                        // Jika cadangan ternyata hidup, update 'target sinkronisasi' ke role ini
                        chrome.storage.local.set({ 'arabic101_sync_target': activeProfile });
                    }
                } else {
                    // Jika dari awal tidak ada profil cadangan, langsung error. (Interval otomatis skip proses).
                    return { error: `Sesi ${targetProfile} tidak aktif dan tidak ada profil alternatif.` };
                }
            }

            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let dataset = [];
            if (syncMode === 'regular') {
                const isRendered = doc.querySelectorAll('th, .fc-col-header-cell, [class*="header"], .cal-header').length > 0;
                if (isRendered) dataset = digestRegularTimetable(doc);
            } else {
                dataset = digestActualSchedule(doc, activeProfile);
            }

            return { success: true, data: dataset, finalProfile: activeProfile };
        } catch (e) {
            return { error: `HTTP network fetch failed. Client Diagnosis: ${e.message}` };
        }
    }

    // --- PENGIRIMAN PESAN KE BACKGROUND SERVICE WORKER ---
    function dispatchDelegatedAction(actionDirective, buttonInterface, isSilent = false, fetchedDataset = null) {
        if (!isContextValid()) {
            if (!isSilent) showToast('Extension has updated or refreshed. Please reload the page.', true);
            if (buttonInterface && buttonInterface.dataset.pristine) {
                buttonInterface.innerHTML = buttonInterface.dataset.pristine;
                buttonInterface.disabled = false;
                delete buttonInterface.dataset.pristine;
            }
            return;
        }

        if (!fetchedDataset) fetchedDataset = [];

        if (buttonInterface) {
            if (!buttonInterface.dataset.pristine) buttonInterface.dataset.pristine = buttonInterface.innerHTML;
            buttonInterface.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">${iconSync}</span> <span>Processing...</span>`;
            buttonInterface.disabled = true;
        }

        chrome.runtime.sendMessage({ action: actionDirective, eventsData: fetchedDataset }, function(reply) {
            if (!isContextValid()) return;

            if (buttonInterface && buttonInterface.dataset.pristine) {
                buttonInterface.innerHTML = buttonInterface.dataset.pristine;
                buttonInterface.disabled = false;
                delete buttonInterface.dataset.pristine;
            }

            if (chrome.runtime.lastError || !isContextValid()) {
                if (!isSilent) showToast('Internal Communication Error. Please refresh the page.', true);
                return;
            }
            if (reply && reply.success) {
                if (!isSilent) showToast(reply.message);
                const newTimestamp = Date.now();
                chrome.storage.local.set({ 'arabic101_lastsync': newTimestamp }, () => {
                    if (isContextValid()) updateLastSyncDisplay(newTimestamp);
                });
            } else {
                const errorMsg = reply ? reply.error : 'Unresponsive service.';
                if (errorMsg.includes('expired') || errorMsg.includes('reconnect') || !isSilent) {
                    showToast('System Error: ' + errorMsg, true);
                    if (errorMsg.includes('reconnect') || errorMsg.includes('expired')) updateAuthUI(false);
                }
            }
        });
    }

    // --- AUTO-SYNC BACKGROUND ENGINE ---
    async function checkAndRunAutoSync() {
        if (!isContextValid()) return;

        chrome.storage.local.get(['arabic101_autosync', 'arabic101_lastsync', 'arabic101_sync_target', 'arabic101_sync_mode'], function(data) {
            if (chrome.runtime.lastError || !isContextValid()) return;

            if (data.arabic101_autosync) {
                chrome.runtime.sendMessage({ action: 'checkAuth' }, async function(response) {
                    if (chrome.runtime.lastError || !isContextValid()) return;

                    if (response && response.connected) {
                        const now = Date.now();
                        const lastSync = data.arabic101_lastsync || 0;
                        const activeUrl = window.location.href;
                        const isActiveSchedulePage = activeUrl.includes('/timetable') || activeUrl.includes('date=') || activeUrl.includes('/today-sessions');
                        const cooldown = isActiveSchedulePage ? 300000 : 3600000;

                        if (now - lastSync > cooldown) {
                            const targetProfile = data.arabic101_sync_target || defaultRole;
                            const syncMode = data.arabic101_sync_mode || 'actual_7';

                            const fetchResult = await executeSmartFetch(targetProfile, syncMode);

                            if (fetchResult.data) {
                                dispatchDelegatedAction('syncGCal', null, true, fetchResult.data);
                            }
                        }
                    }
                });
            }
        });
    }

    // --- MANAJER ANTARMUKA PENGGUNA (UI) ---
    function updateLastSyncDisplay(timestamp) {
        const displaySpan = document.getElementById('last-sync-display');
        const popupLastSync = document.getElementById('gcal-popup-lastsync');

        if (!timestamp) {
            if (displaySpan) displaySpan.innerHTML = `Last sync: <strong>Unknown</strong>`;
            if (popupLastSync) popupLastSync.innerHTML = `Last sync: <strong>Unknown</strong>`;
            return;
        }
        const dateObj = new Date(timestamp);
        const now = new Date();
        const diffMins = Math.round((now - dateObj) / 60000);

        let timeText = diffMins === 0 ? 'Just now' : `${diffMins} mins ago`;
        if (diffMins > 60) {
            const diffHours = Math.round(diffMins / 60);
            timeText = diffHours >= 24 ? `${Math.round(diffHours/24)} days ago` : `${diffHours} hours ago`;
        }
        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        if (displaySpan) displaySpan.innerHTML = `Last sync: <strong>${timeText}</strong> <span style="opacity:0.6">(${timeStr})</span>`;
        if (popupLastSync) popupLastSync.innerHTML = `Last sync: <strong>${timeText}</strong> <span style="opacity:0.6">(${timeStr})</span>`;
    }

    function updateAuthUI(connected, googleEmail = '', targetProfile = '', cachedData = {}) {
        const displaySpan = document.getElementById('last-sync-display');
        const popupLastSync = document.getElementById('gcal-popup-lastsync');
        const updBtn = document.getElementById('cmd-upd-gcal');
        const delBtn = document.getElementById('cmd-del-gcal');
        const settingsBtn = document.getElementById('cmd-settings-toggle');
        const arrowIcon = document.getElementById('profile-dropdown-arrow');
        const targetRow = document.getElementById('sync-target-row');
        const settingsDivider = document.getElementById('settings-divider');
        const autoSyncLabel = document.getElementById('auto-sync-label');
        const resetContainer = document.getElementById('reset-settings-container');

        window.arabic101_is_connected = connected;

        const trigName = document.getElementById('gcal-trigger-name');
        if (!trigName) return;

        // Tombol Gear (Pengaturan) selalu tampil baik saat sudah login maupun belum login
        if (settingsBtn) settingsBtn.style.display = 'flex';

        if (connected) {
            const cachedProfile = cachedData[`arabic101_cached_profile_${targetProfile}`] || domProfile;
            const displayAvatar = cachedProfile.avatar || `https://ui-avatars.com/api/?name=User&background=2563eb&color=fff`;
            const displayName = cachedProfile.name || 'User';
            const displayRole = cachedProfile.role || (targetProfile ? targetProfile.charAt(0).toUpperCase() + targetProfile.slice(1) : 'User');
            const displayEmail = googleEmail || cachedProfile.email || 'Connected';

            document.getElementById('gcal-trigger-google-icon').style.display = 'none';
            const av = document.getElementById('gcal-trigger-avatar');
            av.style.display = 'block';
            av.src = displayAvatar;

            trigName.innerText = displayName;
            trigName.style.color = 'var(--bs-heading-color, inherit)';

            const roleBadge = document.getElementById('gcal-trigger-role');
            roleBadge.style.display = 'inline-block';
            roleBadge.innerText = displayRole;
            roleBadge.className = displayRole.toLowerCase() === 'teacher' ? 'badge bg-primary-subtle text-primary' : 'badge bg-success-subtle text-success';

            document.getElementById('gcal-trigger-email').innerText = displayEmail;
            document.getElementById('gcal-trigger-email').style.color = '#198754';

            if (displaySpan) displaySpan.style.display = 'block';
            if (popupLastSync) popupLastSync.style.display = 'block';
            if (updBtn) updBtn.style.display = 'flex';
            if (delBtn) delBtn.style.display = 'flex';
            if (arrowIcon) arrowIcon.style.display = 'flex';

            // Tampilkan pengaturan akun Google saat sudah login
            if (targetRow) {
                const roles = cachedData.arabic101_visited_roles || [defaultRole];
                targetRow.style.display = (roles.includes('teacher') && roles.includes('student')) ? 'flex' : 'none';
            }
            if (settingsDivider) settingsDivider.style.display = 'block';
            if (autoSyncLabel) autoSyncLabel.style.display = 'flex';
            if (resetContainer) resetContainer.style.display = 'block'; // Munculkan saat login
        } else {
            document.getElementById('gcal-trigger-google-icon').style.display = 'flex';
            document.getElementById('gcal-trigger-avatar').style.display = 'none';

            trigName.innerText = 'Google Calendar';
            trigName.style.color = 'var(--bs-heading-color, inherit)';

            const roleBadge = document.getElementById('gcal-trigger-role');
            roleBadge.style.display = 'none';

            document.getElementById('gcal-trigger-email').innerHTML = '<b>Sign in</b> to sync to Google Calendar';
            document.getElementById('gcal-trigger-email').style.color = 'inherit';

            if (displaySpan) displaySpan.style.display = 'none';
            if (popupLastSync) popupLastSync.style.display = 'none';
            if (updBtn) updBtn.style.display = 'none';
            if (delBtn) delBtn.style.display = 'none';
            if (arrowIcon) arrowIcon.style.display = 'none';

            // Sembunyikan fitur Target Profile, Divider, dan Auto-Sync Background jika belum login
            if (targetRow) targetRow.style.display = 'none';
            if (settingsDivider) settingsDivider.style.display = 'none';
            if (autoSyncLabel) autoSyncLabel.style.display = 'none';
            if (resetContainer) resetContainer.style.display = 'block'; // Sembunyikan saat belum login
        }
    }

    // =====================================================================
    // FITUR FALLBACK ROLE & PENGHILANG DROPDOWN TARGET (JANGAN DIHAPUS!)
    // Fungsi ini mengecek akses /teacher/ dan /student/ secara real-time.
    // Jika salah satu mati (fetch fail/redirect ke login):
    // 1. Role yang mati dihapus dari cache.
    // 2. Target profil otomatis di-switch ke role yang masih hidup.
    // 3. Dropdown 'Target Profile' disembunyikan.
    // Menu hanya muncul JIKA DAN HANYA JIKA kedua role aktif bersamaan.
    // =====================================================================
    async function validateActiveRoles() {
        if (!isContextValid()) return;

        chrome.storage.local.get(['arabic101_visited_roles', 'arabic101_sync_target'], async function(data) {
            let currentTarget = data.arabic101_sync_target || defaultRole;
            let updatedRoles = [];

            // 1. Validasi akses Teacher
            try {
                let resT = await fetch('/teacher/home');
                // Pastikan HTTP 200 dan tidak di-redirect paksa ke halaman login
                if (resT.ok && !resT.redirected && !resT.url.includes('/login')) {
                    updatedRoles.push('teacher');
                }
            } catch(e) {}

            // 2. Validasi akses Student
            try {
                let resS = await fetch('/student/home');
                if (resS.ok && !resS.redirected && !resS.url.includes('/login')) {
                    updatedRoles.push('student');
                }
            } catch(e) {}

            // 3. Fallback: Jika target profile saat ini mati, paksa pindah ke role yang masih hidup
            if (!updatedRoles.includes(currentTarget) && updatedRoles.length > 0) {
                currentTarget = updatedRoles[0];
                chrome.storage.local.set({ 'arabic101_sync_target': currentTarget });
            }

            // 4. Update cache dan UI
            chrome.storage.local.set({ 'arabic101_visited_roles': updatedRoles }, () => {
                const targetRow = document.getElementById('sync-target-row');
                if (targetRow) {
                    // PENTING: Target Profile HANYA TAMPIL jika ADA KEDUANYA
                    targetRow.style.display = (updatedRoles.includes('teacher') && updatedRoles.includes('student')) ? 'flex' : 'none';
                }
                const profileSelect = document.getElementById('cmd-sync-profile');
                if (profileSelect) profileSelect.value = currentTarget;
            });
        });
    }

    function refreshUIState() {
        if (!isContextValid()) return;

        chrome.storage.local.get([
            'arabic101_sync_target',
            'arabic101_visited_roles',
            'arabic101_autosync',
            'arabic101_sync_mode',
            'arabic101_lastsync',
            'arabic101_cached_profile_teacher',
            'arabic101_cached_profile_student'
        ], function(data) {
            if (chrome.runtime.lastError || !isContextValid()) return;

            const targetProfile = data.arabic101_sync_target || defaultRole;

            chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
                if (chrome.runtime.lastError || !isContextValid()) return;
                updateAuthUI(response && response.connected, response?.email || '', targetProfile, data);
            });

            const profileSelect = document.getElementById('cmd-sync-profile');
            if (profileSelect) profileSelect.value = targetProfile;

            const modeSelect = document.getElementById('cmd-sync-mode');
            if (modeSelect) modeSelect.value = data.arabic101_sync_mode || 'actual_7';

            const checkbox = document.getElementById('cmd-auto-sync');
            if (checkbox) checkbox.checked = !!data.arabic101_autosync;

            updateLastSyncDisplay(data.arabic101_lastsync);
        });
    }

    function instantiateDashboardControlPanel() {
        const modularStyles = document.createElement('style');
        modularStyles.innerHTML = `
            @keyframes spin { 100% { transform: rotate(360deg); } }
            .arabic101-sync-wrapper { width: 100%; padding: 15px 0; margin-top: 10px; }
            .arabic101-sync-module { border-radius: 6px; padding: 12px 20px; width: 100%; font-family: 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 20px; position: relative;}
            [data-bs-theme="dark"] .arabic101-sync-module { background: #212529; border: 1px solid #373b3e; color: #dee2e6; }
            [data-bs-theme="light"] .arabic101-sync-module { background: #f8f9fa; border: 1px solid #dee2e6; color: #212529; }

            .arabic101-profile-trigger {
                display: flex; align-items: center; gap: 12px; padding: 8px 14px;
                border-radius: 8px; cursor: pointer; transition: all 0.2s;
                background-color: var(--bs-body-bg, #ffffff);
                border: 1px solid var(--bs-border-color, #dee2e6);
                box-shadow: 0 2px 6px rgba(0,0,0,0.08); flex-shrink: 0; min-width: 250px;
                position: relative;
            }
            .arabic101-profile-trigger:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.12); border-color: #ced4da; }

            [data-bs-theme="dark"] .arabic101-profile-trigger {
                background-color: #212529; border: 1px solid #4a5056; box-shadow: 0 2px 6px rgba(0,0,0,0.25); color: #fff;
            }
            [data-bs-theme="dark"] .arabic101-profile-trigger:hover {
                background-color: #2b3035; border-color: #5d646b;
            }

            .arabic101-trigger-avatar {
                display: flex; align-items: center; justify-content: center;
                width: 38px; height: 38px; background: #fff; border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0; padding: 0; overflow: hidden;
            }
            .arabic101-trigger-text { display: flex; flex-direction: column; justify-content: center; line-height: 1.2; text-align: left;}
            .arabic101-last-sync { font-size: 11px; opacity: 0.8;}
            .arabic101-trigger-arrow { opacity: 0.5; margin-left: auto; display: flex; align-items: center;}

            .arabic101-command-group { display: flex; flex-direction: row; gap: 8px; width: 100%; justify-content: flex-end; align-items: center; }
            .arabic101-command { border: 1px solid transparent; padding: 7px 14px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; color: white; transition: opacity 0.15s, background-color 0.15s; font-family: inherit; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 6px; }
            .arabic101-command:hover { opacity: 0.85; } .arabic101-command:disabled { filter: grayscale(1); cursor: not-allowed; opacity: 0.5; }

            .cmd-ics-export { background-color: #495057; }
            .cmd-ics-export:hover { background-color: #343a40; }
            .cmd-gcal-insert { background-color: #198754; }

            .arabic101-icon-btn { background: transparent; border: none; border-radius: 50%; width: 34px; height: 34px; padding: 0; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; color: inherit; margin-left: 4px; }
            .arabic101-icon-btn:hover { background: rgba(128,128,128,0.1); }

            .arabic101-dropdown-popup { position: absolute; ${popupVerticalPosition} width: max-content; min-width: 250px; background: #f8fafd; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); display: none; flex-direction: column; z-index: 1000; overflow: hidden; border: 1px solid #e0e4ea; cursor: default; padding: 8px 0;}
            [data-bs-theme="dark"] .arabic101-dropdown-popup { background: #282a2c; border-color: #444749; color: #e3e3e3; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
            .arabic101-dropdown-popup.show { display: flex; }
            .left-aligned { left: 0; right: auto; }
            .right-aligned { right: 0; left: auto; }

            .g-popup-settings { padding: 8px 20px; background: transparent; display: flex; flex-direction: column; gap: 12px;}
            .arabic101-setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
            .arabic101-setting-row select { background: transparent; color: inherit; border: 1px solid #6c757d; border-radius: 6px; padding: 6px; cursor: pointer; outline: none; flex-grow: 1; max-width: 140px; font-size: 12px; margin-left: 10px;}
            .arabic101-setting-row select option { background: #2b3035; color: #fff; }
            [data-bs-theme="light"] .arabic101-setting-row select option { background: #fff; color: #000; }

            .g-popup-btn { background: transparent; border: none; width: 100%; text-align: left; padding: 10px 20px; font-size: 13px; cursor: pointer; color: #3c4043; display: flex; align-items: center; gap: 12px;}
            .g-popup-btn:hover { background: #f1f3f4; }
            [data-bs-theme="dark"] .g-popup-btn { color: #e3e3e3; }
            [data-bs-theme="dark"] .g-popup-btn:hover { background: #3c4043; }
            .g-popup-divider { height: 1px; background: #e0e4ea; margin: 4px 0;}
            [data-bs-theme="dark"] .g-popup-divider { background: #444749; }

            @media (max-width: 768px) { .arabic101-sync-module { flex-direction: column; align-items: flex-start; gap: 15px; } .arabic101-command-group { flex-wrap: wrap; justify-content: flex-start; } .arabic101-dropdown-popup.right-aligned { right: auto; left: 0; } }
        `;
        document.head.appendChild(modularStyles);

        const wrapperNode = document.createElement('div');
        wrapperNode.id = 'arabic101-sync-wrapper';
        wrapperNode.className = 'arabic101-sync-wrapper';

        wrapperNode.innerHTML = `
            <div class="arabic101-sync-module">
                <div id="cmd-profile-trigger" class="arabic101-profile-trigger">
                    <div class="arabic101-trigger-avatar">
                        <img id="gcal-trigger-avatar" src="" alt="User" style="display:none; width:100%; height:100%; object-fit:cover;" />
                        <div id="gcal-trigger-google-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:#fff;">${iconGoogleG}</div>
                    </div>
                    <div class="arabic101-trigger-text">
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                            <span id="gcal-trigger-name" style="font-weight:600; font-size:13px; color:var(--bs-heading-color, inherit);">Google Calendar</span>
                            <span id="gcal-trigger-role" class="badge" style="display:none; font-size:10px; padding:2px 6px; border-radius:4px;"></span>
                        </div>
                        <div id="gcal-trigger-email" style="font-size:12px; opacity:0.9;"><b>Sign in</b> to sync to Google Calendar</div>
                        <div id="last-sync-display" class="arabic101-last-sync" style="display:none; margin-top:2px;">Last sync: <strong>Unknown</strong></div>
                    </div>
                    <div class="arabic101-trigger-arrow" id="profile-dropdown-arrow" style="display:none;">${iconHamburger}</div>

                    <div id="arabic101-profile-menu" class="arabic101-dropdown-popup left-aligned">
                        <button class="g-popup-btn" id="cmd-open-gcal">${iconExternal} <span>Open Google Calendar</span></button>
                        <div class="g-popup-divider"></div>
                        <button class="g-popup-btn" id="cmd-gcal-logout">${iconLogout} <span>Sign out Google</span></button>
                    </div>
                </div>

                <div class="arabic101-command-group">
                    <button id="cmd-export-ics" class="arabic101-command cmd-ics-export">${iconDownload} <span>Export ICS</span></button>
                    <button id="cmd-upd-gcal" class="arabic101-command cmd-gcal-insert" style="display:none;">${iconSync} <span>Sync Schedule</span></button>
                    <button id="cmd-del-gcal" class="arabic101-command" style="display:none; background-color: #dc3545;">${iconTrash} <span>Remove from GCal</span></button>

                    <div style="position:relative; display:flex; align-items:center;">
                        <!-- Tombol Gear selalu ditampilkan agar pengguna dapat memilih Calendar Mode saat offline -->
                        <button id="cmd-settings-toggle" class="arabic101-icon-btn" title="Settings">
                            ${iconGear}
                        </button>
                        <div id="arabic101-settings-menu" class="arabic101-dropdown-popup right-aligned">
                            <div class="g-popup-settings">
                                <div class="arabic101-setting-row" id="sync-target-row" style="display:none;">
                                    <span style="font-weight:600;">Target Profile:</span>
                                    <select id="cmd-sync-profile">
                                        <option value="teacher">Teacher</option>
                                        <option value="student">Student</option>
                                    </select>
                                </div>
                                <div class="arabic101-setting-row" id="sync-mode-row">
                                    <span style="font-weight:600;">Calendar Mode:</span>
                                    <select id="cmd-sync-mode">
                                        <option value="actual_7">Actual (7 Days)</option>
                                        <option value="actual_30">Actual (30 Days)</option>
                                        <option value="regular">Regular (Timetable)</option>
                                    </select>
                                </div>
                                <div class="g-popup-divider" id="settings-divider" style="display:none; margin: 4px -20px;"></div>
                                <label id="auto-sync-label" style="display:none; align-items:center; gap:8px; cursor:pointer; font-size: 13px; margin: 2px 0;">
                                    <input type="checkbox" id="cmd-auto-sync"> <span style="font-weight:600;">Auto-Sync Background</span>
                                </label>
                                <!-- TAMBAHKAN KODE DI BAWAH INI -->
                                <div id="reset-settings-container" style="display:none; margin-top: 10px;">
                                    <button id="cmd-reset-settings" style="background: transparent; color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; padding: 6px; font-size: 11px; font-weight: 600; cursor: pointer; width: 100%; display: flex; justify-content: center; align-items: center; gap: 6px; transition: background 0.2s;">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                        Reset Defaults
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const targetContainer = document.querySelector('.card');
        if (targetContainer && targetContainer.parentNode) {
            targetContainer.parentNode.insertBefore(wrapperNode, targetContainer.nextSibling);
        } else {
            document.body.appendChild(wrapperNode);
        }

        const profileTrigger = document.getElementById('cmd-profile-trigger');
        const profileMenu = document.getElementById('arabic101-profile-menu');
        const settingsToggle = document.getElementById('cmd-settings-toggle');
        const settingsMenu = document.getElementById('arabic101-settings-menu');

        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.arabic101_is_connected) {
                settingsMenu.classList.remove('show');
                profileMenu.classList.toggle('show');
            } else {
                initiateGoogleLogin();
            }
        });

        settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.remove('show');
            settingsMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && !profileTrigger.contains(e.target)) profileMenu.classList.remove('show');
            if (!settingsMenu.contains(e.target) && e.target !== settingsToggle) settingsMenu.classList.remove('show');
        });

        refreshUIState();

        document.getElementById('cmd-sync-profile').addEventListener('change', function(e) {
            if (!isContextValid()) return;
            chrome.storage.local.set({ 'arabic101_sync_target': e.target.value }, () => refreshUIState());
        });

        document.getElementById('cmd-sync-mode').addEventListener('change', function(e) {
            if (!isContextValid()) return;
            chrome.storage.local.set({ 'arabic101_sync_mode': e.target.value });
        });

        document.getElementById('cmd-auto-sync').addEventListener('change', function(e) {
            if (!isContextValid()) return;
            chrome.storage.local.set({ 'arabic101_autosync': e.target.checked });
            if (e.target.checked) {
                showToast("Auto-sync enabled. Data will sync seamlessly in background.");
                checkAndRunAutoSync();
            } else {
                showToast("Auto-sync disabled.");
            }
        });

        // KOMENTAR PENTING: Fungsi untuk mengembalikan pengaturan ke Default.
        // 1. Target Profile dikembalikan ke defaultRole (sesuai role halaman saat ini)
        // 2. Calendar Mode dikembalikan ke mode 7 Hari ('actual_7')
        // 3. Auto-Sync dimatikan (false)
        document.getElementById('cmd-reset-settings').addEventListener('click', function(e) {
            e.stopPropagation();
            if (!isContextValid()) return;

            if (confirm("Reset extension settings to default values?")) {
                chrome.storage.local.set({
                    'arabic101_sync_target': defaultRole,
                    'arabic101_sync_mode': 'actual_7',
                    'arabic101_autosync': false
                }, () => {
                    refreshUIState(); // Memanggil ulang UI agar input form (dropdown & checkbox) ikut ter-reset visualnya
                    showToast("Settings reset to default.");
                });
            }
        });

        // CSS tambahan untuk efek hover tombol reset
        const resetHoverStyle = document.createElement('style');
        resetHoverStyle.innerHTML = `#cmd-reset-settings:hover { background-color: #dc3545 !important; color: white !important; }`;
        document.head.appendChild(resetHoverStyle);

        function initiateGoogleLogin() {
            if (!isContextValid()) {
                showToast('Extension context invalidated. Please refresh the page.', true);
                return;
            }

            const trigName = document.getElementById('gcal-trigger-name');
            const originalText = trigName.innerText;
            trigName.innerHTML = `Connecting...`;

            chrome.runtime.sendMessage({ action: 'loginGoogle' }, (response) => {
                if (!isContextValid()) return;

                if (response && response.connected) {
                    refreshUIState();
                    showToast("Connected to Google Calendar!");
                } else {
                    trigName.innerText = originalText;
                    showToast("Authentication aborted by server.", true);
                }
            });
        }

        document.getElementById('cmd-gcal-logout').addEventListener('click', function(e) {
            e.stopPropagation();
            if (!isContextValid()) return;

            chrome.runtime.sendMessage({ action: 'logoutGoogle' }, () => {
                if (!isContextValid()) return;
                updateAuthUI(false);
                profileMenu.classList.remove('show');
                showToast("Google session successfully revoked.");
            });
        });

        document.getElementById('cmd-open-gcal').addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('https://calendar.google.com/calendar/u/0/r', '_blank');
            profileMenu.classList.remove('show');
        });

        // Penanganan klik tombol Export ICS (Mode Offline)
        document.getElementById('cmd-export-ics').addEventListener('click', async function(e) {
            e.stopPropagation();
            const btn = this;
            if (!btn.dataset.pristine) btn.dataset.pristine = btn.innerHTML;
            btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">${iconSync}</span> <span>Exporting...</span>`;
            btn.disabled = true;

            chrome.storage.local.get(['arabic101_sync_target', 'arabic101_sync_mode'], async function(data) {
                const targetProfile = data.arabic101_sync_target || defaultRole;
                const syncMode = data.arabic101_sync_mode || (isTimetableRoute ? 'regular' : 'actual_7');

                let dataset = [];

                try {
                    const fetchResult = await executeSmartFetch(targetProfile, syncMode);
                    if (fetchResult && fetchResult.data && fetchResult.data.length > 0) {
                        dataset = fetchResult.data;
                    }
                } catch (err) {}

                // Fallback parsing lokal langsung dari DOM jika offline
                if (dataset.length === 0) {
                    if (isTimetableRoute) {
                        dataset = digestRegularTimetable(document);
                    } else {
                        dataset = digestActualSchedule(document, targetProfile);
                    }
                }

                btn.innerHTML = btn.dataset.pristine;
                btn.disabled = false;
                delete btn.dataset.pristine;

                if (dataset.length === 0) {
                    showToast('No schedule items found to export.', true);
                    return;
                }

                generateICSFromDataset(dataset);
            });
        });

        document.getElementById('cmd-upd-gcal').addEventListener('click', async function(e) {
            e.stopPropagation();
            if (!isContextValid()) {
                showToast('Extension context invalidated. Please refresh the page.', true);
                return;
            }

            const btn = this;
            chrome.storage.local.get(['arabic101_sync_target', 'arabic101_sync_mode'], async function(data) {
                if (chrome.runtime.lastError || !isContextValid()) return;

                const targetProfile = data.arabic101_sync_target || defaultRole;
                const syncMode = data.arabic101_sync_mode || 'actual_7';

                if (!btn.dataset.pristine) btn.dataset.pristine = btn.innerHTML;
                btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">${iconSync}</span> <span>Fetching...</span>`;
                btn.disabled = true;

                const fetchResult = await executeSmartFetch(targetProfile, syncMode);

                if (fetchResult.error) {
                    btn.innerHTML = btn.dataset.pristine;
                    btn.disabled = false;
                    delete btn.dataset.pristine;
                    showToast(fetchResult.error, true);
                    return;
                }

                if (fetchResult.data.length === 0) showToast(`Data not found for the selected mode.`, false);
                dispatchDelegatedAction('syncGCal', btn, false, fetchResult.data);
            });
        });

        document.getElementById('cmd-del-gcal').addEventListener('click', function(e) {
            e.stopPropagation();
            if (!isContextValid()) return;

            if (confirm("System Warning: Active schedule from 'Arabic101 Academy Schedule' will be permanently removed from your Google Calendar. Your past logs will remain preserved. Proceed?")) {
                chrome.storage.local.set({ 'arabic101_autosync': false }, () => {
                    const checkbox = document.getElementById('cmd-auto-sync');
                    if (checkbox) checkbox.checked = false;
                    dispatchDelegatedAction('purgeGCal', this);
                });
            }
        });

        setInterval(() => {
            checkAndRunAutoSync();
            if (isContextValid()) {
                chrome.storage.local.get(['arabic101_lastsync'], function(data) {
                    if (!chrome.runtime.lastError && isContextValid()) {
                        updateLastSyncDisplay(data.arabic101_lastsync);
                    }
                });
            }
        }, 60000);
        setTimeout(checkAndRunAutoSync, 3000);
    }

    function initExtension() {
        if (currentUrl.includes('/timetable') || currentUrl.includes('/today-sessions') || currentUrl.includes('/teacher/home') || currentUrl.includes('/student/home')) {
            instantiateDashboardControlPanel();
        } else {
            setTimeout(checkAndRunAutoSync, 3000);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initExtension);
    else initExtension();
})();