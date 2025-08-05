// src/types.ts

// Extend the Window interface to include properties set by YouTube
export interface YouTubeWindow extends Window {
  ytInitialPlayerResponse?: PlayerResponse;
}

// Core Data Structures
export interface VideoMetadata {
  videoTitle: string;
  channelName: string;
  videoDuration: string;
}

// --- Chrome Extension Message Passing ---

// Generic Message structure
export interface Message<T> {
  type: string;
  payload?: T;
  error?: string;
}

// Specific Payloads
export interface TestApiKeyPayload {
  platform: Platform;
  apiKey: string;
}

export interface SummarizePayload extends VideoMetadata {
  transcript: string;
  profileId: string;
  presetId: string;
  language: string;
}

// Specific Message Types
export type TestApiKeyRequest = Message<TestApiKeyPayload> & {
  type: "testApiKey";
};
export type SummarizeRequest = Message<SummarizePayload> & {
  type: "summarize";
};

// Union of all possible requests from client to background
export type BackgroundRequest = TestApiKeyRequest | SummarizeRequest;

// Responses
export type SummarizeResponseMessage = Message<{ summary?: string }>;
export type PageResponseMessage = Message<PlayerResponse>;

// --- Storage & Profiles ---
export interface AppStorage {
  profiles?: Record<string, Profile>;
  currentProfile?: string;
}

export interface Profile {
  name: string;
  platform: Platform;
  model: string;
  apiKey: string;
  language: string;
  presets: Record<string, PromptPreset>;
  currentPreset: string;
}

// Profile stored in Chrome storage (with minimal preset references)
export interface StoredProfile {
  name: string;
  platform: Platform;
  model: string;
  apiKey: string;
  language: string;
  presets: Record<string, PresetReference>;
  currentPreset: string;
}

// --- Options Page Specific Types ---
export interface PlatformConfig {
  name: string;
  className: string;
  models: { value: string; label: string }[];
}

export interface PromptPreset {
  name: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number;
  isDefault?: boolean;
}

// Minimal preset reference stored in profile (actual data stored separately)
export interface PresetReference {
  isDefault: boolean;
}

export interface PromptPresets {
  presets: {
    [key: string]: PromptPreset;
  };
}

export interface PlatformConfigs {
  [key: string]: PlatformConfig;
}

export interface DefaultPrompts {
  systemPrompt: string;
  userPrompt: string;
}

// --- AI & API Types ---
export type Platform = "openai" | "anthropic" | "gemini";

export interface ApiConfig {
  url: string;
}

// OpenAI specific types
export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
}
export interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

// Anthropic specific types
export interface AnthropicMessage {
  role: "user";
  content: string;
}
export interface AnthropicRequest {
  model: string;
  system: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
}
export interface AnthropicResponse {
  content: { text: string }[];
}

// Gemini specific types
export interface GeminiPart {
  text: string;
}
export interface GeminiContent {
  role: "user";
  parts: GeminiPart[];
}
export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
  };
}
export interface GeminiResponse {
  candidates: { content: { parts: { text: string }[] } }[];
  promptFeedback?: {
    blockReason: string;
  };
}

// Union types for requests and responses
export type ApiRequestPayload =
  | OpenAIRequest
  | AnthropicRequest
  | GeminiRequest;
export type ApiResponse = OpenAIResponse | AnthropicResponse | GeminiResponse;

// Error types
export interface ApiErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
}

// API Tester types
export interface Model {
  name: string;
  displayName: string;
  supportedGenerationMethods?: string[];
}

export interface TestResult {
  success: boolean;
  error?: string;
  models?: Model[];
}

// YouTube Player Response
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
}

export interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks: CaptionTrack[];
    };
  };
}
