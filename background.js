// background.js
import * as apiTester from './api_tester.js';

// --- Helper Functions for API Calls ---

function getApiConfig(platform, model) {
    const configs = {
        openai: {
            url: 'https://api.openai.com/v1/chat/completions'
        },
        anthropic: {
            url: 'https://api.anthropic.com/v1/messages'
        },
        gemini: {
            url: `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`
        }
    };
    return configs[platform];
}

function buildRequestPayload(platform, model, systemPrompt, userPrompt) {
    switch (platform) {
        case 'openai':
            return {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            };
        case 'anthropic':
            return {
                model: model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: 4096
            };
        case 'gemini':
            return {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                    }
                ]
            };
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

function buildRequestHeaders(platform, apiKey) {
    const headers = { 'Content-Type': 'application/json' };
    switch (platform) {
        case 'openai':
            headers['Authorization'] = `Bearer ${apiKey}`;
            break;
        case 'anthropic':
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            break;
        case 'gemini':
            // API key is sent in the URL for Gemini
            break;
    }
    return headers;
}

function extractSummaryFromResponse(platform, data) {
    try {
        switch (platform) {
            case 'openai':
                return data.choices[0].message.content;
            case 'anthropic':
                return data.content[0].text;
            case 'gemini':
                if (!data.candidates || data.candidates.length === 0) {
                    if (data.promptFeedback && data.promptFeedback.blockReason) {
                        throw new Error(`API blocked the prompt due to: ${data.promptFeedback.blockReason}`);
                    }
                    throw new Error("API did not return any summary candidates.");
                }
                return data.candidates[0].content.parts[0].text;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    } catch (error) {
        console.error('Error extracting summary:', error, 'Full response:', data);
        throw new Error('Could not parse summary from API response.');
    }
}

function handleApiError(platform, errorData, status) {
    let message = `API Error (${status}): `;
    try {
        switch (platform) {
            case 'openai':
                message += errorData.error?.message || JSON.stringify(errorData);
                break;
            case 'anthropic':
                message += errorData.error?.message || JSON.stringify(errorData);
                if (errorData.error?.type === 'authentication_error') {
                    message = 'Authentication failed. Please check your Anthropic API key.';
                }
                break;
            case 'gemini':
                message += errorData.error?.message || JSON.stringify(errorData);
                if (errorData.error?.message.includes("API key not valid")) {
                    message = "The provided Google Gemini API key is not valid.";
                }
                break;
            default:
                message += JSON.stringify(errorData);
        }
    } catch (e) {
        message += "Could not parse error response.";
    }
    return message;
}


// --- Main Event Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "testApiKey") {
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
            return false; // No async response
        }

        testPromise.then(result => {
            sendResponse(result);
        });

        return true; // Indicates that the response is sent asynchronously
    }

    if (request.action === "summarize") {
        if (!request.transcript || request.transcript.trim() === "") {
            sendResponse({ summary: "Error: Could not find a transcript for this video." });
            return true;
        }

        chrome.storage.sync.get(['profiles', 'currentProfile'], (result) => {
            if (!result.profiles || !result.currentProfile) {
                sendResponse({ summary: "Error: No profiles found. Please configure the extension options." });
                return;
            }

            const profile = result.profiles[result.currentProfile];
            if (!profile || !profile.apiKey) {
                sendResponse({ summary: `Error: API key for ${profile.name} profile is missing.` });
                return;
            }

            const { platform, model, apiKey, systemPrompt, userPrompt } = profile;
            let finalUserPrompt = userPrompt
                .replace('{transcript}', request.transcript)
                .replace('{video_title}', request.videoTitle)
                .replace('{video_duration}', request.videoDuration)
                .replace('{channel_name}', request.channelName);
            
            const apiConfig = getApiConfig(platform, model);
            let apiUrl = apiConfig.url;
            if (platform === 'gemini') {
                apiUrl += `?key=${apiKey}`;
            }

            const payload = buildRequestPayload(platform, model, systemPrompt, finalUserPrompt);
            const headers = buildRequestHeaders(platform, apiKey);

            fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        const errorMessage = handleApiError(platform, errorData, response.status);
                        throw new Error(errorMessage);
                    });
                }
                return response.json();
            })
            .then(data => {
                const summary = extractSummaryFromResponse(platform, data);
                sendResponse({ summary: summary });
            })
            .catch(error => {
                console.error("Error during summarization:", error);
                sendResponse({ summary: `Error: Could not generate summary. ${error.message}` });
            });
        });

        return true; // Keep the message channel open for the asynchronous response
    }
});
