// src/content/index.ts

import { convertToHTML, convertHTMLToText } from "../utils/dom_parser";
import {
  getProgressiveLoadingMessage,
  getContextualLoadingMessage,
} from "../utils/loading_messages";
import type {
  VideoMetadata,
  PlayerResponse,
  SummarizeRequest,
  SummarizeResponseMessage,
  PageResponseMessage,
  CaptionTrack,
} from "../types";

// --- 1. UI Injection and Management ---

/**
 * Injects the main "Summarize Video" button and summary container into the page.
 */
function injectSummarizeUI(): void {
  const targetElement = document.querySelector<HTMLElement>("#below");

  if (targetElement && !document.getElementById("summarize-ui-container") && !document.getElementById("summary-wrapper") && !document.getElementById("summary-button-container")) {
    const uiContainer = document.createElement("div");
    uiContainer.id = "summarize-ui-container";
    uiContainer.classList.add("summarize-ui-container");
    // Ensure the container displays as block to stack elements vertically
    uiContainer.style.display = "block";
    uiContainer.style.width = "100%";

    const profileSelect = document.createElement("select");
    profileSelect.id = "profile-select";
    profileSelect.classList.add("summary-select");

    const presetSelect = document.createElement("select");
    presetSelect.id = "preset-select";
    presetSelect.classList.add("summary-select");

    const languageSelect = document.createElement("select");
    languageSelect.id = "language-select";
    languageSelect.classList.add("summary-select");

    const button = document.createElement("button");
    button.innerText = "✨ Summarize";
    button.id = "summarize-btn";
    button.classList.add("summarize-btn");

    // Create a top row container for horizontal elements
    const topRow = document.createElement("div");
    topRow.classList.add("summarize-top-row");
    topRow.style.display = "flex";
    topRow.style.gap = "8px";
    topRow.style.alignItems = "center";
    topRow.style.justifyContent = "space-between";
    topRow.style.marginBottom = "8px";
    topRow.style.width = "100%";

    // Create left side container for controls
    const leftControls = document.createElement("div");
    leftControls.style.display = "flex";
    leftControls.style.gap = "8px";
    leftControls.style.alignItems = "center";
    
    leftControls.appendChild(profileSelect);
    leftControls.appendChild(presetSelect);
    leftControls.appendChild(languageSelect);
    leftControls.appendChild(button);

    topRow.appendChild(leftControls);
    
    // Add button container to the right side of top row (will be added later after it's created)

    // Create question input that will appear below - ensure it's on its own line
    const questionInput = createQuestionInput();

    // Create a wrapper for question input to ensure proper layout
    const questionWrapper = document.createElement("div");
    questionWrapper.style.width = "100%";
    questionWrapper.style.display = "block";
    questionWrapper.style.clear = "both";
    questionWrapper.style.marginBottom = "16px"; // Space between question input and summary content
    questionWrapper.style.position = "relative";
    questionWrapper.style.zIndex = "10"; // Lower than toolbar but higher than default
    questionWrapper.appendChild(questionInput);

    uiContainer.appendChild(topRow);

    const summaryContainer = document.createElement("div");
    summaryContainer.id = "summary-container";
    summaryContainer.classList.add("summary-container", "hidden");

    // ... (rest of the summary container setup is the same)
    const toggleButton = document.createElement("button");
    toggleButton.id = "toggle-summary-btn";
    toggleButton.setAttribute("data-tooltip", "Show Summary");
    toggleButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block; transition: transform 0.2s ease;"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
    toggleButton.classList.add("toggle-summary-btn");
    toggleButton.addEventListener("click", handleToggleSummary);

    const copyButton = document.createElement("button");
    copyButton.id = "copy-summary-btn";
    copyButton.setAttribute("data-tooltip", "Copy to Clipboard");
    copyButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
    copyButton.classList.add("copy-summary-btn");
    copyButton.addEventListener("click", handleCopyToClipboard);

    const downloadButton = document.createElement("button");
    downloadButton.id = "download-summary-btn";
    downloadButton.setAttribute("data-tooltip", "Download as Markdown");
    downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block;"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>`;
    downloadButton.classList.add("download-summary-btn");
    downloadButton.addEventListener("click", handleDownloadSummary);

    const fullscreenButton = document.createElement("button");
    fullscreenButton.id = "fullscreen-summary-btn";
    fullscreenButton.setAttribute("data-tooltip", "Open in New Window");
    fullscreenButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block;"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
    fullscreenButton.classList.add("fullscreen-summary-btn");
    fullscreenButton.addEventListener("click", handleFullscreenSummary);

    const summaryContent = document.createElement("div");
    summaryContent.id = "summary-content";
    summaryContainer.appendChild(summaryContent);

    const buttonContainer = document.createElement("div");
    buttonContainer.id = "summary-button-container";
    buttonContainer.classList.add("summary-button-container");
    // Override positioning and sizing to be inline with top controls
    buttonContainer.style.position = "relative";
    buttonContainer.style.top = "auto";
    buttonContainer.style.margin = "0";
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "6px";
    buttonContainer.style.alignItems = "center";
    // Match height of form elements (selects and button)
    buttonContainer.style.height = "36px";
    buttonContainer.style.padding = "4px 8px";
    buttonContainer.appendChild(fullscreenButton);
    buttonContainer.appendChild(downloadButton);
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(toggleButton);

    // Add button container to the right side of the top row
    topRow.appendChild(buttonContainer);

    // Create a wrapper to hold question input and summary container
    const summaryWrapper = document.createElement("div");
    summaryWrapper.id = "summary-wrapper";
    summaryWrapper.classList.add("summary-wrapper");
    
    // Add question input first
    summaryWrapper.appendChild(questionWrapper);
    
    // Add summary container after question input
    summaryWrapper.appendChild(summaryContainer);

    targetElement.prepend(summaryWrapper);
    targetElement.prepend(uiContainer);

    button.addEventListener("click", handleSummarizeClick);
    summaryContainer.addEventListener("click", handleTimestampClick);

    initialize();
    profileSelect.addEventListener("change", handleProfileChange);
    presetSelect.addEventListener("change", handlePresetChange);
    languageSelect.addEventListener("change", handleLanguageChange);

    injectCss("assets/css/summary.css");
    setupDarkModeObserver();
    
    // Force apply current theme immediately
    applyCurrentTheme();
  }
}

