# Privacy Policy for AI YouTube Summarizer

**Last Updated:** July 31, 2025

## 1. Introduction

Welcome to AI YouTube Summarizer ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our AI YouTube Summarizer Chrome extension (the "Extension").

By using the Extension, you agree to the collection and use of information in accordance with this policy.

## 2. Information We Collect

To provide our service, we need to process certain data. We are committed to data minimization and only collect what is necessary for the Extension to function.

#### Data We Collect:

- **User-Provided API Keys:** The Extension requires you to provide your own API key for the AI service you choose (e.g., OpenAI, Google Gemini, Anthropic). This key is stored locally on your device and is used solely to authenticate with the AI service on your behalf.
- **YouTube Video Content:**
  - **Video Transcript:** We access the transcript of the YouTube video you are currently viewing.
  - **Video Metadata:** We collect the title, channel name, and duration of the video.
    This information is collected only when you activate the summarization feature and is sent to the AI service to generate the summary.
- **User Configuration:** We store your selected AI platform, model preferences, and any custom prompts you configure on your device only,

#### Data We DO NOT Collect:

We are committed to your privacy and **do not** collect, store, or transmit any of the following:

- Personal Identifiable Information (PII) such as your name, email address, or location.
- Your YouTube account information or credentials.
- Your general browsing history or any activity outside of the summarization request on a YouTube video page.
- Video viewing habits or history.

## 3. How We Use Your Information

We use the information we collect for the following purposes:

- **To Provide Core Functionality:** The primary use of the collected data (transcript, metadata, API key) is to send a request to the selected third-party AI service to generate a video summary.
- **To Store Your Settings:** Your API key and preferences are stored locally on your device so you don't have to re-enter them every time you use the Extension.

## 4. Data Sharing and Third Parties

We do not sell, trade, or rent your personal information to others. Data is only shared with third parties in the following limited circumstances:

#### AI Service Providers:

- To generate a summary, the video transcript and metadata are sent to the AI service you have configured (e.g., OpenAI, Google Gemini, Anthropic).
- Your API key is transmitted directly to the AI service for authentication.
- We encourage you to review the privacy policies of the respective AI service providers:
  - **Google Gemini:** [Google Privacy Policy](https://policies.google.com/privacy)
  - **OpenAI:** [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy)
  - **Anthropic (Claude):** [Anthropic Privacy Policy](https://www.anthropic.com/privacy)

#### No Data Sale Policy:

We have a strict policy against selling user data. We do not share your information with any third parties for marketing, advertising, or any other purpose not directly related to the core functionality of the Extension.

## 5. Data Storage and Security

- **Local Storage:** All data collected by the Extension, including your API key and settings, is stored locally on your computer using the `chrome.storage.sync` API. This means the data is stored securely by your browser and may be synced across your devices if you have Chrome sync enabled.
- **Data Transmission:** All communication with third-party AI services is transmitted securely over HTTPS.
- **Data Retention:** We only store your data for as long as the Extension is installed. When you remove the Extension, all locally stored data is deleted by the browser.

## 6. Chrome Extension Permissions Explained

The Extension requires the following permissions to function:

- **`activeTab`**: This allows the Extension to run only on the currently active YouTube tab when you click the extension icon. It does not have access to other tabs or your browsing history.
- **`scripting`**: This is necessary to inject the summary content into the YouTube video page.
- **`storage`**: This permission is used to save your API key and settings locally and securely in your browser.
- **`host_permissions`**: Access to `generativelanguage.googleapis.com` (and similar domains for other AI services) is required to communicate with the AI APIs for generating summaries.

## 7. User Rights and Controls

You have full control over your data:

- **Data Access and Deletion:** You can access, modify, or delete your API key and settings at any time through the Extension's options page.
- **Extension Removal:** You can uninstall the Extension at any time through your browser's extension management page. Upon uninstallation, all stored data is permanently removed.

## 8. International Compliance (GDPR & CCPA)

While we do not collect personal data, we are committed to complying with major privacy regulations:

- **GDPR:** For users in the European Economic Area, we act as a data processor on your behalf. You are the data controller. We do not store or process any personal data on our servers.
- **CCPA:** For users in California, you have the right to know what personal information is being collected about you. As stated in this policy, we do not collect personal information.

## 9. Children's Privacy

The Extension is not intended for use by children under the age of 13. We do not knowingly collect any personal information from children.

## 10. Policy Updates

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
