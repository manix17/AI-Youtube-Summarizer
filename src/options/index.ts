import type {
  Profile,
  Platform,
  PlatformConfig,
  PlatformConfigs,
  DefaultPrompts,
  Model,
  AppStorage,
  TestApiKeyRequest,
  TestResult,
} from "../types";

document.addEventListener("DOMContentLoaded", () => {
  let DEFAULT_PROMPTS: DefaultPrompts = { systemPrompt: "", userPrompt: "" };
  let platformConfigs: PlatformConfigs = {};

  let currentProfile: string = "default";
  let profiles: Record<string, Profile> = {
    default: {
      name: "Default",
      platform: "gemini",
      model: "gemini-1.5-flash",
      apiKey: "",
      systemPrompt: "", // Will be loaded from prompts.json
      userPrompt: "", // Will be loaded from prompts.json
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
  const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
  const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
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

  async function initialize(): Promise<void> {
    try {
      const [platformRes, promptsRes] = await Promise.all([
        fetch(chrome.runtime.getURL("assets/platform_configs.json")),
        fetch(chrome.runtime.getURL("assets/prompts.json")),
      ]);

      platformConfigs = await platformRes.json();
      DEFAULT_PROMPTS = await promptsRes.json();

      if (profiles.default.systemPrompt === "") {
        profiles.default.systemPrompt = DEFAULT_PROMPTS.systemPrompt;
        profiles.default.userPrompt = DEFAULT_PROMPTS.userPrompt;
      }

      await loadSettings();
      setupEventListeners();
      renderProfiles();
      loadProfileData();

      if (profiles[currentProfile] && profiles[currentProfile].apiKey) {
        testApiKey(true);
      }
    } catch (error) {
      console.error("Error initializing settings:", error);
      showStatus("Failed to load configurations.", "error");
    }
  }

  function setupEventListeners(): void {
    platformSelect?.addEventListener("change", () => {
      updatePlatformBadge();
      if (modelSelect) {
        modelSelect.innerHTML =
          '<option value="">-- Test API Key to load models --</option>';
        modelSelect.disabled = true;
      }
    });

    addProfileBtn?.addEventListener("click", () => {
      profileModal?.classList.add("show");
      profileNameInput?.focus();
    });

    closeModalBtn?.addEventListener("click", () => {
      profileModal?.classList.remove("show");
      if (profileNameInput) profileNameInput.value = "";
    });

    cancelProfileBtn?.addEventListener("click", () => {
      profileModal?.classList.remove("show");
      if (profileNameInput) profileNameInput.value = "";
    });

    createProfileBtn?.addEventListener("click", createNewProfile);

    saveBtn?.addEventListener("click", saveSettings);
    resetBtn?.addEventListener("click", resetToDefault);
    testKeyBtn?.addEventListener("click", () => testApiKey(false));

    profileModal?.addEventListener("click", (e) => {
      if (e.target === profileModal) {
        profileModal.classList.remove("show");
        if (profileNameInput) profileNameInput.value = "";
      }
    });
  }

  function populateModelDropdown(apiModels: Model[] = []): void {
    if (!modelSelect) return;
    const platform = platformSelect.value as Platform;
    const config = platformConfigs[platform];
    const currentModel = profiles[currentProfile].model;

    modelSelect.innerHTML = "";
    modelSelect.disabled = false;

    const recommendedModels = new Map<string, string>();
    const otherModels = new Map<string, string>();

    // 1. Populate recommended models from config
    if (config && config.models) {
      config.models.forEach((model) => {
        recommendedModels.set(model.value, model.label);
      });
    }

    // 2. Populate other models from API, avoiding duplicates with recommended
    apiModels.forEach((model) => {
      if (!recommendedModels.has(model.name)) {
        otherModels.set(model.name, model.displayName);
      }
    });

    // 3. If no models are found at all, show an error
    if (recommendedModels.size === 0 && otherModels.size === 0) {
      modelSelect.innerHTML =
        '<option value="">-- No compatible models found --</option>';
      modelSelect.disabled = true;
      return;
    }

    // 4. Create and populate "Recommended Models" optgroup
    if (recommendedModels.size > 0) {
      const recommendedGroup = document.createElement("optgroup");
      recommendedGroup.label = "Recommended Models";
      recommendedModels.forEach((label, value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        recommendedGroup.appendChild(option);
      });
      modelSelect.appendChild(recommendedGroup);
    }

    // 5. Create and populate "Other Models" optgroup
    if (otherModels.size > 0) {
      const otherGroup = document.createElement("optgroup");
      otherGroup.label = "Other Models";
      otherModels.forEach((label, value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        otherGroup.appendChild(option);
      });
      modelSelect.appendChild(otherGroup);
    }

    // 6. Try to select the currently saved model
    let selectedOption = Array.from(modelSelect.options).find(
      (opt) => opt.value === currentModel
    );
    if (!selectedOption) {
      selectedOption = Array.from(modelSelect.options).find((opt) =>
        opt.value.includes(currentModel)
      );
    }

    if (selectedOption) {
      selectedOption.selected = true;
    } else if (modelSelect.options.length > 0) {
      modelSelect.selectedIndex = 0;
    }
  }

  function populateModelDropdownFromConfig(): void {
    if (!modelSelect) return;
    const platform = platformSelect.value as Platform;
    const config = platformConfigs[platform];
    const currentModel = profiles[currentProfile].model;

    modelSelect.innerHTML = "";
    modelSelect.disabled = false;

    if (!config.models || config.models.length === 0) {
      modelSelect.innerHTML =
        '<option value="">-- No models configured --</option>';
      modelSelect.disabled = true;
      return;
    }

    config.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.value;
      option.textContent = model.label;
      modelSelect.appendChild(option);
    });

    modelSelect.value = currentModel;
    if (!modelSelect.value && modelSelect.options.length > 0) {
      modelSelect.selectedIndex = 0;
    }
  }

  function updatePlatformBadge(): void {
    if (!platformBadge || !platformSelect) return;
    const platform = platformSelect.value as Platform;
    const config = platformConfigs[platform];
    platformBadge.textContent = config.name;
    platformBadge.className = `platform-badge ${config.className}`;
  }

  function renderProfiles(): void {
    if (!profileList) return;
    profileList.innerHTML = "";
    Object.keys(profiles).forEach((profileId) => {
      const profile = profiles[profileId];
      const profileItem = document.createElement("div");
      profileItem.className = `profile-item ${
        profileId === currentProfile ? "active" : ""
      }`;
      profileItem.setAttribute("data-profile", profileId);

      profileItem.innerHTML = `
                <span class="profile-name">${profile.name}</span>
                ${
                  profileId !== "default"
                    ? '<button class="delete-profile-btn">Delete</button>'
                    : ""
                }
            `;

      profileItem.addEventListener("click", (e) => {
        if (
          (e.target as HTMLElement).classList.contains("delete-profile-btn")
        ) {
          deleteProfile(profileId);
        } else {
          switchProfile(profileId);
        }
      });

      profileList.appendChild(profileItem);
    });
  }

  function switchProfile(profileId: string): void {
    if (currentProfile === profileId) return;

    currentProfile = profileId;

    const data: Partial<AppStorage> = { currentProfile: currentProfile };
    chrome.storage.sync.set(data, () => {
      loadProfileData();
      renderProfiles();
      showStatus(
        `Switched to "${profiles[currentProfile].name}" profile`,
        "success"
      );
      if (profiles[currentProfile] && profiles[currentProfile].apiKey) {
        testApiKey(true);
      }
    });
  }

  function loadProfileData(): void {
    const profile = profiles[currentProfile];
    if (
      !profile ||
      !platformSelect ||
      !apiKeyInput ||
      !systemPromptTextarea ||
      !userPromptTextarea ||
      !settingsSubtitle ||
      !modelSelect
    )
      return;

    platformSelect.value = profile.platform;
    updatePlatformBadge();
    apiKeyInput.value = profile.apiKey;
    systemPromptTextarea.value = profile.systemPrompt;
    userPromptTextarea.value = profile.userPrompt;
    settingsSubtitle.textContent = `Now editing profile: "${profile.name}"`;

    modelSelect.innerHTML =
      '<option value="">-- Test API Key to load models --</option>';
    modelSelect.disabled = true;
  }

  function createNewProfile(): void {
    if (!profileNameInput || !profileModal) return;
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

    profiles[profileId] = {
      name: profileName,
      platform: "gemini",
      model: "gemini-1.5-flash",
      apiKey: "",
      systemPrompt: DEFAULT_PROMPTS.systemPrompt,
      userPrompt: DEFAULT_PROMPTS.userPrompt,
    };

    profileModal.classList.remove("show");
    profileNameInput.value = "";
    renderProfiles();
    switchProfile(profileId);
    showStatus("Profile created successfully!", "success");
  }

  function deleteProfile(profileId: string): void {
    if (profileId === "default") return;

    delete profiles[profileId];
    if (currentProfile === profileId) {
      switchProfile("default");
    }
    renderProfiles();
    showStatus("Profile deleted", "success");
  }

  async function saveSettings(): Promise<void> {
    if (
      !apiKeyInput ||
      !platformSelect ||
      !modelSelect ||
      !systemPromptTextarea ||
      !userPromptTextarea
    )
      return;

    const apiKey = apiKeyInput.value.trim();
    const platform = platformSelect.value as Platform;
    const model = modelSelect.value;

    if (!model) {
      showStatus("Please select a model before saving.", "error");
      return;
    }

    if (!apiKey) {
      showStatus("API Key is required. Please enter a valid key.", "error");
      return;
    }

    const profile = profiles[currentProfile];
    profile.platform = platform;
    profile.model = model;
    profile.apiKey = apiKey;
    profile.systemPrompt = systemPromptTextarea.value;
    profile.userPrompt = userPromptTextarea.value;

    const data: AppStorage = {
      profiles: profiles,
      currentProfile: currentProfile,
    };
    chrome.storage.sync.set(data, () => {
      showStatus("Settings saved successfully!", "success");
    });
  }

  function loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["profiles", "currentProfile"],
        (result: AppStorage) => {
          if (result.profiles) {
            profiles = result.profiles;
          }
          if (result.currentProfile) {
            currentProfile = result.currentProfile;
          }
          resolve();
        }
      );
    });
  }

  function resetToDefault(): void {
    if (
      confirm(
        "Are you sure you want to reset the current profile to its default settings? This action will be saved immediately."
      )
    ) {
      const profile = profiles[currentProfile];

      // Reset the in-memory profile object to defaults
      profile.platform = "gemini";
      profile.model = "gemini-1.5-flash";
      profile.apiKey = "";
      profile.systemPrompt = DEFAULT_PROMPTS.systemPrompt;
      profile.userPrompt = DEFAULT_PROMPTS.userPrompt;

      // Update the form to reflect these defaults
      loadProfileData();

      // Persist the changes directly
      const data: AppStorage = {
        profiles: profiles,
        currentProfile: currentProfile,
      };
      chrome.storage.sync.set(data, () => {
        showStatus("Profile has been reset to default settings.", "success");
      });
    }
  }

  function testApiKey(isSilent: boolean = false): void {
    if (!apiKeyInput || !platformSelect || !testKeyBtn || !modelSelect) return;
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      if (!isSilent) {
        showStatus("Please enter an API key first", "error");
      }
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

      if (response && response.error) {
        if (!isSilent) {
          showStatus(`Error: ${response.error}`, "error");
        }
        modelSelect.innerHTML = `<option value="">-- Key validation failed --</option>`;
        modelSelect.disabled = true;
      } else if (response && response.models) {
        if (!isSilent) {
          showStatus("API key is valid! Models loaded.", "success");
        }
        const availableModels = response.models.filter((model: Model) => {
          if (platform === "gemini") {
            return (
              model.supportedGenerationMethods &&
              model.supportedGenerationMethods.includes("generateContent")
            );
          }
          if (platform === "openai") {
            const modelId = model.name.toLowerCase();
            const disallowed = ["embed", "whisper", "tts", "dall-e"];
            return !disallowed.some((term) => modelId.includes(term));
          }
          return true;
        });
        populateModelDropdown(availableModels);
      } else if (response && response.success) {
        // Anthropic (no model list)
        if (!isSilent) {
          showStatus("API key is valid!", "success");
        }
        populateModelDropdownFromConfig();
      } else {
        const errorMsg = "An unknown error occurred during API key validation.";
        if (!isSilent) {
          showStatus(`Error: ${errorMsg}`, "error");
        }
        modelSelect.innerHTML = `<option value="">-- ${errorMsg} --</option>`;
        modelSelect.disabled = true;
      }
    });
  }

  function showStatus(message: string, type: "success" | "error"): void {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} show`;

    setTimeout(() => {
      statusMessage.classList.remove("show");
    }, 3000);
  }

  initialize();
});
