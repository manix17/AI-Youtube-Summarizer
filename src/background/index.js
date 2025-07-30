// src/background/index.js

import * as apiTester from '../utils/api_tester.js';
import { generateSummary } from '../utils/api.js';

/**
 * Handles messages sent from other parts of the extension.
 * @param {object} request - The message request object.
 * @param {object} sender - The sender of the message.
 * @param {function} sendResponse - The function to call to send a response.
 * @returns {boolean} - Returns true to indicate an asynchronous response.
 */
function handleMessages(request, sender, sendResponse) {
    if (request.action === "testApiKey") {
        handleTestApiKey(request, sendResponse);
        return true;
    }

    if (request.action === "summarize") {
        handleSummarize(request, sendResponse);
        return true;
    }
}

/**
 * Handles the testApiKey action.
 * @param {object} request - The message request object.
 * @param {function} sendResponse - The function to call to send a response.
 */
function handleTestApiKey(request, sendResponse) {
    const { platform, apiKey } = request;
    let testPromise;

    if (platform === 'openai') {
        testPromise = apiTester.testOpenApiKey(apiKey);
    } else if (platform === 'anthropic') {
        testPromise = apiTester.testAnthropicApiKey(apiKey);
    } else if (platform === 'gemini') {
        testPromise = apiTester.testGeminiApiKey(apiKey);
    } else {
        sendResponse({ success: false, error: 'Invalid platform' });
        return;
    }

    testPromise.then(sendResponse).catch(error => {
        sendResponse({ success: false, error: error.message });
    });
}

/**
 * Handles the summarize action.
 * @param {object} request - The message request object.
 * @param {function} sendResponse - The function to call to send a response.
 */
async function handleSummarize(request, sendResponse) {
    if (!request.transcript || request.transcript.trim() === "") {
        sendResponse({ summary: "Error: Could not find a transcript for this video." });
        return;
    }

    try {
        const { profiles, currentProfile } = await chrome.storage.sync.get(['profiles', 'currentProfile']);

        if (!profiles || !currentProfile) {
            throw new Error("No profiles found. Please configure the extension options.");
        }

        const profile = profiles[currentProfile];
        if (!profile || !profile.apiKey) {
            throw new Error(`API key for ${profile.name} profile is missing.`);
        }

        const summary = await generateSummary(
            profile,
            request.transcript,
            request.videoTitle,
            request.videoDuration,
            request.channelName
        );
        
        sendResponse({ summary });

    } catch (error) {
        console.error("Error in handleSummarize:", error);
        sendResponse({ summary: `Error: ${error.message}` });
    }
}

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener(handleMessages);