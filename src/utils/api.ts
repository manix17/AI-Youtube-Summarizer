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
  SummaryChunk,
  TokenUsageResult,
} from "../types";
import { PlatformConfigs } from "../types";
import platformConfigsData from "../assets/platform_configs.json";

const platformConfigs: PlatformConfigs = platformConfigsData;

/**
 * Maps simplified Anthropic model names to their full API model names.
 * Uses the apiName field from platform_configs.json if available.
 */
function getAnthropicApiModelName(model: string): string {
  const anthropicModel = platformConfigs.anthropic.models.find(m => m.value === model);
  return anthropicModel?.apiName || model;
}

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
        model: getAnthropicApiModelName(model),
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
      headers["anthropic-dangerous-direct-browser-access"] = "true";
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
 * @param {string} videoDescription - The description of the video.
 * @param {string} language - The target language for the summary.
 * @param {string} videoDate - The upload date of the video (optional, defaults to "N/A").
 * @returns {Promise<SummaryResult>} A promise that resolves with the summary and token usage.
 */
export async function generateSummary(
  profile: Profile,
  transcript: string,
  videoTitle: string,
  videoDuration: string,
  channelName: string,
  videoDescription: string,
  language: string,
  videoDate: string = "N/A",
  question: string = ""
): Promise<SummaryResult> {
  const { platform, models, apiKeys, presets, currentPreset } = profile;
  const apiKey = apiKeys[platform];
  const model = models[platform];
  
  if (!apiKey) {
    throw new Error(`API key for ${platform} provider is missing.`);
  }
  
  if (!model) {
    throw new Error(`Model for ${platform} provider is missing.`);
  }
  
  const preset = presets[currentPreset];
  if (!preset) {
    throw new Error(`Selected prompt preset "${currentPreset}" not found.`);
  }
  const { system_prompt: systemPrompt, user_prompt: userPrompt } = preset;

  // Generate current timestamp
  const currentTimestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  let finalUserPrompt = userPrompt
    .replace("{VIDEO_TRANSCRIPT}", transcript)
    .replace("{VIDEO_TITLE}", videoTitle)
    .replace("{VIDEO_DURATION}", videoDuration)
    .replace("{CHANNEL_NAME}", channelName)
    .replace("{VIDEO_DESCRIPTION}", videoDescription)
    .replace("{TARGET_LANGUAGE}", language)
    .replace("{CURRENT_TIMESTAMP}", currentTimestamp)
    .replace("{VIDEO_DATE}", videoDate || "N/A")
    .replace("{VIDEO_ASK_A_QUESTION}", question || "");

  const apiConfig = getApiConfig(platform, model);
  let apiUrl = apiConfig.url;
  if (platform === "gemini") {
    apiUrl += `?key=${apiKey}`;
  }

  // Find the model configuration to check for a model-specific temperature
  const platformConfig = platformConfigs[platform as keyof typeof platformConfigs];
  const modelConfig = platformConfig.models.find(m => m.value === model);

  // A model-specific temperature overrides the preset temperature
  const temperature = modelConfig?.temperature ?? preset.temperature;

  const payload = buildRequestPayload(
    platform,
    model,
    systemPrompt,
    finalUserPrompt,
    temperature
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

/**
 * Builds streaming request payload for supported platforms
 * @param {Platform} platform - The AI platform.
 * @param {string} model - The model name.
 * @param {string} systemPrompt - The system prompt.
 * @param {string} userPrompt - The user prompt.
 * @param {number} temperature - The response temperature.
 * @returns {ApiRequestPayload} The formatted request payload with streaming enabled.
 */
function buildStreamingRequestPayload(
  platform: Platform,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): ApiRequestPayload {
  const basePayload = buildRequestPayload(platform, model, systemPrompt, userPrompt, temperature);
  
  switch (platform) {
    case "openai":
    case "openrouter":
      return {
        ...basePayload,
        stream: true
      };
    case "anthropic":
      return {
        ...basePayload,
        stream: true
      };
    case "gemini":
      // Gemini streaming uses alt=sse URL parameter, payload stays the same
      return basePayload;
    default:
      return basePayload;
  }
}

/**
 * Parses a streaming chunk based on the platform
 * @param {Platform} platform - The AI platform.
 * @param {string} chunk - Raw chunk data.
 * @returns {SummaryChunk | null} Parsed chunk or null if not valid.
 */
function parseStreamingChunk(platform: Platform, chunk: string): SummaryChunk | null {
  try {
    // Remove "data: " prefix if present
    const cleanChunk = chunk.replace(/^data:\s*/, '').trim();
    
    if (cleanChunk === '[DONE]' || cleanChunk === '') {
      return { content: '', isComplete: true };
    }

    const data = JSON.parse(cleanChunk);

    switch (platform) {
      case "openai":
      case "openrouter":
        if (data.choices && data.choices[0] && data.choices[0].delta) {
          const deltaContent = data.choices[0].delta.content || '';
          const isComplete = data.choices[0].finish_reason !== null;
          return {
            content: deltaContent,
            isComplete,
            tokenUsage: data.usage ? {
              inputTokens: data.usage.prompt_tokens || 0,
              outputTokens: data.usage.completion_tokens || 0
            } : undefined
          };
        }
        break;
        
      case "anthropic":
        if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
          return {
            content: data.delta.text,
            isComplete: false
          };
        } else if (data.type === 'message_stop') {
          return {
            content: '',
            isComplete: true,
            tokenUsage: data.usage ? {
              inputTokens: data.usage.input_tokens || 0,
              outputTokens: data.usage.output_tokens || 0
            } : undefined
          };
        }
        break;
        
      case "gemini":
        // Gemini streaming format with streamGenerateContent and alt=sse
        if (data.candidates && data.candidates.length > 0) {
          const candidate = data.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const deltaContent = candidate.content.parts[0].text || '';
            // With streamGenerateContent, chunks should be incremental until finishReason appears
            const isComplete = candidate.finishReason !== undefined && candidate.finishReason !== null;
            return {
              content: deltaContent,
              isComplete,
              tokenUsage: data.usageMetadata ? {
                inputTokens: data.usageMetadata.promptTokenCount || 0,
                outputTokens: data.usageMetadata.candidatesTokenCount || 0
              } : undefined
            };
          }
        }
        
        // Check for completion indicators
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          return {
            content: '',
            isComplete: true,
            error: `Content blocked: ${data.promptFeedback.blockReason}`
          };
        }
        
        break;
        
      default:
        return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing streaming chunk:', error, 'Chunk:', chunk);
    return null;
  }
}

