
// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const optionsBtn = document.getElementById('options-btn');

    optionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});
