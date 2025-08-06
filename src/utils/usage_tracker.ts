/**
 * Token usage tracking and storage monitoring utilities
 */

export interface TokenUsage {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalRequests: number;
  lastReset: string;
  platformUsage: {
    [platform: string]: {
      tokens: number;
      inputTokens: number;
      outputTokens: number;
      requests: number;
      lastUsed: string;
    };
  };
}

export interface StorageInfo {
  totalSize: number; // in bytes
  maxSize: number; // Chrome sync storage limit
  profiles: {
    [profileId: string]: number; // size in bytes
  };
  usage: TokenUsage;
  other: number; // size of other data
}

const CHROME_SYNC_STORAGE_LIMIT = 102400; // 100 KB in bytes
const TOKEN_USAGE_KEY = 'token_usage_stats';

/**
 * Estimate token count from text (rough approximation)
 * GPT tokenizer approximation: ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  // Remove extra whitespace and count characters
  const cleanText = text.replace(/\s+/g, ' ').trim();
  // Rough approximation: 4 characters per token
  return Math.ceil(cleanText.length / 4);
}

/**
 * Format large numbers for display (10K, 1M, etc.)
 */
export function formatLargeNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Format bytes to KiB
 */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

/**
 * Get current token usage statistics
 */
export async function getTokenUsage(): Promise<TokenUsage> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([TOKEN_USAGE_KEY], (result) => {
      const defaultUsage: TokenUsage = {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalRequests: 0,
        lastReset: new Date().toISOString(),
        platformUsage: {},
      };
      
      resolve(result[TOKEN_USAGE_KEY] || defaultUsage);
    });
  });
}

/**
 * Update token usage statistics
 */
export async function updateTokenUsage(
  platform: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const totalTokens = inputTokens + outputTokens;
  const currentUsage = await getTokenUsage();
  
  // Update totals
  currentUsage.totalTokens += totalTokens;
  currentUsage.inputTokens += inputTokens;
  currentUsage.outputTokens += outputTokens;
  currentUsage.totalRequests += 1;
  
  // Update platform-specific usage
  if (!currentUsage.platformUsage[platform]) {
    currentUsage.platformUsage[platform] = {
      tokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
      lastUsed: new Date().toISOString(),
    };
  }
  
  currentUsage.platformUsage[platform].tokens += totalTokens;
  currentUsage.platformUsage[platform].inputTokens += inputTokens;
  currentUsage.platformUsage[platform].outputTokens += outputTokens;
  currentUsage.platformUsage[platform].requests += 1;
  currentUsage.platformUsage[platform].lastUsed = new Date().toISOString();
  
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      [TOKEN_USAGE_KEY]: currentUsage
    }, () => {
      resolve();
    });
  });
}

/**
 * Reset token usage statistics
 */
export async function resetTokenUsage(): Promise<void> {
  const resetUsage: TokenUsage = {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalRequests: 0,
    lastReset: new Date().toISOString(),
    platformUsage: {},
  };
  
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      [TOKEN_USAGE_KEY]: resetUsage
    }, () => {
      resolve();
    });
  });
}

/**
 * Calculate storage usage information
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, async (items) => {
      const storageInfo: StorageInfo = {
        totalSize: 0,
        maxSize: CHROME_SYNC_STORAGE_LIMIT,
        profiles: {},
        usage: await getTokenUsage(),
        other: 0,
      };
      
      let profilesSize = 0;
      let usageSize = 0;
      let otherSize = 0;
      
      for (const [key, value] of Object.entries(items)) {
        const itemSize = new Blob([JSON.stringify(value)]).size;
        storageInfo.totalSize += itemSize;
        
        if (key.startsWith('profile_') && key !== 'profile_ids') {
          // Check if this is an individual preset key (profile_${profileId}_${presetId})
          const keyParts = key.split('_');
          if (keyParts.length >= 3) {
            // This is an individual preset key: profile_${profileId}_${presetId}
            const profileId = keyParts[1]; // Extract profile ID (second part)
            storageInfo.profiles[profileId] = (storageInfo.profiles[profileId] || 0) + itemSize;
            profilesSize += itemSize;
          } else {
            // This is a main profile key: profile_${profileId}
            const profileId = key.replace('profile_', '');
            storageInfo.profiles[profileId] = (storageInfo.profiles[profileId] || 0) + itemSize;
            profilesSize += itemSize;
          }
        } else if (key === TOKEN_USAGE_KEY) {
          usageSize += itemSize;
        } else if (key === 'profile_ids' || key === 'currentProfile') {
          // Include metadata keys in the default profile size
          if (!storageInfo.profiles['default']) {
            storageInfo.profiles['default'] = 0;
          }
          storageInfo.profiles['default'] += itemSize;
          profilesSize += itemSize;
        } else {
          otherSize += itemSize;
        }
      }
      
      storageInfo.other = otherSize;
      
      resolve(storageInfo);
    });
  });
}

/**
 * Get storage usage percentage
 */
export function getStorageUsagePercentage(storageInfo: StorageInfo): number {
  return Math.round((storageInfo.totalSize / storageInfo.maxSize) * 100);
}

/**
 * Check if storage is near capacity (>80%)
 */
export function isStorageNearCapacity(storageInfo: StorageInfo): boolean {
  return getStorageUsagePercentage(storageInfo) > 80;
}

/**
 * Get the largest profiles by storage size
 */
export function getLargestProfiles(storageInfo: StorageInfo, limit: number = 3): Array<{profileId: string, size: number}> {
  return Object.entries(storageInfo.profiles)
    .map(([profileId, size]) => ({ profileId, size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
}

/**
 * Token usage from API response
 */
export interface TokenUsageFromApi {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Track token usage for a summarization request
 */
export async function trackSummarization(
  platform: string,
  systemPrompt: string,
  userPrompt: string,
  transcript: string,
  response: string,
  actualTokenUsage?: TokenUsageFromApi
): Promise<void> {
  let inputTokens: number;
  let outputTokens: number;

  if (actualTokenUsage) {
    // Use actual token counts from API response
    inputTokens = actualTokenUsage.inputTokens;
    outputTokens = actualTokenUsage.outputTokens;
  } else {
    // Fall back to estimation
    inputTokens = estimateTokenCount(systemPrompt + userPrompt + transcript);
    outputTokens = estimateTokenCount(response);
  }
  
  await updateTokenUsage(platform, inputTokens, outputTokens);
}