# Arabic101 Assistant

![Version](https://img.shields.io/badge/version-1.1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome-green.svg)

The **Arabic101 Assistant** is a powerful, lightweight Google Chrome extension designed to enhance the experience for teachers and students on the Arabic101 Dashboard. It seamlessly bridges your dashboard schedule with Google Calendar, provides a full popup & standalone desktop dashboard, and includes a highly optimized, cross-tab realtime chat interface.

[**Download from Chrome Web Store**](https://chromewebstore.google.com/detail/arabic101-assistant/gcjclacdblhiddeanmdnhliflgplbmcc) | [**Visit Official Documentation**](https://a101-ext.github.io/Arabic101-Extension/index.html)

---

## 🌟 Key Features

### 🖥️ Dual Companion Dashboard (Popup & Standalone Window)
*   **Compact Popup & Resizable Standalone Window:** Open a quick mobile-style popup from the toolbar or pop out into a full-page Standalone Desktop Window with a sticky header bar, full sidebar navigation, Light/Dark theme support, and floating chat widget.
*   **Persistent Route State:** Automatically remembers your last visited tab across reloads and popups, with a one-click logo refresh back to Home.

### 📅 Advanced Google Calendar Synchronization
*   **Dual-Calendar Architecture:** Automatically creates a primary `Arabic101 Academy Schedule` calendar for active classes and an `Arabic101 Academy Schedule - Logs` calendar to safely archive your past sessions.
*   **Smart Fallback Routing:** Instantly detects if a Teacher or Student profile is inactive and seamlessly switches to the active role without throwing errors.
*   **Background Auto-Sync:** Keeps your Google Calendar perfectly updated in the background (every 5 minutes on timetable pages, and every hour on other dashboard pages).
*   **Universal Offline Export:** Download your schedule as a universal `.ics` file with a single click, allowing you to import your classes into Apple Calendar, Microsoft Outlook, or Google Calendar manually—no account linking required!
*   **Clean Status Tags:** Adds clear prefixes to event titles like `[Ongoing]`, `[Attended]`, `[Canceled]`, and `[Absent]` to help you track your schedule at a glance.

### 📋 Inline Class Details, Plan Comparison & Teacher Tools
*   **Inline Class Reports & Attachments:** Expand lesson remarks, summaries, homework, notes, and image/PDF attachments directly inside class cards on Home and lesson history accordions without opening extra tabs.
*   **Interactive My Plan & Perks Matrix:** View class formats (**1-on-1** vs. **Group**) and click any Academy plan card (**Premium**, **Pro**, **Standard**, **Halaqah**) for a 50:50 side-by-side comparison.
*   **Teacher End Class & Availability:** Submit end-of-class reports with image or PDF attachments (with automatic draft recovery), view unclosed yesterday sessions, and manage weekly teaching availability slots.

### 💬 Optimized Realtime Chat Widget & Proactive Alerts
*   **Multi-Tab Leader Election:** Uses a highly efficient tab-election algorithm. Only one active tab connects to the server, while other tabs mirror the chat silently—saving significant network bandwidth and CPU usage.
*   **Smart Notifications:** Features built-in browser audio alerts and OS-level desktop notifications for upcoming class reminders, classroom waiting alerts, schedule adjustments, and new chat messages when the browser is minimized.

---

## ⚙️ Understanding Calendar Modes

The extension allows you to sync your schedule in two fundamentally different ways based on your needs:

*   **Actual Mode (7 Days or 30 Days):** 
    This mode synchronizes exact, date-specific class sessions. It reads the actual history and future projections of your classes day-by-day. 
    *   *Best for:* Tracking real-time status changes (e.g., if a specific class is marked as `[Canceled]`, `[Absent]`, or `[Attended]` on a particular date) and maintaining an accurate historical log. 
*   **Regular (Timetable) Mode:** 
    This mode synchronizes your permanent, general weekly schedule template. It reads your base weekly layout and creates infinite **recurring weekly events** in your calendar. 
    *   *Best for:* Getting a broad, unchanging overview of your general availability and permanent weekly commitments.

---

## 🚀 Installation & Setup

1. Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/arabic101-assistant/gcjclacdblhiddeanmdnhliflgplbmcc).
2. Log in to your [Arabic101](https://academy.arabic101.org/) Dashboard.
3. Click the **Arabic101 Assistant** icon in your Chrome toolbar (or click the Pop-out button for a standalone desktop window).
4. **Choose your Sync Method:**
   * **Automatic (Google Calendar):** Click **Sign in with Google** and sign in. Ensure you manually check the box to grant calendar access during the authorization step. Select your preferred Calendar Mode in **Settings**, then click **Sync Now** or enable **Auto-Sync in Background**.
   * **Manual (Export ICS):** Simply select your Calendar Mode and click **Export ICS**. The system will download your schedule as a file that you can manually import into any calendar app.

## 🔒 Privacy & Security
The Arabic101 Assistant requires minimal permissions. It only reads the schedule, class report, and chat data explicitly displayed on your Arabic101 dashboard to facilitate the calendar sync, dashboard companion, and chat features. Please refer to our official [Privacy Policy](https://a101-ext.github.io/Arabic101-Extension/privacy.html) for detailed information.
