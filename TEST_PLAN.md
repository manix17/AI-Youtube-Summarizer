# YouTube Summarizer - Test Plan

## 1. Introduction

This document outlines the testing strategy and detailed test cases for the AI YouTube Summarizer Chrome Extension. The primary goal is to ensure the extension is functional, reliable, and provides a good user experience. The test plan is designed to achieve at least 90% code coverage through a combination of unit, integration, and end-to-end (E2E) tests.

**Testing Frameworks:**
*   **Unit/Integration:** [Jest](https://jestjs.io/)
*   **End-to-End (E2E):** [Cypress](https://www.cypress.io/) or [Playwright](https://playwright.dev/)

## 2. Testing Strategy

### 2.1. Unit Tests (Jest)

**Focus:** Isolate and test individual functions and modules.
**Scope:**
*   Utility functions (`src/utils/*`): DOM parsing, API helpers.
*   Background script logic (`src/background/index.ts`): Message handling, API communication logic.
*   Options page logic (`src/options/index.ts`): State management, settings persistence.
**Mocks:**
*   `chrome.*` APIs will be mocked using `jest-chrome`.
*   `fetch` API will be mocked to simulate network requests/responses from AI services.
*   DOM elements will be mocked using JSDOM for parsing logic tests.

### 2.2. End-to-End Tests (Cypress/Playwright)

**Focus:** Simulate complete user workflows in a real browser environment.
**Scope:**
*   Full user stories from installation to summary generation.
*   UI interactions on both the YouTube page and the Options page.
*   Cross-browser compatibility (if applicable).
**Mocks:**
*   Use network request interception (`cy.intercept`) to provide consistent API responses and test UI behavior under different conditions (success, loading, error) without actual API calls.
*   Use fixture files for YouTube page HTML to ensure tests are not dependent on live YouTube content.

## 3. Test Cases

### 3.1. UI & Extension Activation

| Test ID | Description | Test Steps | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **UI-001** | Verify the extension icon appears on the browser toolbar after installation. | 1. Install the extension. <br> 2. Navigate to any website. | The extension icon is visible in the browser's toolbar/extensions menu. | E2E |
| **UI-002** | Verify the "Summarize Video" button appears on a valid YouTube video page. | 1. Open a valid `youtube.com/watch?v=` URL. <br> 2. Wait for the page to load. | The "✨ Summarize Video" button is visible below the video player. | E2E |
| **UI-003** | Verify the "Summarize Video" button does NOT appear on non-video YouTube pages. | 1. Navigate to the YouTube homepage, a channel page, or search results. | The "✨ Summarize Video" button is not present. | E2E |
| **UI-004** | Verify the "Summarize Video" button does NOT appear on non-YouTube websites. | 1. Navigate to a non-YouTube URL (e.g., `google.com`). | The "✨ Summarize Video" button is not present. | E2E |
| **UI-005** | Test the responsiveness of the injected summary UI. | 1. Generate a summary on a video page. <br> 2. Resize the browser window to different widths (desktop, tablet, mobile). | The summary container and its content adjust correctly without breaking the layout. | E2E |

### 3.2. Core Functionality

| Test ID | Description | Test Steps | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **CORE-001** | Generate a summary for a short video (< 1 minute). | 1. Navigate to a short video with a transcript. <br> 2. Click "✨ Summarize Video". | A loading indicator appears, followed by a correctly formatted summary. | E2E |
| **CORE-002** | Generate a summary for a long video (> 30 minutes). | 1. Navigate to a long video with a transcript. <br> 2. Click "✨ Summarize Video". | A loading indicator appears, followed by a correctly formatted summary. The process may take longer but should not time out. | E2E |
| **CORE-003** | Verify that clickable timestamps in the summary work correctly. | 1. Generate a summary that includes timestamps. <br> 2. Click on a timestamp (e.g., `[01:23]`). | The YouTube video player jumps to the corresponding time (1 minute, 23 seconds). | E2E |
| **CORE-004** | Verify summary is generated based on the active profile's prompt. | 1. Create a new profile with a unique prompt (e.g., "Summarize this as a poem"). <br> 2. Activate the new profile. <br> 3. Summarize a video. | The generated summary follows the unique format defined in the custom prompt. | E2E |
| **CORE-005** | Test `dom_parser` utility for extracting transcript. | 1. Provide mock HTML content of a YouTube page to the parser function. | The function correctly extracts and formats the full transcript text. | Unit |
| **CORE-006** | Test API request formatting. | 1. Call the internal function that builds the API request. <br> 2. Provide mock data (prompts, transcript, model). | The function returns a correctly structured request body and headers for the target AI platform. | Unit |

### 3.3. Settings & Configuration (Options Page)

| Test ID | Description | Test Steps | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **SET-001** | Successfully save a valid API key. | 1. Open Options page. <br> 2. Select an AI platform. <br> 3. Enter a valid (mocked) API key. <br> 4. Click "Test" and then save. | The key is saved, and the model list is populated. A success message is shown. | E2E |
| **SET-002** | Fail to save an invalid API key. | 1. Open Options page. <br> 2. Enter an invalid API key. <br> 3. Click "Test". | An error message is displayed, and the model list remains empty. | E2E |
| **SET-003** | Create, rename, and delete a custom profile. | 1. Open Options page. <br> 2. Click "+ Add" to create a profile. <br> 3. Enter a name and save. <br> 4. Select the profile and click the rename icon. <br> 5. Change the name and save. <br> 6. Select the profile and click the delete icon. | The profile is successfully created, renamed, and then removed from the list. | E2E |
| **SET-004** | Modify and save a custom prompt. | 1. Open Options page. <br> 2. Select a profile. <br> 3. Modify the text in the "System Prompt" and "User Prompt" textareas. <br> 4. Navigate away and back to the profile. | The changes to the prompts are persisted correctly. | E2E |
| **SET-005** | Test the "Reset Current Preset" button. | 1. Modify a preset's prompts. <br> 2. Click "Reset Current Preset". | The prompts for the currently selected preset are reverted to their default values. | E2E |
| **SET-006** | Test the temperature slider. | 1. Move the temperature slider. | The numeric value next to the slider updates accordingly. The value is saved with the profile settings. | E2E |
| **SET-007** | Test `chrome.storage` logic for settings. | 1. Call functions that save/load settings. <br> 2. Use a mocked `chrome.storage` API. | Verify that `chrome.storage.sync.get` and `chrome.storage.sync.set` are called with the correct keys and values. | Unit |

### 3.4. Error & Edge Case Handling

| Test ID | Description | Test Steps | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **ERR-001** | Test a YouTube video with no transcript available. | 1. Navigate to a video where transcripts are disabled. <br> 2. Click "✨ Summarize Video". | An error message "Could not find a transcript for this video" is displayed in the summary area. | E2E |
| **ERR-002** | Test a video with a non-English transcript. | 1. Navigate to a video with only a non-English transcript (e.g., Spanish). <br> 2. Summarize the video with `TARGET_LANGUAGE` set to English. | The extension successfully fetches the transcript and generates a summary. | E2E |
| **ERR-003** | Simulate an API failure (e.g., 500 server error). | 1. Intercept the API call and force a 500 response. <br> 2. Click "✨ Summarize Video". | An error message is displayed, indicating the AI service failed. | E2E |
| **ERR-004** | Simulate network disconnection. | 1. Disable the network connection using browser dev tools. <br> 2. Click "✨ Summarize Video". | A relevant error message (e.g., "Network error") is displayed. | E2E |
| **ERR-005** | Test with a live stream video. | 1. Navigate to a YouTube live stream. | The "✨ Summarize Video" button should either be disabled or show an error message indicating live streams cannot be summarized. | E2E |
| **ERR-006** | Test with an age-restricted video. | 1. Navigate to an age-restricted video (while logged out). | The extension should handle the login wall gracefully, likely failing with a "transcript not found" error. | E2E |
| **ERR-007** | Test background script error handling for failed API calls. | 1. Mock `fetch` to throw an error. <br> 2. Send a "summarize" message to the background script. | The script catches the error and sends an error response message back to the content script. | Unit |

### 3.5. Performance & Stability

| Test ID | Description | Test Steps | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **PERF-001** | Measure summary generation time. | 1. For a standard 10-minute video, record the time from clicking "Summarize" to the summary appearing. | The time should be within an acceptable range (e.g., 5-15 seconds). | E2E |
| **PERF-002** | Stress test by summarizing multiple videos in rapid succession. | 1. Open 5 different video tabs. <br> 2. Click "Summarize" on all of them quickly. | The extension remains responsive, and all summaries are eventually generated without crashing the browser or the extension. | E2E |
| **PERF-003** | Monitor browser memory and CPU usage during summarization. | 1. Use browser developer tools to profile memory and CPU. <br> 2. Generate a summary for a very long video (2+ hours). | Memory and CPU usage should increase during processing but return to a normal level afterward, indicating no memory leaks. | Manual |

## 4. Code Coverage Strategy (90%+)

To achieve the 90% coverage goal, the following areas must be prioritized:

*   **Unit Tests:**
    *   **`dom_parser.ts`**: Create mock HTML strings representing various YouTube page layouts (with and without transcripts, different transcript formats) and assert that the parsing logic correctly extracts the data or fails gracefully.
    *   **`api.ts` / `api_tester.ts`**: Test the request building logic for each supported AI platform (OpenAI, Anthropic, OpenRouter, Gemini). Mock the `fetch` call and test that the function correctly handles different HTTP responses (200, 401, 429, 500).
    *   **`options/index.ts`**: Mock `chrome.storage` and the DOM. Test all logic for profile management (add, delete, rename, update), API key validation, and prompt manipulation. Ensure every function and conditional branch is tested.
    *   **`background/index.ts`**: Mock `chrome.runtime`, `chrome.tabs`, and the API utility functions. Test all message listeners (`chrome.runtime.onMessage`). Ensure all logic paths, including error handling (e.g., `try...catch` blocks for API calls), are executed.

*   **E2E Tests:**
    *   Cover every major user story to ensure components are integrated correctly.
    *   Use `cy.intercept()` to test the UI's reaction to various API states (`loading`, `success`, `error`), which covers the rendering logic in the content scripts without needing to test the background script's logic again.
    *   Focus on asserting UI states: an element is visible, contains the correct text, is enabled/disabled, etc.
