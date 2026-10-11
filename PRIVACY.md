# Privacy Policy for Arabic101 Assistant

**Effective Date:** October 2026

The **Arabic101 Assistant** extension ("we", "our", or "the extension") is dedicated to enhancing the user experience on the Arabic101 dashboard by providing real-time chat notifications and Google Calendar schedule synchronization. We are deeply committed to protecting your privacy.

This Privacy Policy explains what data we collect, how it is used, and how it is protected.

## 1. Information We Collect and How We Use It
The extension operates entirely locally within your browser. It does not transmit your personal data to any of our own servers or third-party databases. 

**A. Arabic101 Extension (Chat & Schedule)**
* **Chat Data:** To provide real-time notifications, the extension reads chat messages and sender avatars directly from the Arabic101 API endpoints (e.g., `/chat/loadMessages`) using your active browser session. This data is only used to trigger local desktop notifications and render the chat widget. It is never stored permanently outside your local browser cache.
* **Schedule Data:** The extension reads your class schedule (Student/Teacher names, Class times, and Course names) directly from the dashboard's HTML DOM structure when you actively choose to export or sync your schedule.

**B. Google Account Information**
If you choose to use the "Sync GCal" feature, the extension will request you to connect your Google Account via Google's secure OAuth 2.0 authorization.
* **Email Address (`userinfo.email`):** We fetch your Google email address solely to display which account is currently connected within the extension's interface.
* **Calendar Access (`calendar`):** The extension uses this permission strictly to create, update, and delete a dedicated sub-calendar named "Arabic101 Academy Schedule" within your Google Calendar. It does not read, modify, or delete any of your personal calendar events outside of this specific sub-calendar.

## 2. Data Storage & Security
* **Local Storage:** User preferences (such as chat theme, last read message timestamps, and active chat session IDs) are stored locally on your device using Chrome's secure storage API.
* **No External Servers:** We do not own or operate any external databases. Your data flows directly between your browser, the Arabic101 platform, and Google's official APIs.

## 3. Data Sharing
We **do not** sell, transfer, or trade your Personally Identifiable Information (PII) to outside parties. Your data is strictly used for the core functionality of the extension.

## 4. Google API Services User Data Policy Compliance
Arabic101 Assistant's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

Specifically:
* We only use the requested Google Calendar access to manage the specific "Arabic101 Academy Schedule" sub-calendar.
* We do not use your Google data for targeted advertising, data brokering, or any other unrelated purposes.

## 5. Your Rights & Revoking Access
You can revoke the extension's access to your Google Calendar at any time by clicking the "Disconnect" or "Switch Account" button in the extension interface, or by managing your third-party access settings directly in your Google Account Security dashboard.

## 6. Contact Us
If you have any questions regarding this Privacy Policy, you may contact us at: adminb@arabic101.org
