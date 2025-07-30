// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const optionsBtn = document.getElementById("options-btn");
  const helpBtn = document.getElementById("help-btn");

  optionsBtn.addEventListener("click", function () {
    // Add a subtle click animation
    this.style.transform = "scale(0.95)";
    setTimeout(() => {
      this.style.transform = "";
    }, 150);

    chrome.runtime.openOptionsPage();
  });

  helpBtn.addEventListener("click", function () {
    this.style.transform = "scale(0.95)";
    setTimeout(() => {
      this.style.transform = "";
    }, 150);

    // Open help/documentation
    chrome.tabs.create({
      url: "https://github.com/your-extension/help",
    });
  });

  // Add dynamic status updates
  const statusDot = document.querySelector(".status-dot");
  const statusText = document.querySelector(".status-indicator span");

  // Check if we're on YouTube
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    if (currentTab.url.includes("youtube.com/watch")) {
      statusDot.style.background = "#00d4aa";
      statusText.textContent = "Ready to Summarize!";
    } else {
      statusDot.style.background = "#feca57";
      statusText.textContent = "Navigate to YouTube";
    }
  });
});
