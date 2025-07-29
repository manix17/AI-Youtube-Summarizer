
# Plan: Implement User-Provided API Key Feature

This document outlines the plan to add a feature allowing users to provide their own API key for the AI YouTube Summarizer extension.

## 1. Create an Options Page

- **`options.html`**:
  - Create a new HTML file for the options page.
  - It will contain a form with:
    - A text input field for the API key.
    - A "Save" button.
    - A status message area to show feedback (e.g., "Saved!").

- **`options.js`**:
  - Create a new JavaScript file for the options page logic.
  - **Save Key**: On "Save" button click, get the value from the input field and save it to `chrome.storage.sync`.
  - **Load Key**: When the options page loads, retrieve the key from `chrome.storage.sync` and populate the input field with the saved value.

## 2. Update `manifest.json`

- **Add `options_page`**:
  - Add an `options_page` key to the manifest, pointing to `options.html`.
  - Example: `"options_page": "options.html"`
- **Add `storage` permission**:
  - Add the `"storage"` permission to the `permissions` array to allow the use of `chrome.storage`.

## 3. Update `background.js`

- **Retrieve API Key**:
  - In the `chrome.runtime.onMessage` listener, before making the `fetch` call, retrieve the API key from `chrome.storage.sync`.
- **Error Handling**:
  - If the API key is not found in storage, send a response to the content script with an error message prompting the user to set the key in the options page.
- **Remove Hardcoded Key**:
  - Delete the hardcoded `apiKey` variable.

## 4. Update `popup.html`

- **Add Link to Options**:
  - Add a link or button to the popup that opens the options page.
  - This can be done using `chrome.runtime.openOptionsPage()`.
