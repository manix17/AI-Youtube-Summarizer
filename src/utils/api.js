// src/utils/api.js

/**
 * Returns the API configuration for a given platform.
 * @param {string} platform - The AI platform (e.g., 'openai', 'gemini').
 * @param {string} model - The specific model name.
 * @returns {object} The configuration object for the platform.
 */
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

/**
 * Builds the request payload for the specified AI platform.
 * @param {string} platform - The AI platform.
 * @param {string} model - The AI model.
 * @param {string} systemPrompt - The system prompt.
 * @param {string} userPrompt - The user prompt.
 * @returns {object} The request payload.
 */
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

/**
 * Builds the request headers for the specified AI platform.
 * @param {string} platform - The AI platform.
 * @param {string} apiKey - The user's API key.
 * @returns {object} The request headers.
 */
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

/**
 * Extracts the summary from the API response.
 * @param {string} platform - The AI platform.
 * @param {object} data - The response data from the API.
 * @returns {string} The summary text.
 */
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

/**
 * Handles API errors and returns a user-friendly message.
 * @param {string} platform - The AI platform.
 * @param {object} errorData - The error data from the API response.
 * @param {number} status - The HTTP status code.
 * @returns {string} A formatted error message.
 */
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

/**
 * The main summarization function that orchestrates the API call.
 * @param {object} profile - The user's current profile settings.
 * @param {string} transcript - The video transcript.
 * @param {string} videoTitle - The title of the video.
 * @param {string} videoDuration - The duration of the video.
 * @param {string} channelName - The name of the channel.
 * @returns {Promise<string>} A promise that resolves with the summary.
 */
export async function generateSummary(profile, transcript, videoTitle, videoDuration, channelName) {
    const { platform, model, apiKey, systemPrompt, userPrompt } = profile;
    
    let finalUserPrompt = userPrompt
        .replace('{transcript}', transcript)
        .replace('{video_title}', videoTitle)
        .replace('{video_duration}', videoDuration)
        .replace('{channel_name}', channelName);

    const apiConfig = getApiConfig(platform, model);
    let apiUrl = apiConfig.url;
    if (platform === 'gemini') {
        apiUrl += `?key=${apiKey}`;
    }

    const payload = buildRequestPayload(platform, model, systemPrompt, finalUserPrompt);
    const headers = buildRequestHeaders(platform, apiKey);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = handleApiError(platform, data, response.status);
            throw new Error(errorMessage);
        }

        return extractSummaryFromResponse(platform, data);
    } catch (error) {
        console.error("Error during summarization:", error);
        // Re-throw the error to be caught by the caller
        throw new Error(`Could not generate summary. ${error.message}`);
    }
}
