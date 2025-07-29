
// options.js

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const apiKeyInput = document.getElementById('api-key');
    const statusEl = document.getElementById('status');

    // Load the saved API key when the page loads
    chrome.storage.sync.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });

    // Save the API key when the save button is clicked
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ apiKey: apiKey }, () => {
                statusEl.textContent = 'API key saved!';
                setTimeout(() => {
                    statusEl.textContent = '';
                }, 2000);
            });
        } else {
            statusEl.textContent = 'Please enter a valid API key.';
        }
    });
});