/**
 * Apply current theme to UI elements immediately
 */
function applyCurrentTheme(): void {
  const targetNode = document.documentElement;
  const isDarkMode = targetNode.hasAttribute("dark");
  const summaryContainer = document.getElementById("summary-container");
  const summaryWrapper = document.querySelector(".summary-wrapper");
  const uiContainer = document.getElementById("summarize-ui-container");
  const buttonContainer = document.getElementById("summary-button-container");
  
  
  if (summaryContainer) {
    summaryContainer.classList.toggle("dark", isDarkMode);
  }
  if (summaryWrapper) {
    summaryWrapper.classList.toggle("dark", isDarkMode);
  }
  if (uiContainer) {
    uiContainer.classList.toggle("dark", isDarkMode);
  }
  if (buttonContainer) {
    buttonContainer.classList.toggle("dark", isDarkMode);
  }
}

/**
 * Sets up a MutationObserver to watch for changes to YouTube's dark mode attribute.
 */
function setupDarkModeObserver(): void {
  const targetNode = document.documentElement;
  const config = { attributes: true, attributeFilter: ["dark"] };

  const callback = (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "attributes" && mutation.attributeName === "dark") {
        applyCurrentTheme();
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
}

/**
 * Handles the click event for the toggle summary button.
 */
function handleToggleSummary(): void {
  const summaryContainer = document.getElementById("summary-container");
  const toggleButton = document.getElementById("toggle-summary-btn");
  
  if (summaryContainer && toggleButton) {
    const isHidden = summaryContainer.classList.contains("hidden");
    
    if (isHidden) {
      // Show the container
      summaryContainer.classList.remove("hidden");
      toggleButton.setAttribute("data-tooltip", "Hide Summary");
      toggleButton.innerHTML = 
        '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block; transition: transform 0.2s ease;"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
    } else {
      // Hide the container
      summaryContainer.classList.add("hidden");
      toggleButton.setAttribute("data-tooltip", "Show Summary");
      toggleButton.innerHTML = 
        '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block; transition: transform 0.2s ease;"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
    }
  }
}

function handleDownloadSummary(): void {
  const summaryContent =
    document.querySelector<HTMLElement>(".markdown-content");
  const videoTitle = getVideoMetadata().videoTitle;
  if (summaryContent) {
    // Use the new conversion function to preserve formatting
    const formattedText = convertHTMLToText(summaryContent);
    const blob = new Blob([formattedText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoTitle}_summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Handles the click event for the fullscreen summary button.
 */
function handleFullscreenSummary(): void {
  const summaryContent = document.querySelector<HTMLElement>(".markdown-content");
  const videoTitle = getVideoMetadata().videoTitle;
  
  if (summaryContent) {
    // Create a new window with the summary content
    const fullscreenWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (fullscreenWindow) {
      // First, write the HTML structure
      fullscreenWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Summary - ${videoTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 900px;
              margin: 0 auto;
              padding: 40px 20px;
              line-height: 1.6;
              color: #333;
              background: #fff;
            }
            .header {
              border-bottom: 2px solid #eee;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 1.8rem;
              color: #1a202c;
            }
            .summary-content {
              font-size: 16px;
              line-height: 1.7;
            }
            .summary-content h1 { font-size: 2.2em; color: #1a202c; margin: 24px 0 16px 0; }
            .summary-content h2 { font-size: 1.8em; color: #2563eb; margin: 20px 0 14px 0; }
            .summary-content h3 { font-size: 1.5em; color: #1d4ed8; margin: 18px 0 12px 0; }
            .summary-content p { margin-bottom: 16px; }
            .summary-content ul, .summary-content ol { margin-bottom: 16px; padding-left: 20px; }
            .summary-content li { margin-bottom: 8px; }
            .summary-content strong { color: #1a202c; font-weight: 600; }
            .summary-content code {
              background: #f7fafc;
              color: #e53e3e;
              padding: 3px 6px;
              border-radius: 4px;
              font-family: "Monaco", "Menlo", "Consolas", monospace;
            }
            .summary-content pre {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              overflow-x: auto;
              font-family: "Monaco", "Menlo", "Consolas", monospace;
              font-size: 0.9em;
            }
            .summary-content pre code {
              background: none;
              color: inherit;
              padding: 0;
            }
            .timestamp-link {
              color: #2563eb;
              text-decoration: underline;
              cursor: pointer;
            }
            .timestamp-link:hover {
              color: #1d4ed8;
            }
            @media (prefers-color-scheme: dark) {
              body { background: #1a1a1a; color: #e5e5e5; }
              .header { border-color: #444; }
              .header h1 { color: #fff; }
              .summary-content h1 { color: #fff; }
              .summary-content h2 { color: #60a5fa; }
              .summary-content h3 { color: #93c5fd; }
              .summary-content strong { color: #fff; }
              .summary-content code { background: #374151; color: #fca5a5; }
              .summary-content pre { background: #1f2937; border-color: #374151; }
              .timestamp-link { color: #60a5fa; }
              .timestamp-link:hover { color: #93c5fd; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Video Summary</h1>
            <p><strong>Video:</strong> ${videoTitle}</p>
          </div>
          <div class="summary-content">
            ${summaryContent.innerHTML}
          </div>
        </body>
        </html>
      `);
      fullscreenWindow.document.close();
      
      // Add the event listener programmatically to avoid CSP issues
      fullscreenWindow.document.addEventListener('click', function(e: Event) {
        const target = e.target as HTMLElement;
        if (target && target.classList.contains('timestamp-link')) {
          e.preventDefault();
          const seconds = target.dataset.seconds;
          if (seconds && window.opener) {
            window.opener.postMessage({
              type: 'seekToTime',
              seconds: parseInt(seconds)
            }, '*');
          }
        }
      });
    }
  }
}

/**
 * Handles the click event for the copy to clipboard button.
 */
function handleCopyToClipboard(): void {
  const summaryContent =
    document.querySelector<HTMLElement>(".markdown-content");
  if (summaryContent) {
    // Create a temporary div to hold the HTML content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = summaryContent.innerHTML;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);

    // Select the content of the temporary div
    const range = document.createRange();
    range.selectNode(tempDiv);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    try {
      // Copy the selected content to the clipboard
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }

    // Clean up the temporary div and selection
    document.body.removeChild(tempDiv);
    selection?.removeAllRanges();

    const copyButton = document.getElementById(
      "copy-summary-btn"
    ) as HTMLButtonElement;
    copyButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    setTimeout(() => {
      copyButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
    }, 2000);
  }
}

/**
 * Injects a CSS file into the page's head.
 * @param {string} file - The path to the CSS file.
 */
function injectCss(file: string): void {
  const link = document.createElement("link");
  link.href = chrome.runtime.getURL(file);
  link.type = "text/css";
  link.rel = "stylesheet";
  (document.head || document.documentElement).appendChild(link);
}

/**
 * Handles clicks on timestamp links within the summary.
 * @param {MouseEvent} e - The click event.
 */
function handleTimestampClick(e: MouseEvent): void {
  const target = (e.target as HTMLElement).closest<HTMLAnchorElement>(
    ".timestamp-link"
  );
  if (target) {
    e.preventDefault();
    const seconds = parseInt(target.dataset.seconds!, 10);
    const player = document.querySelector<HTMLVideoElement>("video");
    if (player) {
      player.currentTime = seconds;
    }
  }
}

// --- 2. Summarization Logic ---

let profiles: Record<string, any> = {};
let defaultPrompts: any = {};
let currentProfileId: string = "default";
let loadingInterval: number | null = null;

async function initialize() {
  try {
    const promptsRes = await fetch(
      chrome.runtime.getURL("assets/prompts.json")
    );
    defaultPrompts = await promptsRes.json();
    await loadProfiles();
  } catch (error) {
    console.error("Error initializing summarizer UI:", error);
  }
}

async function loadProfiles() {
  const profileSelect = document.getElementById(
    "profile-select"
  ) as HTMLSelectElement;

  chrome.storage.sync.get(null, (data) => {
    let storedProfiles: Record<string, any> = {};

    if (data.profile_ids && data.profile_ids.length > 0) {
      const profileIds = data.profile_ids;
      for (const id of profileIds) {
        if (data[`profile_${id}`]) {
          storedProfiles[id] = data[`profile_${id}`];
        }
      }
      currentProfileId = data.currentProfile || "default";
    } else {
      // No profiles in storage, so create a default one for the UI to use.
      storedProfiles = {
        default: {
          name: "Default",
          presets: {}, // This will be populated by the reconstruction logic below
          currentPreset: "detailed",
        },
      };
      currentProfileId = "default";
    }

    // Reconstruct full profiles by merging stored data with defaults
    profiles = {};
    for (const profileId in storedProfiles) {
      const userProfile = storedProfiles[profileId];
      const fullPresets = JSON.parse(JSON.stringify(defaultPrompts.presets));

      for (const key in fullPresets) {
        fullPresets[key].isDefault = true;
        if (
          userProfile.presets &&
          userProfile.presets[key] &&
          userProfile.presets[key].isDefault
        ) {
          Object.assign(fullPresets[key], userProfile.presets[key]);
        }
      }

      if (userProfile.presets) {
        for (const key in userProfile.presets) {
          if (!userProfile.presets[key].isDefault) {
            fullPresets[key] = userProfile.presets[key];
          }
        }
      }
      profiles[profileId] = {
        ...userProfile,
        presets: fullPresets,
      };
    }

    // Populate the UI now that profiles are guaranteed to exist
    profileSelect.innerHTML = "";
    for (const id in profiles) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = profiles[id].name;
      profileSelect.appendChild(option);
    }
    profileSelect.value = currentProfileId;
    handleProfileChange();
  });
}

async function handleProfileChange() {
  const profileSelect = document.getElementById(
    "profile-select"
  ) as HTMLSelectElement;
  const presetSelect = document.getElementById(
    "preset-select"
  ) as HTMLSelectElement;
  const languageSelect = document.getElementById(
    "language-select"
    ) as HTMLSelectElement;
  currentProfileId = profileSelect.value;

  // Save the newly selected profile as the current one
  chrome.storage.sync.set({ currentProfile: currentProfileId });

  const profile = profiles[currentProfileId];

  if (profile && profile.presets) {
    presetSelect.innerHTML = "";
    for (const presetId in profile.presets) {
      const preset = profile.presets[presetId];
      const option = document.createElement("option");
      option.value = presetId;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
    presetSelect.value = profile.currentPreset;
    
    // Update question input visibility and button text based on current preset
    showQuestionInput(profile.currentPreset === "custom_query");
    updateButtonText(profile.currentPreset);
  }
  if (profile) {
    languageSelect.innerHTML = "";
    try {
      const response = await fetch(chrome.runtime.getURL("assets/supported_languages.json"));
      const languages = await response.json();
      for (const language of languages) {
          const option = document.createElement("option");
          option.value = language;
          option.textContent = language;
          languageSelect.appendChild(option);
      }
      languageSelect.value = profile.language || "English";
    } catch (error) {
      console.error("Error loading languages:", error);
      // Fallback to a minimal list if loading fails
      const fallbackLanguages = ["English", "Spanish", "French"];
      for (const language of fallbackLanguages) {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
      }
    }
  }
}

function handlePresetChange() {
  const presetSelect = document.getElementById(
    "preset-select"
  ) as HTMLSelectElement;
  const selectedPresetId = presetSelect.value;

  // Show/hide question input and update button text based on preset
  showQuestionInput(selectedPresetId === "custom_query");
  updateButtonText(selectedPresetId);

  // Update the currentPreset value for the active profile in storage
  const profileKey = `profile_${currentProfileId}`;
  chrome.storage.sync.get(profileKey, (data) => {
    if (data[profileKey]) {
      const profile = data[profileKey];
      profile.currentPreset = selectedPresetId;
      chrome.storage.sync.set({ [profileKey]: profile });
    }
  });
}

function handleLanguageChange() {
    const languageSelect = document.getElementById(
        "language-select"
    ) as HTMLSelectElement;
    const selectedLanguage = languageSelect.value;

    const profileKey = `profile_${currentProfileId}`;
    chrome.storage.sync.get(profileKey, (data) => {
        if (data[profileKey]) {
            const profile = data[profileKey];
            profile.language = selectedLanguage;
            chrome.storage.sync.set({ [profileKey]: profile });
        }
    });
}

/**
 * Main handler for the "Summarize" button click.
 */
async function handleSummarizeClick(): Promise<void> {
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;
  const summaryContainer = document.getElementById(
    "summary-container"
  ) as HTMLDivElement;
  const toggleButton = document.getElementById("toggle-summary-btn");
  const profileSelect = document.getElementById(
    "profile-select"
  ) as HTMLSelectElement;
  const presetSelect = document.getElementById(
    "preset-select"
  ) as HTMLSelectElement;
    const languageSelect = document.getElementById(
    "language-select"
    ) as HTMLSelectElement;

  button.innerText = "⏳ Summarizing...";
  button.disabled = true;
  
  // Always show the summary container when generating a new summary
  summaryContainer.classList.remove("hidden");
  
  // Update the toggle button to reflect the visible state
  if (toggleButton) {
    toggleButton.setAttribute("data-tooltip", "Hide Summary");
    toggleButton.innerHTML = 
      '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor" style="pointer-events: none; display: block; transition: transform 0.2s ease;"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
  }

  const metadata = getVideoMetadata();
  const initialMessage = getContextualLoadingMessage(
    metadata.videoTitle,
    metadata.channelName
  );
  updateSummaryContent(initialMessage);

  // Start loading messages
  const startTime = Date.now();
  if (loadingInterval) clearInterval(loadingInterval);
  loadingInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    updateSummaryContent(getProgressiveLoadingMessage(elapsed));
  }, 3000);

  try {
    // Validate question if "Ask a Question" preset is selected
    if (presetSelect.value === "custom_query") {
      const question = getQuestionText();
      if (!validateQuestion(question)) {
        throw new Error("Please enter a question to ask about this video.");
      }
    }

    const transcript = await getTranscript();
    if (!transcript || transcript.trim() === "") {
      throw new Error("Could not retrieve a valid transcript.");
    }

    const metadata = getVideoMetadata();

    const message: SummarizeRequest = {
      type: "summarize",
      payload: {
        transcript: transcript,
        profileId: profileSelect.value,
        presetId: presetSelect.value,
        language: languageSelect.value,
        question: presetSelect.value === "custom_query" ? getQuestionText() : undefined,
        ...metadata,
      },
    };

    // Use streaming API for real-time display
    handleSummarizeStreaming(message);
  } catch (error) {
    handleError(error as Error);
  }
}

/**
 * Handles the response from the background script.
 * @param {SummarizeResponseMessage} response - The response object from the background script.
 */
function handleResponse(response: SummarizeResponseMessage): void {
  if (loadingInterval) clearInterval(loadingInterval);
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;

  if (response.error) {
    handleError(new Error(response.error));
  } else if (chrome.runtime.lastError) {
    handleError(new Error(chrome.runtime.lastError.message));
  } else if (response && response.payload?.summary) {
    if (response.payload.summary.startsWith("Error:")) {
      handleError(new Error(response.payload.summary));
    } else {
      const formattedSummary = convertToHTML(response.payload.summary);
      updateSummaryContent(
        `<div class="markdown-content">${formattedSummary}</div>`
      );
      // Scroll to summary container once content is ready (with small delay for DOM update)
      setTimeout(() => scrollToSummary(), 100);
    }
  } else {
    handleError(new Error("Failed to get a valid summary."));
  }
  button.innerText = "✨ Summarize";
  button.disabled = false;
}

/**
 * Displays an error message in the summary container.
 * @param {Error} error - The error object.
 */
function handleError(error: Error): void {
  if (loadingInterval) clearInterval(loadingInterval);
  updateSummaryContent(
    `<p style="color: red;"><b>Error:</b> ${error.message}</p>`
  );
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;
  button.innerText = "✨ Summarize";
  button.disabled = false;
}

/**
 * Updates the content of the summary container.
 * @param {string} html - The HTML string to display.
 */
function updateSummaryContent(html: string): void {
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = html;
  }
}

/**
 * Scrolls to the summary container smoothly.
 */
function scrollToSummary(): void {
  const summaryContainer = document.getElementById("summary-container");
  if (summaryContainer) {
    summaryContainer.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest"
    });
  }
}

/**
 * Handles streaming summarization requests and responses.
 * @param {any} message - The message to send for streaming summarization.
 */
function handleSummarizeStreaming(message: any): void {
  // Don't clear the loading interval here - let the humorous messages continue
  // until we receive the first chunk
  
  // Add CSS for streaming content transitions if not already present
  if (!document.getElementById('streaming-css')) {
    const style = document.createElement('style');
    style.id = 'streaming-css';
    style.textContent = `
      .streaming-content {
        animation: streamingFadeIn 0.3s ease-in-out;
      }
      @keyframes streamingFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Send streaming request
  const streamingMessage = {
    ...message,
    type: "summarizeStreaming"
  };
  
  chrome.runtime.sendMessage(streamingMessage);
}

/**
 * Handles streaming chunk messages from the background script.
 * @param {any} chunk - The streaming chunk data.
 */
function handleStreamingChunk(chunk: any): void {
  // Clear the humorous loading messages when first chunk arrives
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
  
  const summaryContent = document.getElementById("summary-content");
  if (!summaryContent) {
    console.error("Summary content element not found");
    return;
  }
  
  // Initialize streaming content container if not exists
  let streamingContent = summaryContent.querySelector('.streaming-content');
  if (!streamingContent) {
    summaryContent.innerHTML = '<div class="streaming-content markdown-content"></div>';
    streamingContent = summaryContent.querySelector('.streaming-content');
  }
  
  if (chunk.error) {
    console.error("Streaming chunk error:", chunk.error);
    // Handle error
    handleError(new Error(chunk.error));
    return;
  }
  
  if (chunk.content) {
    // Append new content - convert markdown to HTML for each chunk
    const newContent = chunk.content;
    
    // For streaming, we need to accumulate the content and re-parse it
    // to handle markdown that spans multiple chunks
    const accumulatedText = (streamingContent?.getAttribute('data-accumulated') || '') + newContent;
    streamingContent?.setAttribute('data-accumulated', accumulatedText);
    
    
    // Convert accumulated markdown to HTML
    const htmlContent = convertToHTML(accumulatedText);
    
    if (streamingContent) {
      streamingContent.innerHTML = htmlContent;
      
      // Make sure the summary container is visible
      const summaryContainer = document.getElementById("summary-container");
      if (summaryContainer) {
        summaryContainer.classList.remove("hidden");
      }
    }
  }
  
  if (chunk.isComplete) {
    // Streaming is complete
    const button = document.getElementById("summarize-btn") as HTMLButtonElement;
    button.innerText = "✨ Summarize";
    button.disabled = false;
    
    // Scroll to summary container once complete
    setTimeout(() => scrollToSummary(), 100);
    
    // Clean up streaming indicator CSS
    const streamingCSS = document.getElementById('streaming-css');
    if (streamingCSS) {
      streamingCSS.remove();
    }
  }
}

// --- 3. Transcript and Metadata Extraction ---

/**
 * Tries to get the transcript using the API method first, then falls back to DOM scraping.
 * @returns {Promise<string>} A promise that resolves with the transcript text.
 */
async function getTranscript(): Promise<string> {
  try {
    const apiTranscript = await getTranscriptFromApi();
    if (apiTranscript && apiTranscript.trim() !== "") {
      return apiTranscript;
    }
  } catch (error) {
  }
  // If API method fails or returns empty, try the DOM fallback
  return getTranscriptFromDOM();
}

/**
 * Extracts video metadata from the page.
 * @returns {VideoMetadata} An object containing video title, duration, channel name, and description.
 */
function getVideoMetadata(): VideoMetadata {
  // Get video description from the expandable description section
  let videoDescription = "N/A";
  
  // Try to get description from the expanded description area
  const descriptionElement = document.querySelector<HTMLElement>(
    "ytd-watch-metadata #description-inline-expander #description-text"
  );
  if (descriptionElement) {
    videoDescription = descriptionElement.innerText?.trim() || "N/A";
  } else {
    // Fallback: Try to get from collapsed description
    const collapsedDescElement = document.querySelector<HTMLElement>(
      "ytd-watch-metadata #description.ytd-watch-metadata"
    );
    if (collapsedDescElement) {
      videoDescription = collapsedDescElement.innerText?.trim() || "N/A";
    } else {
      // Another fallback: Try meta description
      const metaDesc = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      if (metaDesc && metaDesc.content) {
        videoDescription = metaDesc.content.trim();
      }
    }
  }

  // Get video upload date from various possible locations
  let videoDate = "N/A";
  
  // Try multiple selectors to find upload date
  const dateSelectors = [
    "#info-strings yt-formatted-string:not([aria-label])",
    "#info #date yt-formatted-string",
    "#info-container #date-text",
    ".ytd-video-primary-info-renderer #info-strings yt-formatted-string",
    "ytd-video-primary-info-renderer #info #date yt-formatted-string"
  ];
  
  for (const selector of dateSelectors) {
    const dateElement = document.querySelector<HTMLElement>(selector);
    if (dateElement && dateElement.innerText) {
      const dateText = dateElement.innerText.trim();
      // Filter out view count and other non-date text
      if (dateText && !dateText.includes("views") && !dateText.includes("watching")) {
        videoDate = dateText;
        break;
      }
    }
  }

  return {
    videoTitle:
      document.querySelector<HTMLElement>("h1.style-scope.ytd-watch-metadata")
        ?.innerText || "N/A",
    channelName:
      document.querySelector<HTMLElement>("ytd-channel-name #text a")
        ?.innerText ||
      document.querySelector<HTMLElement>("#owner-name a.yt-simple-endpoint")
        ?.innerText ||
      "N/A",
    videoDuration:
      document.querySelector<HTMLElement>(".ytp-time-duration")?.innerText ||
      "N/A",
    videoDescription: videoDescription,
    videoDate: videoDate,
  };
}

/**
 * Extracts the transcript by scraping the DOM.
 * @returns {Promise<string>} A promise that resolves with the transcript text.
 */
async function getTranscriptFromDOM(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const moreActionsButton = document.querySelector<HTMLButtonElement>(
        "tp-yt-paper-button#expand"
      );
      if (moreActionsButton) {
        moreActionsButton.click();
        await new Promise((r) => setTimeout(r, 500));
      }

      const transcriptButton = document.querySelector<HTMLButtonElement>(
        'ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]'
      );
      if (transcriptButton) {
        transcriptButton.click();
        await new Promise((r) => setTimeout(r, 1500));
      }

      let transcriptSegments: NodeListOf<HTMLElement> =
        document.querySelectorAll("ytd-transcript-segment-renderer");
      let retries = 5;
      while (retries > 0 && transcriptSegments.length === 0) {
        transcriptSegments = document.querySelectorAll(
          "ytd-transcript-segment-renderer"
        );
        if (transcriptSegments.length > 0) break;
        await new Promise((r) => setTimeout(r, 500));
        retries--;
      }

      if (transcriptSegments.length > 0) {
        let fullTranscript = "";
        transcriptSegments.forEach((segment) => {
          const timestamp =
            segment
              .querySelector<HTMLElement>(".segment-timestamp")
              ?.innerText.trim() || "";
          const text =
            segment
              .querySelector<HTMLElement>(".segment-text")
              ?.innerText.trim() || "";
          if (text) {
            fullTranscript += `[${timestamp}] ${text}\n`;
          }
        });
        resolve(fullTranscript.trim());
      } else {
        reject(
          new Error(
            "Could not find transcript segments via DOM. The video may not have a transcript."
          )
        );
      }
    } catch (error) {
      reject(
        new Error(
          "An unexpected error occurred while scraping the transcript from the page."
        )
      );
    }
  });
}

/**
 * Extracts the transcript using YouTube's internal player data.
 * @returns {Promise<string>} A promise that resolves with the transcript text.
 */
async function getTranscriptFromApi(): Promise<string> {
  const playerResponse = await getPlayerResponse();
  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks found in player data.");
  }

  const transcriptInfo =
    captionTracks.find((track: CaptionTrack) => track.languageCode === "en") ||
    captionTracks[0];
  const response = await fetch(transcriptInfo.baseUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript XML: ${response.statusText}`);
  }
  const xmlText = await response.text();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const textNodes = xmlDoc.getElementsByTagName("text");

  let fullTranscript = "";
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const start = parseFloat(node.getAttribute("start")!);
    const text = node.textContent!;
    const minutes = Math.floor(start / 60);
    const seconds = Math.floor(start % 60)
      .toString()
      .padStart(2, "0");
    fullTranscript += `[${minutes}:${seconds}] ${text
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim()}\n`;
  }
  return fullTranscript.trim();
}

/**
 * Injects a script to access the `ytInitialPlayerResponse` object from the page.
 * @returns {Promise<PlayerResponse>} A promise that resolves with the player response data.
 */
function getPlayerResponse(): Promise<PlayerResponse> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injector.bundle.js");
    script.onload = () => script.remove();
    script.onerror = () =>
      reject(new Error("Failed to load the injector script."));
    (document.head || document.documentElement).appendChild(script);

    const messageListener = (event: MessageEvent) => {
      if (event.source === window && event.data?.type === "FROM_PAGE") {
        window.removeEventListener("message", messageListener);
        const message = event.data as PageResponseMessage;
        if (message.error) {
          reject(new Error(`Injector script error: ${message.error}`));
        } else if (message.payload) {
          resolve(message.payload);
        } else {
          reject(new Error("Could not find ytInitialPlayerResponse."));
        }
      }
    };
    window.addEventListener("message", messageListener);
    setTimeout(() => {
      window.removeEventListener("message", messageListener);
      reject(new Error("Timeout waiting for player data."));
    }, 5000);
  });
}

// --- 4. Initialization ---

let currentVideoId: string | null = null;

function resetAndInjectUI() {
  const videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) {
    // Not a video page, do nothing.
    return;
  }

  const uiContainer = document.getElementById("summarize-ui-container");

  if (videoId !== currentVideoId) {
    // This is a new video page.
    currentVideoId = videoId;

    // Remove old UI if it exists from a previous page.
    if (uiContainer) {
      uiContainer.remove();
    }
    const summaryWrapper = document.getElementById("summary-wrapper");
    if (summaryWrapper) {
      summaryWrapper.remove();
    }
    // Also remove any orphaned button container
    const buttonContainer = document.getElementById("summary-button-container");
    if (buttonContainer) {
      buttonContainer.remove();
    }

    // Inject fresh UI.
    injectSummarizeUI();
  } else {
    // This is the same video page.
    // Check if the UI is missing and needs to be re-injected.
    if (!uiContainer && document.querySelector("#below")) {
      injectSummarizeUI();
    }
  }
}

/**
 * Use a MutationObserver to detect when navigation to a new video page occurs.
 */
const observer = new MutationObserver(resetAndInjectUI);

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial run on page load
resetAndInjectUI();

// Listen for messages from the popup and background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_VIDEO_METADATA") {
    const metadata = getVideoMetadata();
    sendResponse({ payload: metadata });
  } else if (request.type === "streamingChunk") {
    // Handle streaming chunk from background script
    handleStreamingChunk(request.payload);
  } else if (request.type === "streamingComplete") {
    // Handle streaming completion - this is sent by background script after streaming is done
    
    const button = document.getElementById("summarize-btn") as HTMLButtonElement;
    button.innerText = "✨ Summarize";
    button.disabled = false;
    
    // Clean up streaming indicator CSS
    const streamingCSS = document.getElementById('streaming-css');
    if (streamingCSS) {
      streamingCSS.remove();
    }
    
    // Scroll to summary container once complete
    setTimeout(() => scrollToSummary(), 100);
  }
});

// Listen for messages from fullscreen windows
window.addEventListener("message", (event) => {
  if (event.data?.type === 'seekToTime') {
    const seconds = event.data.seconds;
    const player = document.querySelector<HTMLVideoElement>("video");
    if (player && typeof seconds === 'number') {
      player.currentTime = seconds;
    }
  }
});

// --- Question Input Field Functions ---

/**
 * Creates the question input field for "Ask a Question" preset
 */
function createQuestionInput(): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.id = "question-input";
  textarea.placeholder = "What would you like to ask about this video?";
  textarea.classList.add("summary-select", "question-textarea");
  textarea.rows = 3;
  textarea.style.display = "none";
  textarea.style.resize = "vertical";
  textarea.style.minHeight = "80px";
  textarea.style.maxHeight = "200px";
  textarea.style.width = "100%";
  textarea.style.boxSizing = "border-box";
  textarea.style.fontFamily = "inherit";
  textarea.style.fontSize = "14px";
  textarea.style.lineHeight = "1.4";
  textarea.style.padding = "8px";
  textarea.style.border = "1px solid #d3d3d3";
  textarea.style.borderRadius = "4px";
  textarea.style.backgroundColor = "var(--yt-spec-general-background-a)";
  textarea.style.color = "var(--yt-spec-text-primary)";
  // Ensure it's on its own line, positioned after summary
  textarea.style.clear = "both";
  textarea.style.marginTop = "0";
  textarea.style.marginBottom = "0";
  textarea.style.position = "relative";
  textarea.style.zIndex = "10"; // Lower than toolbar (z-index: 1000) but higher than default
  return textarea;
}

/**
 * Shows or hides the question input field
 */
function showQuestionInput(show: boolean): void {
  const questionInput = document.getElementById("question-input") as HTMLTextAreaElement;
  if (questionInput) {
    questionInput.style.display = show ? "block" : "none";
  }
}

/**
 * Updates button text based on selected preset
 */
function updateButtonText(presetId: string): void {
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;
  if (button) {
    if (presetId === "custom_query") {
      button.innerText = "❓ Ask Question";
    } else {
      button.innerText = "✨ Summarize";
    }
  }
}

/**
 * Gets the question text from the input field
 */
function getQuestionText(): string {
  const questionInput = document.getElementById("question-input") as HTMLTextAreaElement;
  return questionInput ? questionInput.value.trim() : "";
}

/**
 * Validates if question text is not empty
 */
function validateQuestion(question: string): boolean {
  return question.trim().length > 0;
}
