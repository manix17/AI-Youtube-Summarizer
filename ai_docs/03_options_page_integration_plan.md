# Options Page Integration Plan

This document outlines the plan to integrate the new options page with the YouTube Summarizer extension.

### **1. API Key Validation**

The current implementation simulates API key validation with a `setTimeout` function. We will replace this with actual API calls to the respective platforms (OpenAI, Anthropic, OpenRouter, and Google Gemini).

- **Create `api_tester.js`:** This new file will contain the logic for testing API keys. It will export a function that takes the platform, API key, and model as input and returns a promise that resolves or rejects based on the validation result.
- **Update `background.js`:** We will add a message listener to handle API test requests from the options page. This listener will call the appropriate function in `api_tester.js` and send the result back to the options page.
- **Modify `options.js`:** The `testApiKey` function will be updated to send a message to the background script with the platform, API key, and model. It will then wait for the response and display a success or error message to the user.

### **2. Integration with the Summarization Workflow**

The summarization process needs to use the settings from the active profile.

- **Update `background.js`:** The script will load the saved profiles and the current profile from `chrome.storage.sync`. When a summarization request is received, it will use the active profile's settings (platform, model, API key, and prompts) to make the API call.
- **Dynamic Prompt Generation:** The `{transcript}` placeholder in the user prompt will be replaced with the actual video transcript before sending it to the AI platform.

### **3. Code Refactoring and Organization**

To improve maintainability, we will refactor the code as follows:

- **Separate API Logic:** The API-related logic will be moved to a dedicated file to keep the background script clean and focused on event handling.
- **Configuration Management:** The platform configurations will be stored in a separate JSON file for easier management.
