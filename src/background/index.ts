// src/background/index.ts

import * as apiTester from "../utils/api_tester";
import { generateSummary } from "../utils/api";
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
    const profileKey = `profile_${profileId}`;
    const data = (await chrome.storage.sync.get(profileKey)) as {
      [key: string]: any;
    };

    const profile = data[profileKey];
    if (!profile || !profile.apiKey) {
      throw new Error(`API key for profile "${profileId}" is missing.`);
    }

    // Manually set the current preset for the generateSummary function
    profile.currentPreset = presetId;

    const summary = await generateSummary(
      profile,
      request.payload.transcript,
      request.payload.videoTitle,
      request.payload.videoDuration,
      request.payload.channelName
    );

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
