# AI YouTube Summarizer

### Get the gist of any YouTube video, instantly.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/[EXTENSION_ID]?style=for-the-badge)](https://chrome.google.com/webstore/detail/[STORE_LINK])
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/rating/[EXTENSION_ID]?style=for-the-badge)](https://chrome.google.com/webstore/detail/[STORE_LINK])

<!-- Note: You'll need to get an [EXTENSION_ID] once you publish to the Chrome Web Store. -->

**AI YouTube Summarizer** is a Chrome extension that uses AI to read a video's transcript and provide a concise summary, saving you time and helping you quickly grasp the key points.

---

## Table of Contents

- [Features](#features-)
- [Installation](#installation-)
- [How to Use](#how-to-use-)
- [Screenshots](#screenshots-)
- [Permissions Explained](#permissions-explained-)
- [Technical Details](#technical-details-)
- [Development](#development-)
- [Troubleshooting](#troubleshooting-)
- [Credits & License](#credits--license-)

---

## Features ✨

- **Instant AI Summaries:** Get a summary of any YouTube video that has a transcript.
- **Easy Access:** The summary appears directly on the YouTube video page for a seamless experience.
- **API Key Integration:** Securely add your own API key via the options page.
- **Customizable:** Configure the extension's settings to fit your needs.

---

## Installation 🚀

You can install AI YouTube Summarizer in two ways:

### 1. From the Chrome Web Store (Recommended)

<!-- This section is ready for when you publish your extension. -->

1.  Visit our official Chrome Web Store page: **[Chrome Web Store Link - Coming Soon!]**
2.  Click the "Add to Chrome" button.
3.  Confirm the installation, and you're all set! The **AI YouTube Summarizer** icon will appear in your browser's toolbar.

### 2. From Source (for local development)

1.  **Clone the repository:**
    ```bash
    git clone [YOUR_REPOSITORY_URL]
    cd yt-summarize
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the extension:**
    ```bash
    npm run build
    ```
4.  **Load the extension in Chrome:**
    - Open Google Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" (toggle in the top-right).
    - Click "Load unpacked" and select the `build` directory from this project.

---

## How to Use 📖

1.  **Set Your API Key:**
    - Right-click the extension icon in your toolbar and select "Options".
    - Enter your Google AI API key and click "Save".
2.  **Access the Extension:** Navigate to any YouTube video with a transcript.
3.  **Get a Summary:** Click the **AI YouTube Summarizer** icon in your Chrome toolbar to open the popup, then click the "Summarize" button.
4.  **View the Summary:** The summary will be injected directly into the YouTube page, typically below the video player.

---

## Screenshots 📸

<!-- Visuals are key! Replace these placeholders with actual screenshots of your extension. -->

#### **Popup Interface**

<!-- A screenshot of your extension's main popup window. -->

![Popup Screenshot]([LINK_TO_POPUP_SCREENSHOT.PNG])

#### **Options Page**

<!-- A screenshot of your extension's options/settings page. -->

![Options Page Screenshot]([LINK_TO_OPTIONS_SCREENSHOT.PNG])

#### **In Action: Summary on YouTube Page**

<!-- A screenshot showing the summary injected on a YouTube page. -->

![In-Action Screenshot]([LINK_TO_IN_ACTION_SCREENSHOT.PNG])

---

## Permissions Explained 🔐

We value your privacy and only request the permissions necessary for the extension to function.

- **`activeTab`**: Allows the extension to run only when you click its icon, limiting its access to the tab you're currently viewing.
- **`scripting`**: Needed to inject the summary content into the YouTube video page.
- **`storage`**: Used to securely save your API key and other settings locally on your browser.
- **`host_permissions`**: Access to `generativelanguage.googleapis.com` is required to communicate with the Google AI API for generating summaries.

**Your privacy is our priority.** We do not collect, store, or transmit any of your personal data. The extension communicates directly with the Google AI service using the API key you provide.

---

## Technical Details ⚙️

- **Compatible Chrome Versions:** Chrome 102 and above (Manifest V3 requirement).
- **System Requirements:** Node.js and npm for development.
- **File Structure Overview:**
  ```
  yt-summarize/
  ├── build/              # The compiled, production-ready extension
  ├── src/                # Source code
  │   ├── background/
  │   ├── content/
  │   ├── options/
  │   ├── popup/
  │   ├── utils/
  │   └── assets/
  ├── tests/              # Unit and integration tests
  ├── docs/               # Documentation files
  ├── manifest.json
  ├── webpack.config.js
  └── package.json
  ```

---

## Development 👩‍💻

We welcome contributions from the community!

### Development Setup

This project uses **Webpack** to bundle the extension. For detailed instructions on setting up a local development environment, running tests, and contributing, please see our **[CONTRIBUTING.md](CONTRIBUTING.md)** file.

The basic workflow is:

1.  Clone the repo and run `npm install`.
2.  Make changes to the code in the `src/` directory.
3.  Run `npm run build` to compile the extension into the `build/` directory.
4.  Load the `build/` directory as an unpacked extension in Chrome.

### Technology Stack

- TypeScript
- HTML5 / CSS3
- Webpack for bundling
- Jest for testing

---

## Troubleshooting 🛠️

- **Issue:** The summary is not appearing.
  - **Solution:** First, ensure the video has a transcript available on YouTube. Second, verify that your API key is correctly saved in the options page and has the necessary permissions.
- **Issue:** The extension icon does not appear in the toolbar.
  - **Solution:** Make sure the extension is enabled in `chrome://extensions`. You may need to pin it to your toolbar by clicking the puzzle piece icon in Chrome and then the pin icon next to **AI YouTube Summarizer**.

If you encounter a bug or have a feature request, please [open an issue on GitHub]([LINK_TO_GITHUB_ISSUES]) or contact us at [SUPPORT_EMAIL].

---

## Credits & License 📜

### License

This project is licensed under the MIT License - see the `LICENSE` file for details.

<!-- You should create a file named 'LICENSE' and add the MIT license text to it. -->

### Third-Party Resources

- **Google Generative AI:** Powers the summarization feature.

### Privacy Policy

You can view our full privacy policy [here](PRIVACY_POLICY.md).

<!-- It's a good practice to create a PRIVACY_POLICY.md file. -->

---

<p align="center">Made with ❤️ by [manix17](https://github.com/manix17)</p>
