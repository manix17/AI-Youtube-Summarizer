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

    // 2. Load the user's lean profile from storage
    const profileKey = `profile_${profileId}`;
    const storageData = (await chrome.storage.sync.get(profileKey)) as {
      [key: string]: any;
    };
    const userProfile = storageData[profileKey];

    if (!userProfile || !userProfile.apiKey) {
      throw new Error(`API key for profile "${profileId}" is missing.`);
    }

    // 3. Reconstruct the full profile
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

    const fullProfile = {
      ...userProfile,
      presets: fullPresets,
      currentPreset: presetId, // Set the preset selected by the user
    };

    // 4. Generate the summary with the full profile
    const summary = await generateSummary(
      fullProfile,
      request.payload.transcript,
      request.payload.videoTitle,
      request.payload.videoDuration,
      request.payload.channelName,
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
          summary
        );
      }
    } catch (trackingError) {
      console.warn("Failed to track token usage:", trackingError);
    }

    sendResponse({ type: "summarizeResponse", payload: { summary } });
  } catch (error) {
    console.error("Error in handleSummarize:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    sendResponse({ type: "summarizeResponse", error: `Error: ${message}` });
  }
}

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener(handleMessages);
