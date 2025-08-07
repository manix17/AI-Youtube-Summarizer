// src/background/index.ts

import * as apiTester from "../utils/api_tester";
import { generateSummary } from "../utils/api";
import { trackSummarization } from "../utils/usage_tracker";
import type {
  BackgroundRequest,
  TestApiKeyRequest,
  SummarizeRequest,
  AppStorage,
  SummarizeResponseMessage,
  TestResult,
} from "../types";

/**
 * Handles messages sent from other parts of the extension.
 * @param {BackgroundRequest} request - The message request object.
 * @param {chrome.runtime.MessageSender} sender - The sender of the message.
 * @param {(response?: any) => void} sendResponse - The function to call to send a response.
 * @returns {boolean} - Returns true to indicate an asynchronous response.
 */
function handleMessages(
  request: BackgroundRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  switch (request.type) {
    case "testApiKey":
      handleTestApiKey(request, sendResponse);
      return true;
    case "summarize":
      handleSummarize(request, sendResponse);
      return true;
    default:
      // Optional: handle unknown request types
      return false;
  }
}

/**
 * Handles the testApiKey action.
 * @param {TestApiKeyRequest} request - The message request object.
 * @param {(response?: TestResult) => void} sendResponse - The function to call to send a response.
 */
function handleTestApiKey(
  request: TestApiKeyRequest,
  sendResponse: (response: TestResult) => void
): void {
  if (!request.payload) {
    sendResponse({ success: false, error: "Invalid request payload" });
    return;
  }
  const { platform, apiKey } = request.payload;
  let testPromise;

  if (platform === "openai") {
    testPromise = apiTester.testOpenApiKey(apiKey);
  } else if (platform === "anthropic") {
    testPromise = apiTester.testAnthropicApiKey(apiKey);
  } else if (platform === "gemini") {
    testPromise = apiTester.testGeminiApiKey(apiKey);
  } else if (platform === "openrouter") {
    testPromise = apiTester.testOpenRouterApiKey(apiKey);
  } else {
    sendResponse({ success: false, error: "Invalid platform" });
    return;
  }

  testPromise.then(sendResponse).catch((error: Error) => {
    sendResponse({ success: false, error: error.message });
  });
}

/**
 * Handles the summarize action.
 * @param {SummarizeRequest} request - The message request object.
 * @param {(response: SummarizeResponseMessage) => void} sendResponse - The function to call to send a response.
 */
async function handleSummarize(
  request: SummarizeRequest,
  sendResponse: (response: SummarizeResponseMessage) => void
): Promise<void> {
  if (
    !request.payload ||
    !request.payload.transcript ||
    request.payload.transcript.trim() === ""
  ) {
    sendResponse({
      type: "summarizeResponse",
      error: "Could not find a transcript for this video.",
    });
    return;
  }

  try {
    const { profileId, presetId } = request.payload;

    // 1. Load default prompts
    const promptsRes = await fetch(chrome.runtime.getURL("assets/prompts.json"));
    const defaultPrompts = await promptsRes.json();

    // 2. Load all storage data to reconstruct the profile properly
    const allStorageData = await chrome.storage.sync.get(null);
    const userProfile = allStorageData[`profile_${profileId}`] as any;

    if (!userProfile) {
      throw new Error(`Profile "${profileId}" not found.`);
    }

    // Migration: Handle old profiles that have apiKey instead of apiKeys
    if (!userProfile.apiKeys && userProfile.apiKey !== undefined) {
      userProfile.apiKeys = {
        openai: "",
        anthropic: "",
        gemini: "",
        openrouter: "",
      };
      // If there was an old apiKey, put it in the current platform
      if (userProfile.apiKey) {
        userProfile.apiKeys[userProfile.platform] = userProfile.apiKey;
      }
    }

    // Ensure apiKeys exists
    if (!userProfile.apiKeys) {
      userProfile.apiKeys = {
        openai: "",
        anthropic: "",
        gemini: "",
        openrouter: "",
      };
    }

    // Check if API key exists for the selected platform
    const currentApiKey = userProfile.apiKeys[userProfile.platform];
    if (!currentApiKey) {
      throw new Error(`API key for ${userProfile.platform} provider is missing in profile "${profileId}".`);
    }

    // 3. Reconstruct the full profile using the same logic as options page
    const fullPresets = JSON.parse(JSON.stringify(defaultPrompts.presets));
    
    // Mark all default presets and check for individual overrides
    for (const key in fullPresets) {
      fullPresets[key].isDefault = true;
      // Check if there's an individual preset stored for this default preset
      const individualPresetKey = `profile_${profileId}_${key}`;
      if (allStorageData[individualPresetKey]) {
        // Individual preset data takes precedence
        Object.assign(fullPresets[key], allStorageData[individualPresetKey]);
      }
    }

    // Scan for any individual preset keys that belong to this profile
    // This loads both modified defaults and custom presets
    for (const storageKey in allStorageData) {
      if (storageKey.startsWith(`profile_${profileId}_`)) {
        const presetId = storageKey.replace(`profile_${profileId}_`, '');
        const presetData = allStorageData[storageKey];
        
        // Skip if this is not a preset object, if we already processed it, or if it's empty
        if (!presetData || typeof presetData !== 'object' || 
            !presetData.hasOwnProperty('system_prompt') || 
            fullPresets[presetId] ||
            !presetId || presetId.length === 0) {
          continue;
        }
        
        // Add this preset to our collection (custom presets will be added here)
        fullPresets[presetId] = presetData;
      }
    }

    const fullProfile = {
      ...userProfile,
      presets: fullPresets,
      currentPreset: presetId, // Set the preset selected by the user
    };

    // 4. Generate the summary with the full profile
    const result = await generateSummary(
      fullProfile,
      request.payload.transcript,
      request.payload.videoTitle,
      request.payload.videoDuration,
      request.payload.channelName,
      request.payload.videoDescription,
      request.payload.language
    );

    // 5. Track token usage for this summarization
    try {
      const preset = fullProfile.presets[fullProfile.currentPreset];
      if (preset) {
        await trackSummarization(
          fullProfile.platform,
          preset.system_prompt,
          preset.user_prompt,
          request.payload.transcript,
          result.summary,
          result.tokenUsage
        );
      }
    } catch (trackingError) {
      console.warn("Failed to track token usage:", trackingError);
    }

    sendResponse({ type: "summarizeResponse", payload: { summary: result.summary } });
  } catch (error) {
    console.error("Error in handleSummarize:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    sendResponse({ type: "summarizeResponse", error: `Error: ${message}` });
  }
}

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener(handleMessages);
