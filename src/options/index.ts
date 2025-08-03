import type {
  Profile,
  Platform,
  PlatformConfigs,
  Model,
  AppStorage,
  TestApiKeyRequest,
  TestResult,
  PromptPresets,
  PromptPreset,
} from "../types";

document.addEventListener("DOMContentLoaded", () => {
  let defaultPrompts: PromptPresets = { presets: {} };
  let platformConfigs: PlatformConfigs = {};

  let currentProfileId: string = "default";
  let profiles: Record<string, Profile> = {
    default: {
      name: "Default",
      platform: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "",
      presets: {},
      language: "English",
      currentPreset: "detailed",
    },
  };

  // DOM elements
  const platformSelect = document.getElementById(
    "platform-select"
  ) as HTMLSelectElement;
  const modelSelect = document.getElementById(
    "model-select"
  ) as HTMLSelectElement;
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

  let presetModalMode: "add" | "rename" | "delete" | "reset" | null = null;
  let presetToModify: string | null = null;

  async function initialize(): Promise<void> {
    try {
      const [platformRes, promptsRes] = await Promise.all([
        fetch(chrome.runtime.getURL("assets/platform_configs.json")),
        fetch(chrome.runtime.getURL("assets/prompts.json")),
      ]);
      platformConfigs = await platformRes.json();
      defaultPrompts = await promptsRes.json();
      await loadSettings();
      setupEventListeners();
      renderProfiles();
      loadProfileData();
    } catch (error) {
      console.error("Error initializing settings:", error);
      showStatus("Failed to load configurations.", "error");
    }
  }
  function setupEventListeners(): void {
    platformSelect?.addEventListener("change", handlePlatformChange);
    modelSelect?.addEventListener("change", saveCurrentProfile);
    apiKeyInput?.addEventListener("input", handleApiKeyInput);
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

    // Final safety net to save changes before the page unloads
    window.addEventListener("pagehide", saveCurrentProfile);
    languageSelect?.addEventListener("change", saveCurrentProfile);
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
    modelSelect.innerHTML =
      '<option value="">-- Test API Key to load models --</option>';
    modelSelect.disabled = true;
    saveCurrentProfile();
  }
  function handleApiKeyInput(): void {
    const profile = profiles[currentProfileId];
    if (profile) {
      profile.apiKey = apiKeyInput.value.trim();
      saveSettings();
    }
  }
  function handlePresetChange(): void {
    const profile = profiles[currentProfileId];
    if (profile) {
      profile.currentPreset = presetSelect.value;
      loadPresetData();
      saveSettings();
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

    delete profile.presets[presetKey];
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

    // Create new entry and delete old one
    profile.presets[newPresetKey] = { ...oldPreset, name: newName };
    delete profile.presets[oldPresetKey];
    profile.currentPreset = newPresetKey;

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
      loadPresetData();
      saveSettings();
      closePresetModal();
      showStatus("Preset has been reset.", "success");
    }
  }

  function populateModelDropdown(apiModels: Model[] = []): void {
    const platform = platformSelect.value as Platform;
    const config = platformConfigs[platform];
    const currentModel = profiles[currentProfileId].model;

    modelSelect.innerHTML = "";
    modelSelect.disabled = false;

    const recommendedModels = new Map<string, string>();
    const otherModels = new Map<string, string>();

    if (config?.models) {
      config.models.forEach((model) =>
        recommendedModels.set(model.value, model.label)
      );
    }
    apiModels.forEach((model) => {
      if (!recommendedModels.has(model.name)) {
        otherModels.set(model.name, model.displayName);
      }
    });

    if (recommendedModels.size === 0 && otherModels.size === 0) {
      modelSelect.innerHTML =
        '<option value="">-- No compatible models found --</option>';
      modelSelect.disabled = true;
      return;
    }

    if (recommendedModels.size > 0) {
      const group = document.createElement("optgroup");
      group.label = "Recommended Models";
      recommendedModels.forEach((label, value) => {
        group.appendChild(new Option(label, value));
      });
      modelSelect.appendChild(group);
    }

    if (otherModels.size > 0) {
      const group = document.createElement("optgroup");
      group.label = "Other Models";
      otherModels.forEach((label, value) => {
        group.appendChild(new Option(label, value));
      });
      modelSelect.appendChild(group);
    }

    modelSelect.value = currentModel;
    if (!modelSelect.value && modelSelect.options.length > 0) {
      modelSelect.selectedIndex = 0;
    }
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

      if (profileId !== "default") {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-profile-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteProfile(profileId);
        };
        profileItem.appendChild(deleteBtn);
      }

      profileItem.onclick = () => switchProfile(profileId);
      profileList.appendChild(profileItem);
    });
  }

  function switchProfile(profileId: string): void {
    if (currentProfileId === profileId) return;
    currentProfileId = profileId;
    chrome.storage.sync.set({ currentProfile: currentProfileId }, () => {
      loadProfileData();
      renderProfiles();
      showStatus(
        `Switched to "${profiles[currentProfileId].name}" profile`,
        "success"
      );
      if (profiles[currentProfileId].apiKey) {
        testApiKey(true);
      }
    });
  }

  function loadProfileData(): void {
    const profile = profiles[currentProfileId];
    if (!profile) return;

    platformSelect.value = profile.platform;
    updatePlatformBadge();
    apiKeyInput.value = profile.apiKey;
    settingsSubtitle.textContent = `Now editing profile: "${profile.name}"`;
    languageSelect.value = profile.language || "English";

    populatePresetDropdown();
    loadPresetData();

    // Ensure models are loaded for the current profile
    if (profile.apiKey) {
      testApiKey(true);
    } else {
      modelSelect.innerHTML =
        '<option value="">-- Enter API Key to load models --</option>';
      modelSelect.disabled = true;
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
      model: profiles.default.model,
      apiKey: profiles.default.apiKey,
      language: "English",
      presets: newPresets,
      currentPreset: "detailed",
    };

    closeModal();
    renderProfiles();
    switchProfile(profileId);
    showStatus("Profile created successfully!", "success");
  }

  function deleteProfile(profileId: string): void {
    if (profileId === "default" || !profiles[profileId]) return;

    // Remove from in-memory object
    delete profiles[profileId];

    // Remove from storage
    chrome.storage.sync.remove(`profile_${profileId}`, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error deleting profile from storage:",
          chrome.runtime.lastError.message
        );
      }
    });

    if (currentProfileId === profileId) {
      switchProfile("default"); // This will call saveSettings
    } else {
      saveSettings(); // We need to save the updated profile_ids list
    }

    renderProfiles();
    showStatus("Profile deleted", "success");
  }

  function saveCurrentProfile(): void {
    const profile = profiles[currentProfileId];
    if (!profile) return;

    profile.platform = platformSelect.value as Platform;
    profile.model = modelSelect.value;
    profile.apiKey = apiKeyInput.value.trim();
    profile.language = languageSelect.value;
    profile.currentPreset = presetSelect.value;

    const currentPresetData = profile.presets[profile.currentPreset];
    if (currentPresetData) {
      currentPresetData.system_prompt = systemPromptTextarea.value;
      currentPresetData.user_prompt = userPromptTextarea.value;
      currentPresetData.temperature = parseFloat(temperatureSlider.value);
    }

    saveSettings();
  }

  function getSavableProfile(profile: Profile): Profile {
    const savableProfile: Profile = {
      ...profile,
      presets: {}, // Start with an empty presets object
    };

    for (const presetKey in profile.presets) {
      const preset = profile.presets[presetKey];

      if (preset.isDefault) {
        const defaultPreset = defaultPrompts.presets[presetKey];
        // Check if the user has modified the prompt text
        if (
          defaultPreset &&
          (preset.system_prompt !== defaultPreset.system_prompt ||
            preset.user_prompt !== defaultPreset.user_prompt ||
            preset.temperature !== defaultPreset.temperature)
        ) {
          // If modified, save only the fields that can be modified.
          savableProfile.presets[presetKey] = {
            name: preset.name, // Keep name for consistency
            system_prompt: preset.system_prompt,
            user_prompt: preset.user_prompt,
            temperature: preset.temperature,
            isDefault: true,
          };
        }
      } else {
        // This is a custom preset, so save it completely.
        savableProfile.presets[presetKey] = preset;
      }
    }
    return savableProfile;
  }

  function saveSettings(): void {
    const dataToSave: { [key: string]: any } = {
      currentProfile: currentProfileId,
      profile_ids: Object.keys(profiles),
    };

    for (const profileId in profiles) {
      dataToSave[`profile_${profileId}`] = getSavableProfile(
        profiles[profileId]
      );
    }

    chrome.storage.sync.set(dataToSave, () => {
      if (chrome.runtime.lastError) {
        console.error("Save settings error:", chrome.runtime.lastError.message);
        showStatus(
          `Error saving settings: ${chrome.runtime.lastError.message}`,
          "error"
        );
      } else {
        console.log("Settings saved successfully.");
      }
    });
  }

  function loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (data) => {
        let storedProfiles: Record<string, Profile> = {};
        let needsMigration = false;

        // Check for old monolithic 'profiles' object
        if (data.profiles) {
          storedProfiles = data.profiles;
          currentProfileId = data.currentProfile || "default";
          needsMigration = true;
        } else if (data.profile_ids) {
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
          storedProfiles = {
            default: {
              name: "Default",
              platform: "gemini",
              model: "gemini-2.5-flash",
              apiKey: "",
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
          const userProfile = storedProfiles[profileId]; // This is the lean profile from storage

          // Start with a deep copy of the default prompts
          const fullPresets = JSON.parse(
            JSON.stringify(defaultPrompts.presets)
          );

          // Mark all as default and merge user's modifications
          for (const key in fullPresets) {
            fullPresets[key].isDefault = true;
            // If user has a modified version of this default preset, merge it
            if (
              userProfile.presets &&
              userProfile.presets[key] &&
              userProfile.presets[key].isDefault
            ) {
              Object.assign(fullPresets[key], userProfile.presets[key]);
            }
          }

          // Add user's custom (non-default) presets
          if (userProfile.presets) {
            for (const key in userProfile.presets) {
              if (!userProfile.presets[key].isDefault) {
                fullPresets[key] = userProfile.presets[key];
              }
            }
          }

          // Construct the final, in-memory profile object
          profiles[profileId] = {
            ...userProfile,
            presets: fullPresets,
          };
        }

        if (needsMigration) {
          saveSettings(); // Save in the new, separated format
          chrome.storage.sync.remove("profiles"); // Clean up old monolithic key
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
        modelSelect.innerHTML = `<option value="">-- Key validation failed --</option>`;
        modelSelect.disabled = true;
      } else if (response?.models) {
        if (!isSilent)
          showStatus("API key is valid! Models loaded.", "success");
        populateModelDropdown(response.models);
        // Explicitly set the model after populating
        const profile = profiles[currentProfileId];
        if (profile.model) {
          modelSelect.value = profile.model;
        }
        saveCurrentProfile();
      } else if (response?.success) {
        if (!isSilent) showStatus("API key is valid!", "success");
        populateModelDropdown([]);
        saveCurrentProfile();
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