/**
 * Streaming version of generateSummary that yields chunks as they arrive
 * @param {Profile} profile - The user's current profile settings.
 * @param {string} transcript - The video transcript.
 * @param {string} videoTitle - The title of the video.
 * @param {string} videoDuration - The duration of the video.
 * @param {string} channelName - The name of the channel.
 * @param {string} videoDescription - The description of the video.
 * @param {string} language - The target language for the summary.
 * @param {string} videoDate - The upload date of the video (optional, defaults to "N/A").
 * @param {function} onChunk - Callback function called for each chunk of data.
 * @returns {Promise<SummaryResult>} A promise that resolves with the complete summary and token usage.
 */
export async function generateSummaryStreaming(
  profile: Profile,
  transcript: string,
  videoTitle: string,
  videoDuration: string,
  channelName: string,
  videoDescription: string,
  language: string,
  videoDate: string = "N/A",
  onChunk: (chunk: SummaryChunk) => void,
  question: string = ""
): Promise<SummaryResult> {
  const { platform, models, apiKeys, presets, currentPreset } = profile;
  const apiKey = apiKeys[platform];
  const model = models[platform];
  
  if (!apiKey) {
    throw new Error(`API key for ${platform} provider is missing.`);
  }
  
  if (!model) {
    throw new Error(`Model for ${platform} provider is missing.`);
  }
  
  const preset = presets[currentPreset];
  if (!preset) {
    throw new Error(`Selected prompt preset "${currentPreset}" not found.`);
  }
  const { system_prompt: systemPrompt, user_prompt: userPrompt } = preset;

  // Generate current timestamp
  const currentTimestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  let finalUserPrompt = userPrompt
    .replace("{VIDEO_TRANSCRIPT}", transcript)
    .replace("{VIDEO_TITLE}", videoTitle)
    .replace("{VIDEO_DURATION}", videoDuration)
    .replace("{CHANNEL_NAME}", channelName)
    .replace("{VIDEO_DESCRIPTION}", videoDescription)
    .replace("{TARGET_LANGUAGE}", language)
    .replace("{CURRENT_TIMESTAMP}", currentTimestamp)
    .replace("{VIDEO_DATE}", videoDate || "N/A")
    .replace("{VIDEO_ASK_A_QUESTION}", question || "");

  const apiConfig = getApiConfig(platform, model);
  let apiUrl = apiConfig.url;
  if (platform === "gemini") {
    // Gemini streaming uses streamGenerateContent endpoint with alt=sse parameter
    apiUrl = apiUrl.replace(':generateContent', ':streamGenerateContent');
    apiUrl += `?key=${apiKey}&alt=sse`;
  }

  // Find the model configuration to check for a model-specific temperature
  const platformConfig = platformConfigs[platform as keyof typeof platformConfigs];
  const modelConfig = platformConfig.models.find(m => m.value === model);

  // A model-specific temperature overrides the preset temperature
  const temperature = modelConfig?.temperature ?? preset.temperature;

  const payload = buildStreamingRequestPayload(
    platform,
    model,
    systemPrompt,
    finalUserPrompt,
    temperature
  );
  const headers = buildRequestHeaders(platform, apiKey);


  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = handleApiError(platform, errorData, response.status);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error("No response body received for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullSummary = '';
    let tokenUsage: TokenUsageResult | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          const parsedChunk = parseStreamingChunk(platform, line);
          if (parsedChunk) {
            if (parsedChunk.content) {
              fullSummary += parsedChunk.content;
            }
            if (parsedChunk.tokenUsage) {
              tokenUsage = parsedChunk.tokenUsage;
            }
            
            // Call the chunk callback
            onChunk({
              content: parsedChunk.content,
              isComplete: parsedChunk.isComplete,
              tokenUsage: parsedChunk.tokenUsage
            });

            if (parsedChunk.isComplete) {
              break;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { summary: fullSummary, tokenUsage };
  } catch (error) {
    console.error("Error during streaming summarization:", error);
    if (error instanceof Error) {
      throw new Error(`Could not generate streaming summary. ${error.message}`);
    }
    throw new Error("An unknown error occurred during streaming summarization.");
  }
}
