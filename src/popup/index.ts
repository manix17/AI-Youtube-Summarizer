// popup.ts

document.addEventListener("DOMContentLoaded", () => {
  const optionsBtn = document.getElementById("options-btn");
  const helpBtn = document.getElementById("help-btn");
  const statusDot = document.querySelector<HTMLDivElement>(".status-dot");
  const statusText = document.querySelector<HTMLSpanElement>(".status-indicator span");

  if (optionsBtn) {
    optionsBtn.addEventListener("click", function () {
      // Add a subtle click animation
      (this as HTMLButtonElement).style.transform = "scale(0.95)";
      setTimeout(() => {
        (this as HTMLButtonElement).style.transform = "";
      }, 150);

      chrome.runtime.openOptionsPage();
    });
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", function () {
      (this as HTMLButtonElement).style.transform = "scale(0.95)";
      setTimeout(() => {
        (this as HTMLButtonElement).style.transform = "";
      }, 150);

      // Open help/documentation
      chrome.tabs.create({
        url: "docs/HELP.md",
      });
    });
  }

  // Add dynamic status updates
  if (statusDot && statusText) {
    // Check if we're on YouTube
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
        statusDot.style.background = "#00d4aa";
        statusText.textContent = "Ready to Summarize!";
      } else {
        statusDot.style.background = "#feca57";
        statusText.textContent = "Navigate to YouTube";
      }
    });
  }
});
