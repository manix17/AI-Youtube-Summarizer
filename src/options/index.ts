import type {
  Profile,
  StoredProfile,
  Platform,
  PlatformConfigs,
  Model,
  ModelPricing,
  AppStorage,
  TestApiKeyRequest,
  TestResult,
  PromptPresets,
  PromptPreset,
} from "../types";
import {
  getTokenUsage,
  getStorageInfo,
  resetTokenUsage,
  formatLargeNumber,
  formatBytes,
  getStorageUsagePercentage,
  getLargestProfiles,
} from "../utils/usage_tracker";

document.addEventListener("DOMContentLoaded", () => {
  let defaultPrompts: PromptPresets = { presets: {} };
  let platformConfigs: PlatformConfigs = {};

  let currentProfileId: string = "default";
  let profiles: Record<string, Profile> = {
    default: {
      name: "Default",
      platform: "gemini",
      models: {
        openai: "",
        anthropic: "",
        gemini: "",
        openrouter: "",
      },
      apiKeys: {
        openai: "",
        anthropic: "",
        gemini: "",
        openrouter: "",
      },
      presets: {},
      language: "English",
      currentPreset: "detailed",
    },
  };

  // DOM elements
  const platformSelect = document.getElementById(
    "platform-select"
  ) as HTMLSelectElement;
  const modelSearchInput = document.getElementById(
    "model-search"
  ) as HTMLInputElement;
  const modelDropdown = document.getElementById(
    "model-dropdown"
  ) as HTMLDivElement;
  const selectedModelInput = document.getElementById(
    "selected-model"
  ) as HTMLInputElement;
  const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
  const systemPromptTextarea = document.getElementById(
    "system-prompt"
  ) as HTMLTextAreaElement;
  const userPromptTextarea = document.getElementById(
    "user-prompt"
  ) as HTMLTextAreaElement;
  const platformBadge = document.getElementById(
    "platform-badge"
  ) as HTMLSpanElement;
  const profileList = document.getElementById("profile-list") as HTMLDivElement;
  const addProfileBtn = document.getElementById(
    "add-profile-btn"
  ) as HTMLButtonElement;
  const testKeyBtn = document.getElementById(
    "test-key-btn"
  ) as HTMLButtonElement;
  const statusMessage = document.getElementById(
    "status-message"
  ) as HTMLDivElement;
  const profileModal = document.getElementById(
    "profile-modal"
  ) as HTMLDivElement;
  const profileNameInput = document.getElementById(
    "profile-name-input"
  ) as HTMLInputElement;
  const createProfileBtn = document.getElementById(
    "create-profile"
  ) as HTMLButtonElement;
  const cancelProfileBtn = document.getElementById(
    "cancel-profile"
  ) as HTMLButtonElement;
  const closeModalBtn = document.getElementById(
    "close-modal"
  ) as HTMLButtonElement;
  const settingsSubtitle = document.getElementById(
    "settings-subtitle"
  ) as HTMLHeadingElement;
  const presetSelect = document.getElementById(
    "prompt-preset-select"
  ) as HTMLSelectElement;
  const addPresetBtn = document.getElementById(
    "add-preset-btn"
  ) as HTMLButtonElement;
  const deletePresetBtn = document.getElementById(
    "delete-preset-btn"
  ) as HTMLButtonElement;
  const renamePresetBtn = document.getElementById(
    "rename-preset-btn"
  ) as HTMLButtonElement;
  const resetPromptsBtn = document.getElementById(
    "reset-prompts-btn"
  ) as HTMLButtonElement;
  const temperatureSlider = document.getElementById(
    "temperature-slider"
  ) as HTMLInputElement;
  const temperatureValue = document.getElementById(
    "temperature-value"
  ) as HTMLSpanElement;
  const languageSelect = document.getElementById(
    "language-select"
  ) as HTMLSelectElement;

  // Preset Modal Elements
  const presetModal = document.getElementById("preset-modal") as HTMLDivElement;
  const presetModalTitle = document.getElementById(
    "preset-modal-title"
  ) as HTMLHeadingElement;
  const presetModalText = document.getElementById(
    "preset-modal-text"
  ) as HTMLParagraphElement;
  const presetNameGroup = document.getElementById(
    "preset-name-group"
  ) as HTMLDivElement;
  const presetNameInput = document.getElementById(
    "preset-name-input"
  ) as HTMLInputElement;
  const presetConfirmBtn = document.getElementById(
    "preset-confirm-btn"
  ) as HTMLButtonElement;
  const presetCancelBtn = document.getElementById(
    "preset-cancel-btn"
  ) as HTMLButtonElement;
  const presetCloseModalBtn = document.getElementById(
    "preset-close-modal"
  ) as HTMLButtonElement;

  // Reset Modal Elements
  const resetModal = document.getElementById("reset-modal") as HTMLDivElement;
  const resetModalTitle = document.getElementById(
    "reset-modal-title"
  ) as HTMLHeadingElement;
  const resetModalText = document.getElementById(
    "reset-modal-text"
  ) as HTMLParagraphElement;
  const resetConfirmBtn = document.getElementById(
    "reset-confirm-btn"
  ) as HTMLButtonElement;
  const resetCancelBtn = document.getElementById(
    "reset-cancel-btn"
  ) as HTMLButtonElement;
  const resetCloseModalBtn = document.getElementById(
    "reset-close-modal"
  ) as HTMLButtonElement;

  // Delete Modal Elements
  const deleteModal = document.getElementById("delete-modal") as HTMLDivElement;
  const deleteModalTitle = document.getElementById(
    "delete-modal-title"
  ) as HTMLHeadingElement;
  const deleteModalText = document.getElementById(
    "delete-modal-text"
  ) as HTMLParagraphElement;
  const deleteConfirmBtn = document.getElementById(
    "delete-confirm-btn"
  ) as HTMLButtonElement;
  const deleteCancelBtn = document.getElementById(
    "delete-cancel-btn"
  ) as HTMLButtonElement;
  const deleteCloseModalBtn = document.getElementById(
    "delete-close-modal"
  ) as HTMLButtonElement;

  // Usage Statistics Elements
  const totalTokensElement = document.getElementById("total-tokens") as HTMLElement;
  const totalRequestsElement = document.getElementById("total-requests") as HTMLElement;
  const inputTokensElement = document.getElementById("input-tokens") as HTMLElement;
  const outputTokensElement = document.getElementById("output-tokens") as HTMLElement;
  const resetTokensBtn = document.getElementById("reset-tokens-btn") as HTMLButtonElement;
  const storageProgressElement = document.getElementById("storage-progress") as HTMLElement;
  const storageUsedElement = document.getElementById("storage-used") as HTMLElement;
  const storageTotalElement = document.getElementById("storage-total") as HTMLElement;
  const storagePercentageElement = document.getElementById("storage-percentage") as HTMLElement;
  const platformStatsElement = document.getElementById("platform-stats") as HTMLElement;
  const profileSizeListElement = document.getElementById("profile-size-list") as HTMLElement;

  // Help icon elements
  const platformHelpIcon = document.getElementById("platform-help") as HTMLAnchorElement;
  const promptsHelpIcon = document.getElementById("prompts-help") as HTMLAnchorElement;

  let presetModalMode: "add" | "rename" | "delete" | "reset" | null = null;
  let presetToModify: string | null = null;
  
  // Track which presets have been modified in this session to avoid unnecessary storage operations
  let modifiedPresets: Set<string> = new Set();
  
  // Flag to prevent automatic saves during initialization - start as true to prevent saves before init
  let isInitializing = true;

  // Helper function to get default models from platform configs
  function getDefaultModels(): Record<Platform, string> {
    const defaultModels: Record<Platform, string> = {} as Record<Platform, string>;
    
    for (const platform of ["openai", "anthropic", "gemini", "openrouter"] as Platform[]) {
      const config = platformConfigs[platform];
      if (config && config.models && config.models.length > 0) {
        defaultModels[platform] = config.models[0].value;
      } else {
        // Fallback values in case configs aren't loaded yet
        switch (platform) {
          case "openai":
            defaultModels[platform] = "gpt-4";
            break;
          case "anthropic":
            defaultModels[platform] = "claude-3-sonnet";
            break;
          case "gemini":
            defaultModels[platform] = "models/gemini-2.5-flash";
            break;
          case "openrouter":
            defaultModels[platform] = "openrouter/auto";
            break;
        }
      }
    }
    
    return defaultModels;
  }

  async function initialize(): Promise<void> {
    // Clear the modifiedPresets set at the start of each session
    modifiedPresets.clear();
    
    try {
      const [platformRes, promptsRes] = await Promise.all([
        fetch(chrome.runtime.getURL("assets/platform_configs.json")),
        fetch(chrome.runtime.getURL("assets/prompts.json")),
      ]);
      platformConfigs = await platformRes.json();
      defaultPrompts = await promptsRes.json();
      
      // Initialize default models for all profiles after platform configs are loaded
      for (const profileId in profiles) {
        const profile = profiles[profileId];
        const defaultModels = getDefaultModels();
        
        // Only set default models if they're empty (preserve existing user selections)
        for (const platform of ["openai", "anthropic", "gemini", "openrouter"] as Platform[]) {
          if (!profile.models[platform]) {
            profile.models[platform] = defaultModels[platform];
          }
        }
      }
      
      await loadLanguages();
      await loadSettings();
      setupEventListeners();
      renderProfiles();
      loadProfileData();
      await updateUsageStatistics();
      
      // Clear the initializing flag after all initialization is complete
      setTimeout(() => {
        isInitializing = false;
      }, 200);
    } catch (error) {
      console.error("Error initializing settings:", error);
      showStatus("Failed to load configurations.", "error");
      // Clear the flag even if initialization fails
      isInitializing = false;
    }
  }

  async function loadLanguages(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL("assets/supported_languages.json"));
      const languages = await response.json();
      languageSelect.innerHTML = ""; // Clear existing options
      for (const language of languages) {
          const option = document.createElement("option");
          option.value = language;
          option.textContent = language;
          languageSelect.appendChild(option);
      }
    } catch (error) {
      console.error("Error loading languages:", error);
      // Fallback to a minimal list if loading fails
      const fallbackLanguages = ["English", "Spanish", "French"];
      languageSelect.innerHTML = ""; // Clear existing options
      for (const language of fallbackLanguages) {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
      }
    }
  }
  // Global variables for model search
  let availableModels: { 
    recommended: Map<string, { label: string; pricing?: ModelPricing }>, 
    other: Map<string, { label: string; pricing?: ModelPricing }> 
  } = { 
    recommended: new Map(), 
    other: new Map() 
  };
  let isDropdownOpen = false;

  // Model search functionality
  function handleModelSearch(): void {
    const searchTerm = modelSearchInput.value.toLowerCase();
    renderModelOptions(searchTerm);
    showModelDropdown();
  }

  function showModelDropdown(): void {
    if (availableModels.recommended.size > 0 || availableModels.other.size > 0) {
      isDropdownOpen = true;
      modelDropdown.classList.add("show");
      if (!modelSearchInput.value) {
        renderModelOptions("");
      }
    }
  }

  function hideModelDropdown(): void {
    isDropdownOpen = false;
    modelDropdown.classList.remove("show");
  }

  function selectModel(value: string, displayName: string): void {
    selectedModelInput.value = value;
    modelSearchInput.value = displayName;
    hideModelDropdown();
    
    // Update the profile
    const profile = profiles[currentProfileId];
    if (profile) {
      const currentPlatform = profile.platform;
      profile.models[currentPlatform] = value;
      saveSettings();
    }
  }

  function renderModelOptions(searchTerm: string = ""): void {
    const dropdownContent = modelDropdown.querySelector('.model-dropdown-content');
    if (!dropdownContent) return;

    dropdownContent.innerHTML = "";

    const filteredRecommended = new Map<string, { label: string; pricing?: ModelPricing }>();
    const filteredOther = new Map<string, { label: string; pricing?: ModelPricing }>();

    // Filter models based on search term
    availableModels.recommended.forEach((label, value) => {
      if (searchTerm === "" || 
          label.label.toLowerCase().includes(searchTerm) || 
          value.toLowerCase().includes(searchTerm) ||
          (searchTerm === "free" && (label.label.toLowerCase().includes("free") || value.toLowerCase().includes("free")))) {
        filteredRecommended.set(value, label);
      }
    });

    availableModels.other.forEach((label, value) => {
      if (searchTerm === "" || 
          label.label.toLowerCase().includes(searchTerm) || 
          value.toLowerCase().includes(searchTerm) ||
          (searchTerm === "free" && (label.label.toLowerCase().includes("free") || value.toLowerCase().includes("free")))) {
        filteredOther.set(value, label);
      }
    });

    const currentSelectedModel = selectedModelInput.value;

    // Render filtered results
    if (filteredRecommended.size === 0 && filteredOther.size === 0) {
      dropdownContent.innerHTML = `
        <div class="no-results-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          No models found
        </div>
      `;
      return;
    }

    if (filteredRecommended.size > 0) {
      const section = document.createElement("div");
      section.className = "model-section";
      section.innerHTML = `<div class="model-section-header">Recommended Models</div>`;
      
      filteredRecommended.forEach((label, value) => {
        const option = document.createElement("div");
        option.className = `model-option ${value === currentSelectedModel ? 'selected' : ''}`;
        
        let pricingHtml = '';
        if (label.pricing) {
          const inputPrice = label.pricing.input.toFixed(2);
          const outputPrice = label.pricing.output.toFixed(2);
          pricingHtml = `<div class="model-pricing">💰 In: $${inputPrice} | Out: $${outputPrice} per 1M tokens</div>`;
        }
        
        option.innerHTML = `
          <div class="model-name">${label.label}</div>
          <div class="model-value">${value}</div>
          ${pricingHtml}
        `;
        option.addEventListener("click", () => selectModel(value, label.label));
        section.appendChild(option);
      });
      
      dropdownContent.appendChild(section);
    }

    if (filteredOther.size > 0) {
      const section = document.createElement("div");
      section.className = "model-section";
      section.innerHTML = `<div class="model-section-header">Other Models</div>`;
      
      filteredOther.forEach((label, value) => {
        const option = document.createElement("div");
        option.className = `model-option ${value === currentSelectedModel ? 'selected' : ''}`;
        
        let pricingHtml = '';
        if (label.pricing) {
          const inputPrice = label.pricing.input.toFixed(2);
          const outputPrice = label.pricing.output.toFixed(2);
          pricingHtml = `<div class="model-pricing">💰 In: $${inputPrice} | Out: $${outputPrice} per 1M tokens</div>`;
        }
        
        option.innerHTML = `
          <div class="model-name">${label.label}</div>
          <div class="model-value">${value}</div>
          ${pricingHtml}
        `;
        option.addEventListener("click", () => selectModel(value, label.label));
        section.appendChild(option);
      });
      
      dropdownContent.appendChild(section);
    }
  }

  function clearModels(): void {
    availableModels.recommended.clear();
    availableModels.other.clear();
    selectedModelInput.value = "";
    modelSearchInput.value = "";
    modelSearchInput.placeholder = "Test API Key to load models...";
    modelSearchInput.disabled = true;
    hideModelDropdown();
    
    const dropdownContent = modelDropdown.querySelector('.model-dropdown-content');
    if (dropdownContent) {
      dropdownContent.innerHTML = '<div class="no-models-message">Test API Key to load models</div>';
    }
  }

  function setupEventListeners(): void {
    platformSelect?.addEventListener("change", handlePlatformChange);
    selectedModelInput?.addEventListener("change", saveCurrentProfile);
    apiKeyInput?.addEventListener("input", handleApiKeyInput);

    // Model search functionality
    modelSearchInput?.addEventListener("input", handleModelSearch);
    modelSearchInput?.addEventListener("focus", showModelDropdown);
    modelSearchInput?.addEventListener("blur", () => {
      // Delay hiding to allow clicking on options
      setTimeout(() => hideModelDropdown(), 150);
    });

    // Click outside to close dropdown
    document.addEventListener("click", (e) => {
      if (!modelSearchInput?.contains(e.target as Node) && !modelDropdown?.contains(e.target as Node)) {
        hideModelDropdown();
      }
    });
    addProfileBtn?.addEventListener("click", () =>
      profileModal?.classList.add("show")
    );
    closeModalBtn?.addEventListener("click", closeModal);
    cancelProfileBtn?.addEventListener("click", closeModal);
    createProfileBtn?.addEventListener("click", createNewProfile);
    testKeyBtn?.addEventListener("click", () => testApiKey(false));
    presetSelect?.addEventListener("change", handlePresetChange);
    addPresetBtn?.addEventListener("click", () => showPresetModal("add"));
    deletePresetBtn?.addEventListener("click", () => {
      const presetKey = profiles[currentProfileId].currentPreset;
      const preset = profiles[currentProfileId].presets[presetKey];
      if (preset) {
        showPresetModal("delete", presetKey, preset.name);
      }
    });
    renamePresetBtn?.addEventListener("click", () => {
      const presetKey = profiles[currentProfileId].currentPreset;
      const preset = profiles[currentProfileId].presets[presetKey];
      if (preset) {
        showPresetModal("rename", presetKey, preset.name);
      }
    });
    resetPromptsBtn?.addEventListener("click", () => {
      const presetKey = profiles[currentProfileId].currentPreset;
      const preset = profiles[currentProfileId].presets[presetKey];
      if (preset) {
        showPresetModal("reset", presetKey, preset.name);
      }
    });

    systemPromptTextarea?.addEventListener(
      "input",
      debounce(saveCurrentProfile, 500)
    );
    userPromptTextarea?.addEventListener(
      "input",
      debounce(saveCurrentProfile, 500)
    );
    temperatureSlider?.addEventListener("input", () => {
      if (temperatureValue) {
        temperatureValue.textContent = parseFloat(
          temperatureSlider.value
        ).toFixed(1);
      }
      debounce(saveCurrentProfile, 500)();
    });

    profileModal?.addEventListener("click", (e) => {
      if (e.target === profileModal) closeModal();
    });

    // Preset Modal Listeners
    presetCloseModalBtn?.addEventListener("click", closePresetModal);
    presetCancelBtn?.addEventListener("click", closePresetModal);
    presetModal?.addEventListener("click", (e) => {
      if (e.target === presetModal) closePresetModal();
    });
    presetConfirmBtn?.addEventListener("click", handlePresetConfirm);

    // Reset Modal Listeners
    resetCloseModalBtn?.addEventListener("click", closeResetModal);
    resetCancelBtn?.addEventListener("click", closeResetModal);
    resetModal?.addEventListener("click", (e) => {
      if (e.target === resetModal) closeResetModal();
    });
    resetConfirmBtn?.addEventListener("click", handleResetConfirm);

    // Delete Modal Listeners
    deleteCloseModalBtn?.addEventListener("click", closeDeleteModal);
    deleteCancelBtn?.addEventListener("click", closeDeleteModal);
    deleteModal?.addEventListener("click", (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
    deleteConfirmBtn?.addEventListener("click", handleDeleteConfirm);

    // Final safety net to save changes before the page unloads
    window.addEventListener("pagehide", saveCurrentProfile);
    languageSelect?.addEventListener("change", saveCurrentProfile);
    resetTokensBtn?.addEventListener("click", handleResetTokens);

    // Help icon event listeners
    platformHelpIcon?.addEventListener("click", handlePlatformHelp);
    promptsHelpIcon?.addEventListener("click", handlePromptsHelp);
  }

  // Usage Statistics Functions
  async function updateUsageStatistics(): Promise<void> {
    try {
      const [tokenUsage, storageInfo] = await Promise.all([
        getTokenUsage(),
        getStorageInfo()
      ]);

      // Update token usage display
      totalTokensElement.textContent = formatLargeNumber(tokenUsage.totalTokens);
      totalRequestsElement.textContent = `${tokenUsage.totalRequests.toLocaleString()} requests`;
      inputTokensElement.textContent = formatLargeNumber(tokenUsage.inputTokens);
      outputTokensElement.textContent = formatLargeNumber(tokenUsage.outputTokens);

      // Update storage usage display
      const usagePercentage = getStorageUsagePercentage(storageInfo);
      storageUsedElement.textContent = formatBytes(storageInfo.totalSize);
      storageTotalElement.textContent = formatBytes(storageInfo.maxSize);
      storagePercentageElement.textContent = `${usagePercentage}%`;
      
      // Update storage progress bar
      storageProgressElement.style.width = `${usagePercentage}%`;
      storageProgressElement.className = 'storage-progress';
      if (usagePercentage > 90) {
        storageProgressElement.classList.add('danger');
      } else if (usagePercentage > 70) {
        storageProgressElement.classList.add('warning');
      }

      // Update platform usage stats
      updatePlatformStats(tokenUsage);

      // Update profile sizes
      updateProfileSizes(storageInfo);
    } catch (error) {
      console.error('Error updating usage statistics:', error);
    }
  }

  function updatePlatformStats(tokenUsage: any): void {
    const platformStats = tokenUsage.platformUsage || {};
    
    if (Object.keys(platformStats).length === 0) {
      platformStatsElement.innerHTML = '<p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">No usage data yet</p>';
      return;
    }

    const platformElements = Object.entries(platformStats)
      .sort(([,a], [,b]) => (b as any).tokens - (a as any).tokens)
      .map(([platform, stats]: [string, any]) => {
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
        const iconClass = platform.toLowerCase();
        
        return `
          <div class="platform-stat">
            <div class="platform-name">
              <div class="platform-icon-small ${iconClass}">
                ${platform === 'openai' ? '🤖' : platform === 'anthropic' ? '🧠' : platform === 'openrouter' ? '🚀' : '💎'}
              </div>
              ${platformName}
            </div>
            <div class="platform-usage-info">
              <div class="platform-tokens">${formatLargeNumber(stats.tokens)}</div>
              <div class="platform-requests">${stats.requests.toLocaleString()} requests</div>
              <div class="platform-requests" style="font-size: 0.7rem;">
                In: ${formatLargeNumber(stats.inputTokens || 0)} • Out: ${formatLargeNumber(stats.outputTokens || 0)}
              </div>
            </div>
          </div>
        `;
      }).join('');

    platformStatsElement.innerHTML = platformElements;
  }

  function updateProfileSizes(storageInfo: any): void {
    const largestProfiles = getLargestProfiles(storageInfo, 5);
    
    if (largestProfiles.length === 0) {
      profileSizeListElement.innerHTML = '<p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">No profiles found</p>';
      return;
    }

    const profileElements = largestProfiles.map(({ profileId, size }) => {
      const profileName = profiles[profileId]?.name || profileId;
      return `
        <div class="profile-size-item">
          <div class="profile-name">${profileName}</div>
          <div class="profile-size">${formatBytes(size)}</div>
        </div>
      `;
    }).join('');

    profileSizeListElement.innerHTML = profileElements;
  }

  async function handleResetTokens(): Promise<void> {
    const confirmed = confirm('Are you sure you want to reset all token usage statistics? This action cannot be undone.');
    
    if (confirmed) {
      try {
        await resetTokenUsage();
        await updateUsageStatistics();
        showStatus('Token usage statistics have been reset.', 'success');
      } catch (error) {
        console.error('Error resetting token usage:', error);
        showStatus('Failed to reset token usage statistics.', 'error');
      }
    }
  }

  function closeModal(): void {
    profileModal?.classList.remove("show");
    if (profileNameInput) profileNameInput.value = "";
  }

  function closePresetModal(): void {
    presetModal?.classList.remove("show");
    presetModalMode = null;
    presetToModify = null;
  }

  // Reset Modal Functions
  let profileToReset: string | null = null;

  function showResetModal(profileId: string): void {
    profileToReset = profileId;
    const profile = profiles[profileId];
    resetModalTitle.textContent = `Reset "${profile.name}" Profile`;
    resetModalText.textContent = `Are you sure you want to reset "${profile.name}"? This action will:`;
    resetModal?.classList.add("show");
  }

  function closeResetModal(): void {
    resetModal?.classList.remove("show");
    profileToReset = null;
  }

  function handleResetConfirm(): void {
    if (profileToReset) {
      resetProfile(profileToReset);
      closeResetModal();
    }
  }

  // Delete Modal Functions
  let profileToDelete: string | null = null;

  function showDeleteModal(profileId: string): void {
    profileToDelete = profileId;
    const profile = profiles[profileId];
    deleteModalTitle.textContent = `Delete "${profile.name}" Profile`;
    deleteModalText.textContent = `Are you sure you want to permanently delete "${profile.name}"?`;
    deleteModal?.classList.add("show");
  }

  function closeDeleteModal(): void {
    deleteModal?.classList.remove("show");
    profileToDelete = null;
  }

  function handleDeleteConfirm(): void {
    if (profileToDelete) {
      deleteProfile(profileToDelete);
      closeDeleteModal();
    }
  }

  function showPresetModal(
    mode: "add" | "rename" | "delete" | "reset",
    presetKey?: string,
    presetName?: string
  ): void {
    presetModalMode = mode;
    presetToModify = presetKey || null;

    switch (mode) {
      case "add":
        presetModalTitle.textContent = "Add New Preset";
        presetNameGroup.style.display = "block";
        presetModalText.style.display = "none";
        presetNameInput.value = "";
        presetConfirmBtn.textContent = "Create";
        presetConfirmBtn.className = "btn btn-primary";
        break;
      case "rename":
        presetModalTitle.textContent = "Rename Preset";
        presetNameGroup.style.display = "block";
        presetModalText.style.display = "none";
        presetNameInput.value = presetName || "";
        presetConfirmBtn.textContent = "Rename";
        presetConfirmBtn.className = "btn btn-primary";
        break;
      case "delete":
        presetModalTitle.textContent = "Delete Preset";
        presetNameGroup.style.display = "none";
        presetModalText.style.display = "block";
        presetModalText.textContent = `Are you sure you want to delete the "${presetName}" preset? This action cannot be undone.`;
        presetConfirmBtn.textContent = "Delete";
        presetConfirmBtn.className = "btn btn-danger"; // Assumes a .btn-danger class for styling
        break;
      case "reset":
        presetModalTitle.textContent = "Reset Preset";
        presetNameGroup.style.display = "none";
        presetModalText.style.display = "block";
        presetModalText.textContent = `Are you sure you want to reset the "${presetName}" preset to its original prompts?`;
        presetConfirmBtn.textContent = "Reset";
        presetConfirmBtn.className = "btn btn-danger";
        break;
    }

    presetModal.classList.add("show");
    if (mode !== "delete" && mode !== "reset") {
      presetNameInput.focus();
    }
  }

  function handlePresetConfirm(): void {
    switch (presetModalMode) {
      case "add":
        addNewPreset();
        break;
      case "rename":
        renameCurrentPreset();
        break;
      case "delete":
        deleteCurrentPreset();
        break;
      case "reset":
        resetCurrentPreset();
        break;
    }
  }

  function handlePlatformChange(): void {    
    updatePlatformBadge();
    
    // Save only the platform change, not the model (which belongs to the old platform)
    const profile = profiles[currentProfileId];
    if (profile) {
      profile.platform = platformSelect.value as Platform;
      // Save just the platform change, without calling saveCurrentProfile() 
      // which would incorrectly save the old platform's model to the new platform
      saveSettings();
    }
    
    // Load the API key for the selected platform
    const newPlatform = platformSelect.value as Platform;
    const savedApiKey = profiles[currentProfileId].apiKeys[newPlatform] || "";
    
    apiKeyInput.value = savedApiKey;

    if (savedApiKey) {
      // If API key exists for this platform, test it to load models
      testApiKey(true);
    } else {
      // No API key for this platform, clear models
      clearModels();
    }
  }
  function handleApiKeyInput(): void {
    const profile = profiles[currentProfileId];
    if (profile) {
      const currentPlatform = profile.platform;
      profile.apiKeys[currentPlatform] = apiKeyInput.value.trim();
      saveSettings();
    }
  }
  function handlePresetChange(): void {
    const profile = profiles[currentProfileId];
    if (profile) {
      // Set initializing flag to prevent saves during preset switching
      isInitializing = true;
      
      profile.currentPreset = presetSelect.value;
      loadPresetData();
      saveSettings();
      
      // Clear the initializing flag after preset switching is complete
      setTimeout(() => {
        isInitializing = false;
      }, 50);
    }
  }
  function loadPresetData(): void {
    const profile = profiles[currentProfileId];
    if (!profile) return;

    const presetKey = profile.currentPreset;
    const preset = profile.presets[presetKey];

    if (preset) {
      systemPromptTextarea.value = preset.system_prompt;
      userPromptTextarea.value = preset.user_prompt;
      temperatureSlider.value = preset.temperature.toString();
      temperatureValue.textContent = preset.temperature.toFixed(1);

      const isDefaultPreset = !!preset.isDefault;

      // Default presets cannot be deleted or renamed.
      deletePresetBtn.disabled = isDefaultPreset;
      renamePresetBtn.disabled = isDefaultPreset;

      // The reset button is only for default presets.
      resetPromptsBtn.disabled = !isDefaultPreset;

      // All fields are always editable.
      systemPromptTextarea.readOnly = false;
      userPromptTextarea.readOnly = false;
      temperatureSlider.disabled = false;
    }
  }

  function addNewPreset(): void {
    const presetName = presetNameInput.value.trim();
    if (!presetName) {
      showStatus("Please enter a preset name.", "error");
      return;
    }

    const presetId = presetName.toLowerCase().replace(/\s+/g, "-");
    const profile = profiles[currentProfileId];

    if (profile.presets[presetId]) {
      showStatus("A preset with this name already exists.", "error");
      return;
    }

    profile.presets[presetId] = {
      name: presetName,
      system_prompt: "",
      user_prompt: "",
      temperature: 0.7,
      isDefault: false,
    };
    profile.currentPreset = presetId;

    populatePresetDropdown();
    loadPresetData();
    saveSettings();
    closePresetModal();
    showStatus("Preset created successfully!", "success");
  }

  function deleteCurrentPreset(): void {
    const profile = profiles[currentProfileId];
    const presetKey = presetToModify;

    if (!presetKey || profile.presets[presetKey]?.isDefault) {
      showStatus("Cannot delete a default preset.", "error");
      return;
    }

    // Remove from in-memory profile
    delete profile.presets[presetKey];
    
    // Remove individual preset key from storage
    const individualPresetKey = `profile_${currentProfileId}_${presetKey}`;
    chrome.storage.sync.remove(individualPresetKey, () => {
      if (chrome.runtime.lastError) {
        console.error("Error deleting individual preset:", chrome.runtime.lastError.message);
      } else {
        console.log(`Deleted individual preset key: ${individualPresetKey}`);
      }
    });
    
    profile.currentPreset = "detailed"; // Reset to a safe default
    populatePresetDropdown();
    loadPresetData();
    saveSettings();
    closePresetModal();
    showStatus(`Preset "${presetKey}" has been deleted.`, "success");
  }

  function renameCurrentPreset(): void {
    const profile = profiles[currentProfileId];
    const oldPresetKey = presetToModify;

    if (!oldPresetKey || profile.presets[oldPresetKey]?.isDefault) {
      showStatus("Cannot rename a default preset.", "error");
      return;
    }

    const oldPreset = profile.presets[oldPresetKey];
    const newName = presetNameInput.value.trim();

    if (!newName || newName === oldPreset.name) {
      closePresetModal();
      return;
    }

    const newPresetKey = newName.toLowerCase().replace(/\s+/g, "-");
    if (profile.presets[newPresetKey]) {
      showStatus("A preset with this name already exists.", "error");
      return;
    }

    // Create new entry and delete old one in memory
    profile.presets[newPresetKey] = { ...oldPreset, name: newName };
    delete profile.presets[oldPresetKey];
    profile.currentPreset = newPresetKey;

    // Handle storage keys: remove old key and let saveSettings create the new one
    const oldIndividualPresetKey = `profile_${currentProfileId}_${oldPresetKey}`;
    chrome.storage.sync.remove(oldIndividualPresetKey, () => {
      if (chrome.runtime.lastError) {
        console.error("Error deleting old individual preset key:", chrome.runtime.lastError.message);
      } else {
        console.log(`Deleted old individual preset key: ${oldIndividualPresetKey}`);
      }
    });

    populatePresetDropdown();
    loadPresetData();
    saveSettings();
    closePresetModal();
    showStatus("Preset renamed successfully!", "success");
  }

  function resetCurrentPreset(): void {
    const profile = profiles[currentProfileId];
    const presetKey = presetToModify;

    if (!presetKey || !profile.presets[presetKey]?.isDefault) {
      showStatus("Only default presets can be reset.", "error");
      closePresetModal();
      return;
    }

    const defaultPreset = defaultPrompts.presets[presetKey];
    if (defaultPreset) {
      const preset = profile.presets[presetKey];
      preset.system_prompt = defaultPreset.system_prompt;
      preset.user_prompt = defaultPreset.user_prompt;
      preset.temperature = defaultPreset.temperature;
      
      // Remove from modified presets tracking to prevent re-saving
      const presetKey_full = `${currentProfileId}_${presetKey}`;
      modifiedPresets.delete(presetKey_full);
      
      // Delete the individual preset key if it exists
      const individualPresetKey = `profile_${currentProfileId}_${presetKey}`;
      chrome.storage.sync.remove(individualPresetKey, () => {
        if (chrome.runtime.lastError) {
          console.error("Error deleting individual preset:", chrome.runtime.lastError.message);
        } else {
          console.log(`Deleted individual preset key: ${individualPresetKey}`);
        }
      });
      
      loadPresetData();
      saveSettings();
      closePresetModal();
      showStatus("Preset has been reset.", "success");
    }
  }

  function populateModelDropdown(apiModels: Model[] = []): void {
    const platform = platformSelect.value as Platform;
    const config = platformConfigs[platform];
    const currentModel = profiles[currentProfileId].models[platform] || "";

    // Clear existing models
    availableModels.recommended.clear();
    availableModels.other.clear();

    // Populate recommended models from config
    if (config?.models) {
      config.models.forEach((model) =>
        availableModels.recommended.set(model.value, { label: model.label, pricing: model.pricing })
      );
    }

    // Populate other models from API response and update recommended models with pricing
    apiModels.forEach((model) => {
      if (availableModels.recommended.has(model.name)) {
        // Update recommended model with pricing from API
        const existingModel = availableModels.recommended.get(model.name);
        if (existingModel) {
          availableModels.recommended.set(model.name, {
            label: existingModel.label,
            pricing: model.pricing || existingModel.pricing
          });
        }
      } else {
        // Add to other models
        availableModels.other.set(model.name, { label: model.displayName, pricing: model.pricing });
      }
    });

    // Enable the search input
    modelSearchInput.disabled = false;
    modelSearchInput.placeholder = "Type 'free' to search for free models...";

    // Set the current model
    selectedModelInput.value = currentModel;
    
    // Find the display name for the current model
    let currentModelDisplay = "";
    if (currentModel) {
      currentModelDisplay = availableModels.recommended.get(currentModel)?.label || 
                           availableModels.other.get(currentModel)?.label || 
                           currentModel;
      modelSearchInput.value = currentModelDisplay;
    } else if (availableModels.recommended.size > 0 || availableModels.other.size > 0) {
      // Auto-select the first available model
      const firstModel = availableModels.recommended.size > 0 
        ? Array.from(availableModels.recommended.entries())[0]
        : Array.from(availableModels.other.entries())[0];
      
      selectedModelInput.value = firstModel[0];
      modelSearchInput.value = firstModel[1].label;
      profiles[currentProfileId].models[platform] = firstModel[0];
      saveSettings();
    }

    // Initialize the dropdown content
    renderModelOptions("");
  }

  function updatePlatformBadge(): void {
    const platform = platformSelect.value as Platform;
    const config = platformConfigs[platform];
    if (config) {
      platformBadge.textContent = config.name;
      platformBadge.className = `platform-badge ${config.className}`;
    }
  }

  function renderProfiles(): void {
    profileList.innerHTML = "";
    Object.keys(profiles).forEach((profileId) => {
      const profile = profiles[profileId];
      const profileItem = document.createElement("div");
      profileItem.className = `profile-item ${
        profileId === currentProfileId ? "active" : ""
      }`;
      profileItem.dataset.profile = profileId;
      profileItem.innerHTML = `<span class="profile-name">${profile.name}</span>`;

      // Add actions for all profiles
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "profile-actions";

      const resetBtn = document.createElement("button");
      resetBtn.className = "reset-profile-btn";
      resetBtn.textContent = "Reset";
      resetBtn.onclick = (e) => {
        e.stopPropagation();
        showResetModal(profileId);
      };
      actionsContainer.appendChild(resetBtn);

      // Add delete button only for non-default profiles
      if (profileId !== "default") {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-profile-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          showDeleteModal(profileId);
        };
        actionsContainer.appendChild(deleteBtn);
      }

      profileItem.appendChild(actionsContainer);

      profileItem.onclick = () => switchProfile(profileId);
      profileList.appendChild(profileItem);
    });
  }

  function switchProfile(profileId: string): void {
    if (currentProfileId === profileId) return;
    currentProfileId = profileId;
    
    // Set initializing flag to prevent saves during profile switching
    isInitializing = true;
    
    chrome.storage.sync.set({ currentProfile: currentProfileId }, () => {
      loadProfileData();
      renderProfiles();
      showStatus(
        `Switched to "${profiles[currentProfileId].name}" profile`,
        "success"
      );
      if (profiles[currentProfileId].apiKeys[profiles[currentProfileId].platform]) {
        testApiKey(true);
      }
      
      // Clear the initializing flag after profile switching is complete
      setTimeout(() => {
        isInitializing = false;
      }, 100);
    });
  }

  function loadProfileData(): void {
    const profile = profiles[currentProfileId];
    if (!profile) return;

    platformSelect.value = profile.platform;
    updatePlatformBadge();
    
    // Load API key for the current platform
    const currentApiKey = profile.apiKeys[profile.platform] || "";
    apiKeyInput.value = currentApiKey;
    
    settingsSubtitle.textContent = `Now editing profile: "${profile.name}"`;
    languageSelect.value = profile.language || "English";

    populatePresetDropdown();
    loadPresetData();

    // Ensure models are loaded for the current profile
    if (currentApiKey) {
      testApiKey(true);
    } else {
      clearModels();
    }
  }

  function populatePresetDropdown(): void {
    const profile = profiles[currentProfileId];
    presetSelect.innerHTML = "";
    for (const key in profile.presets) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = profile.presets[key].name;
      presetSelect.appendChild(option);
    }
    presetSelect.value = profile.currentPreset;
  }

  function createNewProfile(): void {
    const profileName = profileNameInput.value.trim();
    if (!profileName) {
      showStatus("Please enter a profile name", "error");
      return;
    }
    const profileId = profileName.toLowerCase().replace(/\s+/g, "-");
    if (profiles[profileId]) {
      showStatus("Profile name already exists", "error");
      return;
    }

    const newPresets = JSON.parse(JSON.stringify(defaultPrompts.presets));
    for (const key in newPresets) {
      newPresets[key].isDefault = true;
    }

    profiles[profileId] = {
      name: profileName,
      platform: profiles.default.platform,
      models: getDefaultModels(),
      apiKeys: {
        openai: "",
        anthropic: "",
        gemini: "",
        openrouter: "",
      },
      language: "English",
      presets: newPresets,
      currentPreset: "detailed",
    };

    // Save the new profile immediately before switching to it
    saveSettings();

    closeModal();
    renderProfiles();
    switchProfile(profileId);
    showStatus("Profile created successfully!", "success");
  }


  function resetProfile(profileId: string): void {
    if (!profiles[profileId]) return;

    const profile = profiles[profileId];
    
    // Collect all preset keys for deletion
    const presetIds = Object.keys(profile.presets);
    
    // Reset profile to clean slate with default presets (keep the name only)
    const profileName = profile.name;
    const newPresets = JSON.parse(JSON.stringify(defaultPrompts.presets));
    for (const key in newPresets) {
      newPresets[key].isDefault = true;
    }
    
    profiles[profileId] = {
      name: profileName,
      platform: "gemini",
      models: getDefaultModels(),
      apiKeys: {
        openai: "",
        anthropic: "",
        gemini: "",
        openrouter: "",
      },
      presets: newPresets,
      language: "English",
      currentPreset: "detailed",
    };

    // Remove all preset keys from storage (both custom and modified defaults)
    const presetKeysToRemove = presetIds.map(id => `profile_${profileId}_${id}`);
    
    // Also remove any modified default presets from the modifiedPresets tracking
    presetIds.forEach(presetId => {
      const presetKey = `${profileId}_${presetId}`;
      modifiedPresets.delete(presetKey);
    });
    
    if (presetKeysToRemove.length > 0) {
      chrome.storage.sync.remove(presetKeysToRemove, () => {
        if (chrome.runtime.lastError) {
          console.error("Error removing preset keys:", chrome.runtime.lastError.message);
        } else {
          console.log(`Reset profile ${profileId} and removed ${presetKeysToRemove.length} preset keys`);
        }
      });
    }

    // Save the reset profile
    saveSettings();
    
    // If this is the current profile, reload its data to refresh UI
    if (currentProfileId === profileId) {
      // Set initializing flag to prevent save loops
      isInitializing = true;
      
      loadProfileData();
      populatePresetDropdown();
      
      // Clear the initializing flag after UI refresh
      setTimeout(() => {
        isInitializing = false;
      }, 100);
    }
    
    renderProfiles();
    showStatus(`Profile "${profileName}" has been reset to default settings!`, "success");
  }

  function deleteProfile(profileId: string): void {
    if (profileId === "default" || !profiles[profileId]) return;

    // Collect preset IDs for cleanup
    const presetIds = Object.keys(profiles[profileId].presets);
    const profileName = profiles[profileId].name;

    // Remove from in-memory object
    delete profiles[profileId];

    // Clean up modifiedPresets tracking for this profile
    presetIds.forEach(presetId => {
      const presetKey = `${profileId}_${presetId}`;
      modifiedPresets.delete(presetKey);
    });

    // Switch to default profile if we're deleting the current profile
    if (currentProfileId === profileId) {
      currentProfileId = "default";
    }

    // Immediately save the updated profiles list to storage
    saveSettings();

    // Remove individual profile and preset keys from storage
    const keysToRemove = [`profile_${profileId}`, ...presetIds.map(id => `profile_${profileId}_${id}`)];
    chrome.storage.sync.remove(keysToRemove, async () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error deleting profile keys from storage:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log(`Deleted profile ${profileId} and ${presetIds.length} preset keys`);
        
        // Update storage usage statistics after successful deletion
        await updateUsageStatistics();
      }
    });

    // Update UI immediately
    renderProfiles();
    if (currentProfileId === "default") {
      loadProfileData(); // Reload profile data if we switched to default
    }
    showStatus(`Profile "${profileName}" deleted successfully!`, "success");
  }

  function saveCurrentProfile(): void {
    // Skip saving during initialization to prevent unnecessary storage writes
    if (isInitializing) return;
    
    const profile = profiles[currentProfileId];
    if (!profile) return;

    profile.platform = platformSelect.value as Platform;
    profile.models[profile.platform] = selectedModelInput.value;
    profile.apiKeys[profile.platform] = apiKeyInput.value.trim();
    profile.language = languageSelect.value;
    profile.currentPreset = presetSelect.value;

    const currentPresetData = profile.presets[profile.currentPreset];
    if (currentPresetData) {
      // Check if preset data has actually changed
      const newSystemPrompt = systemPromptTextarea.value;
      const newUserPrompt = userPromptTextarea.value;
      const newTemperature = parseFloat(temperatureSlider.value);
      
      // Normalize line endings for comparison (textarea normalizes \r\n to \n)
      const normalizeLineEndings = (text: string) => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const storedSystemPrompt = normalizeLineEndings(currentPresetData.system_prompt || '');
      const storedUserPrompt = normalizeLineEndings(currentPresetData.user_prompt || '');
      
      if (storedSystemPrompt !== newSystemPrompt ||
          storedUserPrompt !== newUserPrompt ||
          currentPresetData.temperature !== newTemperature) {
        
        // Only mark as modified if we're not initializing
        if (!isInitializing) {
          // Mark this preset as modified in this session
          const presetKey = `${currentProfileId}_${profile.currentPreset}`;
          modifiedPresets.add(presetKey);
        }
        
        // Always update the preset data (this ensures the in-memory data stays in sync)
        currentPresetData.system_prompt = newSystemPrompt;
        currentPresetData.user_prompt = newUserPrompt;
        currentPresetData.temperature = newTemperature;
      }
    }

    saveSettings();
  }

  function getSavableProfile(profile: Profile): StoredProfile {
    // Since we now load all presets from individual storage keys,
    // we don't need to store any preset references in the main profile
    const savableProfile: StoredProfile = {
      name: profile.name,
      platform: profile.platform,
      models: profile.models,
      apiKeys: profile.apiKeys,
      language: profile.language,
      currentPreset: profile.currentPreset,
      presets: {}, // Always empty - all presets stored individually
    };
    
    return savableProfile;
  }

  function saveSettings(): void {
    
    const dataToSave: { [key: string]: any } = {
      currentProfile: currentProfileId,
      profile_ids: Object.keys(profiles),
    };

    // First, save all profiles
    for (const profileId in profiles) {
      dataToSave[`profile_${profileId}`] = getSavableProfile(
        profiles[profileId]
      );
    }

    // Then, save individual presets that have been modified in this session or are custom presets
    for (const profileId in profiles) {
      const profile = profiles[profileId];
      for (const presetId in profile.presets) {
        const preset = profile.presets[presetId];
        const presetKey = `${profileId}_${presetId}`;
        
        // Only save individual presets if they are custom presets or have been modified in this session
        if (!preset.isDefault) {
          // This is a custom preset, always save it with its own key
          dataToSave[`profile_${profileId}_${presetId}`] = preset;
        } else if (modifiedPresets.has(presetKey)) {
          // This is a default preset that has been modified in this session
          dataToSave[`profile_${profileId}_${presetId}`] = preset;
        }
      }
    }

    chrome.storage.sync.set(dataToSave, async () => {
      if (chrome.runtime.lastError) {
        console.error("Save settings error:", chrome.runtime.lastError.message);
        
        const errorMessage = chrome.runtime.lastError.message || "Unknown error";
        
        // Handle quota exceeded errors with helpful user guidance
        if (errorMessage.includes("quota") || errorMessage.includes("QUOTA_BYTES_PER_ITEM")) {
          // Find which item is too large by checking sizes
          const largeItems = findLargeStorageItems(dataToSave);
          showQuotaExceededError(largeItems);
        } else {
          showStatus(
            `Error saving settings: ${errorMessage}`,
            "error"
          );
        }
        return;
      }
      
      // Verify individual preset saves completed successfully
      const failedSaves: string[] = [];
      for (const key in dataToSave) {
        if (key.includes('profile_') && key.includes('_') && key !== 'profile_ids') {
          // This is an individual preset key, verify it was saved
          chrome.storage.sync.get(key, (result) => {
            if (!result[key]) {
              failedSaves.push(key);
              console.error(`Failed to save individual preset: ${key}`);
            }
          });
        }
      }
      
      if (failedSaves.length > 0) {
        showStatus(`Warning: ${failedSaves.length} presets may not have saved correctly`, "error");
      }
      
      // Update storage usage statistics after saving
      await updateUsageStatistics();
    });
  }

  function loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (data) => {
        let storedProfiles: Record<string, Profile> = {};
        let isFirstRun = false;

        if (data.profile_ids) {
          // New structure: profiles are stored individually
          const profileIds = data.profile_ids;
          for (const id of profileIds) {
            if (data[`profile_${id}`]) {
              storedProfiles[id] = data[`profile_${id}`];
            }
          }
          currentProfileId = data.currentProfile || "default";
        } else {
          // First time run, create a default profile.
          isFirstRun = true;
          storedProfiles = {
            default: {
              name: "Default",
              platform: "gemini",
              models: getDefaultModels(),
              apiKeys: {
                openai: "",
                anthropic: "",
                gemini: "",
                openrouter: "",
              },
              language: "English",
              presets: {},
              currentPreset: "detailed",
            },
          };
          currentProfileId = "default";
        }

        // --- Core Logic Change: Reconstruct profiles ---
        profiles = {};
        for (const profileId in storedProfiles) {
          const userProfile = storedProfiles[profileId] as any; // This is the lean profile from storage

          // Migration: Handle old profiles that have apiKey instead of apiKeys
          if (!userProfile.apiKeys && userProfile.apiKey !== undefined) {
            userProfile.apiKeys = {
              openai: "",
              anthropic: "",
              gemini: "",
              openrouter: "",
            };
            // If there was an old apiKey, put it in the current platform
            if (userProfile.apiKey) {
              userProfile.apiKeys[userProfile.platform] = userProfile.apiKey;
            }
            delete userProfile.apiKey; // Remove the old field
          }

          // Migration: Handle old profiles that have model instead of models
          if (!userProfile.models && userProfile.model !== undefined) {
            userProfile.models = getDefaultModels();
            // If there was an old model, put it in the current platform
            if (userProfile.model) {
              userProfile.models[userProfile.platform] = userProfile.model;
            }
            delete userProfile.model; // Remove the old field
          }

          // Ensure apiKeys exists even if migration wasn't needed
          if (!userProfile.apiKeys) {
            userProfile.apiKeys = {
              openai: "",
              anthropic: "",
              gemini: "",
              openrouter: "",
            };
          }

          // Ensure models exists even if migration wasn't needed
          if (!userProfile.models) {
            userProfile.models = getDefaultModels();
          }

          // Start with a deep copy of the default prompts
          const fullPresets = JSON.parse(
            JSON.stringify(defaultPrompts.presets)
          );

          // Mark all default presets and check for individual overrides
          for (const key in fullPresets) {
            fullPresets[key].isDefault = true;
            // Check if there's an individual preset stored for this default preset
            const individualPresetKey = `profile_${profileId}_${key}`;
            if (data[individualPresetKey]) {
              // Individual preset data takes precedence
              Object.assign(fullPresets[key], data[individualPresetKey]);
            }
          }

          // Scan for any individual preset keys that belong to this profile
          // This loads both modified defaults and custom presets
          for (const storageKey in data) {
            if (storageKey.startsWith(`profile_${profileId}_`)) {
              const presetId = storageKey.replace(`profile_${profileId}_`, '');
              const presetData = data[storageKey];
              
              // Skip if this is not a preset object, if we already processed it, or if it's empty
              if (!presetData || typeof presetData !== 'object' || 
                  !presetData.hasOwnProperty('system_prompt') || 
                  fullPresets[presetId] ||
                  !presetId || presetId.length === 0) {
                continue;
              }
              
              // Add this preset to our collection (custom presets will be added here)
              fullPresets[presetId] = presetData;
            }
          }

          // Construct the final, in-memory profile object
          profiles[profileId] = {
            ...userProfile,
            presets: fullPresets,
          };
        }
        
        // If this is the first run, save the default profile to storage
        if (isFirstRun) {
          // Temporarily allow saves during first run initialization
          const wasInitializing = isInitializing;
          isInitializing = false;
          saveSettings();
          isInitializing = wasInitializing;
        }
        
        resolve();
      });
    });
  }


  function testApiKey(isSilent: boolean = false): void {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      if (!isSilent) showStatus("Please enter an API key", "error");
      return;
    }

    const platform = platformSelect.value as Platform;
    testKeyBtn.textContent = "Testing...";
    testKeyBtn.disabled = true;

    const message: TestApiKeyRequest = {
      type: "testApiKey",
      payload: { platform, apiKey },
    };

    chrome.runtime.sendMessage(message, (response: TestResult) => {
      testKeyBtn.textContent = "Test";
      testKeyBtn.disabled = false;

      if (response?.error) {
        if (!isSilent) showStatus(`Error: ${response.error}`, "error");
        clearModels();
        const dropdownContent = modelDropdown.querySelector('.model-dropdown-content');
        if (dropdownContent) {
          dropdownContent.innerHTML = '<div class="no-models-message">Key validation failed</div>';
        }
      } else if (response?.models) {
        if (!isSilent)
          showStatus("API key is valid! Models loaded.", "success");
        populateModelDropdown(response.models);
        
        // The populateModelDropdown function will handle setting the saved model
        // or auto-selecting the first available model if none is saved

      } else if (response?.success) {
        if (!isSilent) showStatus("API key is valid!", "success");
        populateModelDropdown([]);
      } else {
        if (!isSilent) showStatus("Unknown validation error", "error");
      }
    });
  }

  function showStatus(message: string, type: "success" | "error"): void {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} show`;
    setTimeout(() => statusMessage.classList.remove("show"), 3000);
  }

  function findLargeStorageItems(dataToSave: { [key: string]: any }): Array<{key: string, size: number, description: string}> {
    const CHROME_SYNC_ITEM_LIMIT = 8192; // 8KB per item
    const largeItems: Array<{key: string, size: number, description: string}> = [];
    
    for (const [key, value] of Object.entries(dataToSave)) {
      const size = new Blob([JSON.stringify(value)]).size;
      if (size > CHROME_SYNC_ITEM_LIMIT) { // Flag items that exceed the limit
        let description = "Unknown item";
        
        if (key.startsWith("profile_")) {
          const keyParts = key.split("_");
          if (keyParts.length >= 3) {
            // Individual preset: profile_${profileId}_${presetId}
            const profileName = profiles[keyParts[1]]?.name || keyParts[1];
            const presetName = profiles[keyParts[1]]?.presets[keyParts.slice(2).join("_")]?.name || keyParts.slice(2).join("_");
            description = `Preset "${presetName}" in profile "${profileName}"`;
          } else {
            // Main profile: profile_${profileId}
            const profileName = profiles[keyParts[1]]?.name || keyParts[1];
            description = `Profile "${profileName}"`;
          }
        } else if (key === "profile_ids") {
          description = "Profile list";
        } else if (key === "currentProfile") {
          description = "Current profile setting";
        }
        
        largeItems.push({ key, size, description });
      }
    }
    
    return largeItems.sort((a, b) => b.size - a.size);
  }

  function showQuotaExceededError(largeItems: Array<{key: string, size: number, description: string}> = []): void {
    // Create modal if it doesn't exist
    let modal = document.getElementById("quota-error-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "quota-error-modal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3 style="color: #dc2626;">⚠️ Storage Quota Exceeded</h3>
            <button class="close-modal" id="quota-close-modal">&times;</button>
          </div>
          <div id="quota-error-content"></div>
          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <button class="btn btn-primary" id="quota-close-btn">Got it</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Add event listeners
      const closeModal = () => {
        modal!.classList.remove("show");
      };
      
      modal.querySelector("#quota-close-modal")?.addEventListener("click", closeModal);
      modal.querySelector("#quota-close-btn")?.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }
    
    // Update modal content
    const content = modal.querySelector("#quota-error-content");
    if (content) {
      let html = `
        <p style="margin-bottom: 16px; line-height: 1.6;">
          <strong>Chrome storage limit exceeded!</strong> Each storage item has an 8KB limit, but one or more of your items is too large.
        </p>
      `;
      
      if (largeItems.length > 0) {
        html += `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h4 style="margin: 0 0 12px 0; color: #dc2626;">Items exceeding 8KB limit:</h4>
            <ul style="margin: 0; padding-left: 20px;">
        `;
        
        largeItems.forEach(item => {
          const sizeKB = (item.size / 1024).toFixed(1);
          html += `<li style="margin-bottom: 8px;"><strong>${item.description}</strong>: ${sizeKB} KB</li>`;
        });
        
        html += `</ul></div>`;
      }
      
      html += `
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 12px 0; color: #0369a1;">💡 How to fix this:</h4>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
            <li><strong>Shorten your prompts:</strong> Make your system and user prompts more concise</li>
            <li><strong>Split large presets:</strong> Break complex prompts into smaller, focused presets</li>
            <li><strong>Use variables:</strong> Replace repeated text with variables like <code>{VIDEO_TITLE}</code></li>
            <li><strong>Delete unused presets:</strong> Remove old presets you no longer need</li>
          </ul>
          <p style="margin: 16px 0 0 0; font-size: 0.9em; color: #374151;">
            <strong>Tip:</strong> Check the "Usage Statistics" section below to see which profiles are using the most storage space.
          </p>
        </div>
      `;
      
      content.innerHTML = html;
    }
    
    // Show modal
    modal.classList.add("show");
  }

  function handlePlatformHelp(e: Event): void {
    e.preventDefault();
    const helpUrl = "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/API_KEYS.md";
    chrome.tabs.create({ url: helpUrl });
  }

  function handlePromptsHelp(e: Event): void {
    e.preventDefault();
    const helpUrl = "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/CUSTOM_PROMPTS.md";
    chrome.tabs.create({ url: helpUrl });
  }

  function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
  ) {
    let timeout: any;
    return (...args: Parameters<F>): void => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitFor);
    };
  }

  initialize();
});
