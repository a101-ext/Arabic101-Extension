# Arabic101 Assistant

![Version](https://img.shields.io/badge/version-1.0.7.1-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)
![Platform](https://img.shields.io/badge/platform-Chrome-green.svg)

The **Arabic101 Assistant** is an all-in-one Google Chrome extension designed to streamline the experience for teachers and students on the Arabic101 Dashboard. It brings your classes, weekly timetable, notifications archive, realtime chat, proactive desktop reminders, and Google Calendar synchronization directly into your browser toolbar or a resizable standalone window.

[**Download from Chrome Web Store**](https://chromewebstore.google.com/detail/arabic101-assistant/gcjclacdblhiddeanmdnhliflgplbmcc) | [**Visit Official Documentation**](https://a101-ext.github.io/Arabic101-Extension/index.html)

---

## 🌟 Key Features

### 🖥️ All-in-One Popup & Resizable Standalone Companion
* **Unified Dashboard View:** Access Today's & Yesterday's sessions, join classrooms with one click, inspect your Weekly Timetable Matrix (with teacher availability highlights), and browse your Notifications Archive with pagination and clickable invoice links.
* **Role-Aware Views:** Automatically adapts to **Teacher** (My Students, Lesson History, Availability Management, Support & HR Desk) and **Student** (My Plan, Enrolled Courses, Billing, Family Discount, E-Syllabus) accounts.
* **Responsive & Theme-Adaptive:** Switch seamlessly between compact popup mode, a resizable standalone desktop window, and **Light / Dark** themes.

### 🔔 Proactive Class & Chat Alerts
* **Smart Class Reminders:** Receive native desktop alerts **1 hour** or **2 hours** before scheduled classes, urgent notifications when a counterpart is waiting in the classroom (with direct *Enter Class* action), and cancellation notices.
* **Background Monitoring:** Powered by Manifest V3 `alarms` and a lightweight `offscreen` parser so alerts arrive even when the dashboard tab is closed.

### 📅 Advanced Google Calendar Synchronization & ICS Export
* **Dual-Calendar Architecture:** Automatically creates a primary `Arabic101 Academy Schedule` calendar for active classes and an `Arabic101 Academy Schedule - Logs` calendar to safely archive past sessions.
* **Background Auto-Sync:** Keeps your Google Calendar updated silently in the background when enabled.
* **Universal Offline Export:** Download your schedule as a universal `.ics` file with a single click for Apple Calendar, Microsoft Outlook, or manual import—no Google account linking required.
* **Clean Status Tags:** Adds clear prefixes to event titles like `[Ongoing]`, `[Attended]`, `[Canceled]`, and `[Absent]`.

### 💬 Bandwidth-Saving Realtime Chat
* **Integrated & Floating Messenger:** Chat directly inside the popup tab or via the floating chat dock on wide desktop screens.
* **Multi-Tab Leader Election:** Only ONE active context polls the chat server at a time, preventing duplicate requests, duplicate audio chimes, and unnecessary bandwidth usage.

---

## ⚙️ Understanding Calendar Modes

* **Actual Mode (7 Days or 30 Days):**
  Synchronizes exact, date-specific class sessions day-by-day, accurately reflecting real-time status updates (`[Canceled]`, `[Absent]`, `[Attended]`, `[Ongoing]`).
* **Regular (Timetable) Mode:**
  Synchronizes your permanent weekly schedule template as infinite **recurring weekly events** in Google Calendar.

---

## 🚀 Installation & Setup

1. Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/arabic101-assistant/gcjclacdblhiddeanmdnhliflgplbmcc).
2. Log in to your [Arabic101](https://academy.arabic101.org/) Dashboard.
3. Click the **Arabic101 Assistant** icon in your Chrome toolbar to open the popup (or click the pop-out button for a standalone window).
4. **Choose your Calendar Sync Method:**
   * **Automatic (Google Calendar):** Click the Google Calendar profile box in the header and choose **Sign in with Google**. Ensure you manually check the box granting calendar access during the Google consent step, then select your Calendar Mode and click **Sync Now** or enable **Auto-Sync in Background**.
   * **Manual (Export ICS):** Open **Settings**, select your Calendar Mode, and click **Export ICS** to download your `.ics` calendar file.

## 🔒 Privacy & Security
Arabic101 Assistant follows strict Manifest V3 minimum-permission principles (`identity`, `storage`, `alarms`, `offscreen`, `notifications`) without requesting the `cookies` permission. No personal data is ever collected or sent to external third-party servers. See our [Privacy Policy](https://a101-ext.github.io/Arabic101-Extension/privacy.html) for full details.
