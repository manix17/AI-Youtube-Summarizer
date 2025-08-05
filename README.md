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

- **Multi-Platform AI Support:** Choose between Google Gemini, OpenAI GPT, and Anthropic Claude models
- **Instant AI Summaries:** Get a summary of any YouTube video that has a transcript
- **Seamless YouTube Integration:** Summary appears directly on the video page with dark theme support
- **Profile Management:** Create multiple profiles with different AI providers and custom prompts
- **Advanced Storage Optimization:** Efficient storage architecture with quota management
- **Interactive Timestamps:** Click timestamps in summaries to jump to specific video moments
- **Copy & Download:** Easy copy-to-clipboard and download summary features
- **Buy Me a Coffee Integration:** Support development directly from the extension popup

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
    - Choose your preferred AI provider (Google Gemini, OpenAI, or Anthropic Claude).
    - Enter your API key, test it, and save your settings.
2.  **Navigate to YouTube:** Go to any YouTube video with a transcript.
3.  **Get a Summary:** Click the **"✨ Summarize"** button that appears below the video player.
4.  **View the Summary:** The summary appears directly on the page with interactive timestamps.
5.  **Copy or Download:** Use the built-in copy and download buttons to save your summary.

### Quick Setup Guide
- **Need API Keys?** Check our [API Keys Guide](docs/API_KEYS.md) for step-by-step instructions
- **Want Custom Prompts?** See our [Custom Prompts Guide](docs/CUSTOM_PROMPTS.md)
- **Need Help?** Visit our comprehensive [Help & Troubleshooting Guide](docs/HELP.md)

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

- **`activeTab`**: Allows the extension to access only the current YouTube tab when you use it
- **`scripting`**: Needed to inject the summary interface into YouTube video pages
- **`storage`**: Used to securely save your API keys, profiles, and settings locally in your browser
- **`clipboardWrite`**: Enables the copy-to-clipboard feature for summaries
- **`host_permissions`**: Access to AI service endpoints:
  - `generativelanguage.googleapis.com` (Google Gemini)
  - `api.openai.com` (OpenAI GPT)
  - `api.anthropic.com` (Anthropic Claude)

**Your privacy is our priority.** We do not collect, store, or transmit any of your personal data. The extension communicates directly with your chosen AI service using the API key you provide. All data is stored locally in your browser.

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

- **TypeScript** - Type-safe development
- **HTML5 / CSS3** - Modern web standards with dark theme support
- **Webpack** - Module bundling and optimization
- **Jest + Puppeteer** - Comprehensive testing suite (99 tests across 9 suites)
- **Chrome Extension API** - Manifest V3 compliance
- **Multi-Provider AI Integration** - Google Gemini, OpenAI, Anthropic Claude

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

- **Google Gemini AI** - Advanced AI model for summarization
- **OpenAI GPT Models** - Powerful language models
- **Anthropic Claude** - High-quality AI assistant
- **Buy Me a Coffee** - Support platform integration

### Privacy Policy

You can view our full privacy policy [here](PRIVACY_POLICY.md).

<!-- It's a good practice to create a PRIVACY_POLICY.md file. -->

---

<p align="center">Made with ❤️ by [manix17](https://github.com/manix17)</p>
