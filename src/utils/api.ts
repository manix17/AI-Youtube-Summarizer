import type {
  Platform,
  Profile,
  ApiConfig,
  ApiRequestPayload,
  ApiResponse,
  ApiErrorResponse,
  OpenAIRequest,
  AnthropicRequest,
  GeminiRequest,
  OpenAIResponse,
  AnthropicResponse,
  GeminiResponse,
} from "../types";

/**
 * Returns the API configuration for a given platform.
 * @param {Platform} platform - The AI platform (e.g., 'openai', 'gemini').
 * @param {string} model - The specific model name.
 * @returns {ApiConfig} The configuration object for the platform.
 */
function getApiConfig(platform: Platform, model: string): ApiConfig {
  const configs: Record<Platform, ApiConfig> = {
    openai: {
      url: "https://api.openai.com/v1/chat/completions",
    },
    anthropic: {
      url: "https://api.anthropic.com/v1/messages",
    },
    gemini: {
      url: `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`,
    },
  };
  return configs[platform];
}

/**
 * Builds the request payload for the specified AI platform.
 * @param {Platform} platform - The AI platform.
 * @param {string} model - The AI model.
 * @param {string} systemPrompt - The system prompt.
 * @param {string} userPrompt - The user prompt.
 * @returns {ApiRequestPayload} The request payload.
 */
function buildRequestPayload(
  platform: Platform,
  model: string,
  systemPrompt: string,
  userPrompt: string
): ApiRequestPayload {
  switch (platform) {
    case "openai":
      return {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      } as OpenAIRequest;
    case "anthropic":
      return {
        model: model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 4096,
      } as AnthropicRequest;
    case "gemini":
      return {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
      } as GeminiRequest;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Builds the request headers for the specified AI platform.
 * @param {Platform} platform - The AI platform.
 * @param {string} apiKey - The user's API key.
 * @returns {Record<string, string>} The request headers.
 */
function buildRequestHeaders(
  platform: Platform,
  apiKey: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  switch (platform) {
    case "openai":
      headers["Authorization"] = `Bearer ${apiKey}`;
      break;
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "gemini":
      // API key is sent in the URL for Gemini
      break;
  }
  return headers;
}

/**
 * Extracts the summary from the API response.
 * @param {Platform} platform - The AI platform.
 * @param {ApiResponse} data - The response data from the API.
 * @returns {string} The summary text.
 */
function extractSummaryFromResponse(
  platform: Platform,
  data: ApiResponse
): string {
  try {
    switch (platform) {
      case "openai":
        return (data as OpenAIResponse).choices[0].message.content;
      case "anthropic":
        return (data as AnthropicResponse).content[0].text;
      case "gemini":
        const geminiData = data as GeminiResponse;
        if (!geminiData.candidates || geminiData.candidates.length === 0) {
          if (
            geminiData.promptFeedback &&
            geminiData.promptFeedback.blockReason
          ) {
            throw new Error(
              `API blocked the prompt due to: ${geminiData.promptFeedback.blockReason}`
            );
          }
          throw new Error("API did not return any summary candidates.");
        }
        return geminiData.candidates[0].content.parts[0].text;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error("Error extracting summary:", error, "Full response:", data);
    throw new Error("Could not parse summary from API response.");
  }
}

/**
 * Handles API errors and returns a user-friendly message.
 * @param {Platform} platform - The AI platform.
 * @param {ApiErrorResponse} errorData - The error data from the API response.
 * @param {number} status - The HTTP status code.
 * @returns {string} A formatted error message.
 */
function handleApiError(
  platform: Platform,
  errorData: ApiErrorResponse,
  status: number
): string {
  let message = `API Error (${status}): `;
  try {
    switch (platform) {
      case "openai":
        message += errorData.error?.message || JSON.stringify(errorData);
        break;
      case "anthropic":
        message += errorData.error?.message || JSON.stringify(errorData);
        if (errorData.error?.type === "authentication_error") {
          message =
            "Authentication failed. Please check your Anthropic API key.";
        }
        break;
      case "gemini":
        message += errorData.error?.message || JSON.stringify(errorData);
        if (errorData.error?.message?.includes("API key not valid")) {
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
 * @param {Profile} profile - The user's current profile settings.
 * @param {string} transcript - The video transcript.
 * @param {string} videoTitle - The title of the video.
 * @param {string} videoDuration - The duration of the video.
 * @param {string} channelName - The name of the channel.
 * @returns {Promise<string>} A promise that resolves with the summary.
 */
export async function generateSummary(
  profile: Profile,
  transcript: string,
  videoTitle: string,
  videoDuration: string,
  channelName: string
): Promise<string> {
  const { platform, model, apiKey, systemPrompt, userPrompt } = profile;

  let finalUserPrompt = userPrompt
    .replace("{transcript}", transcript)
    .replace("{video_title}", videoTitle)
    .replace("{video_duration}", videoDuration)
    .replace("{channel_name}", channelName);

  const apiConfig = getApiConfig(platform, model);
  let apiUrl = apiConfig.url;
  if (platform === "gemini") {
    apiUrl += `?key=${apiKey}`;
  }

  const payload = buildRequestPayload(
    platform,
    model,
    systemPrompt,
    finalUserPrompt
  );
  const headers = buildRequestHeaders(platform, apiKey);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const data: ApiResponse | ApiErrorResponse = await response.json();

    if (!response.ok) {
      const errorMessage = handleApiError(
        platform,
        data as ApiErrorResponse,
        response.status
      );
      throw new Error(errorMessage);
    }

    return extractSummaryFromResponse(platform, data as ApiResponse);
  } catch (error) {
    console.error("Error during summarization:", error);
    // Re-throw the error to be caught by the caller
    if (error instanceof Error) {
      throw new Error(`Could not generate summary. ${error.message}`);
    }
    throw new Error("An unknown error occurred during summarization.");
  }
}
