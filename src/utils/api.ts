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
  SummaryResult,
  TokenUsageResult,
} from "../types";

/**
 * Returns the API configuration for a given platform.
 * @param {Platform} platform - The AI platform (e.g., 'openai', 'anthropic', 'openrouter', 'gemini').
 * @param {string} model - The specific model name.
 * @returns {ApiConfig} The configuration object for the platform.
 */
function getApiConfig(platform: Platform, model: string): ApiConfig {
  const configs: Record<Platform, ApiConfig> = {
    openai: {
      url: "https://api.openai.com/v1/chat/completions",
    },
    openrouter: {
      url: "https://openrouter.ai/api/v1/chat/completions",
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
  userPrompt: string,
  temperature?: number
): ApiRequestPayload {
  switch (platform) {
    case "openai":
    case "openrouter":
      return {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: temperature,
      } as OpenAIRequest;
    case "anthropic":
      return {
        model: model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 4096,
        temperature: temperature,
      } as AnthropicRequest;
    case "gemini":
      return {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: temperature,
        },
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
    case "openrouter":
      headers["Authorization"] = `Bearer ${apiKey}`;
      headers["HTTP-Referer"] = "https://github.com/manix17/ai-youtube-summarizer";
      headers["X-Title"] = "AI YouTube Summarizer";
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
 * Extracts the summary and token usage from the API response.
 * @param {Platform} platform - The AI platform.
 * @param {ApiResponse} data - The response data from the API.
 * @returns {SummaryResult} The summary text and token usage.
 */
function extractSummaryFromResponse(
  platform: Platform,
  data: ApiResponse
): SummaryResult {
  try {
    let summary: string;
    let tokenUsage: TokenUsageResult | undefined;

    switch (platform) {
      case "openai":
      case "openrouter":
        const openaiData = data as OpenAIResponse;
        summary = openaiData.choices[0].message.content;
        if (openaiData.usage) {
          tokenUsage = {
            inputTokens: openaiData.usage.prompt_tokens,
            outputTokens: openaiData.usage.completion_tokens,
          };
        }
        break;
      case "anthropic":
        const anthropicData = data as AnthropicResponse;
        summary = anthropicData.content[0].text;
        if (anthropicData.usage) {
          tokenUsage = {
            inputTokens: anthropicData.usage.input_tokens,
            outputTokens: anthropicData.usage.output_tokens,
          };
        }
        break;
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
        summary = geminiData.candidates[0].content.parts[0].text;
        if (geminiData.usageMetadata) {
          // Include thoughts tokens in output since they're part of the reasoning process
          const thoughtsTokens = geminiData.usageMetadata.thoughtsTokenCount || 0;
          tokenUsage = {
            inputTokens: geminiData.usageMetadata.promptTokenCount,
            outputTokens: geminiData.usageMetadata.candidatesTokenCount + thoughtsTokens,
          };
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return { summary, tokenUsage };
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
      case "openrouter":
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
 * @returns {Promise<SummaryResult>} A promise that resolves with the summary and token usage.
 */
export async function generateSummary(
  profile: Profile,
  transcript: string,
  videoTitle: string,
  videoDuration: string,
  channelName: string,
  language: string
): Promise<SummaryResult> {
  const { platform, model, apiKey, presets, currentPreset } = profile;
  const preset = presets[currentPreset];
  if (!preset) {
    throw new Error(`Selected prompt preset "${currentPreset}" not found.`);
  }
  const { system_prompt: systemPrompt, user_prompt: userPrompt } = preset;

  let finalUserPrompt = userPrompt
    .replace("{VIDEO_TRANSCRIPT}", transcript)
    .replace("{VIDEO_TITLE}", videoTitle)
    .replace("{VIDEO_DURATION}", videoDuration)
    .replace("{CHANNEL_NAME}", channelName)
    .replace("{TARGET_LANGUAGE}", language);

  const apiConfig = getApiConfig(platform, model);
  let apiUrl = apiConfig.url;
  if (platform === "gemini") {
    apiUrl += `?key=${apiKey}`;
  }

  const payload = buildRequestPayload(
    platform,
    model,
    systemPrompt,
    finalUserPrompt,
    preset.temperature
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
