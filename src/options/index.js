// options.js

document.addEventListener('DOMContentLoaded', () => {
    let DEFAULT_PROMPTS = {};
    let platformConfigs = {};

        let currentProfile = 'default';
        let profiles = {
            default: {
                name: 'Default',
                platform: 'gemini',
                model: 'gemini-1.5-flash',
                apiKey: '',
                systemPrompt: '', // Will be loaded from prompts.json
                userPrompt: ''   // Will be loaded from prompts.json
            }
        };

        // DOM elements
        const platformSelect = document.getElementById('platform-select');
        const modelSelect = document.getElementById('model-select');
        const apiKeyInput = document.getElementById('api-key');
        const systemPromptTextarea = document.getElementById('system-prompt');
        const userPromptTextarea = document.getElementById('user-prompt');
        const platformBadge = document.getElementById('platform-badge');
        const profileList = document.getElementById('profile-list');
        const addProfileBtn = document.getElementById('add-profile-btn');
        const saveBtn = document.getElementById('save-btn');
        const resetBtn = document.getElementById('reset-btn');
        const testKeyBtn = document.getElementById('test-key-btn');
        const statusMessage = document.getElementById('status-message');
        const profileModal = document.getElementById('profile-modal');
        const profileNameInput = document.getElementById('profile-name-input');
        const createProfileBtn = document.getElementById('create-profile');
        const cancelProfileBtn = document.getElementById('cancel-profile');
        const closeModalBtn = document.getElementById('close-modal');
        const settingsSubtitle = document.getElementById('settings-subtitle');

        async function initialize() {
            try {
                const [platformRes, promptsRes] = await Promise.all([
                    fetch(chrome.runtime.getURL('assets/platform_configs.json')),
                    fetch(chrome.runtime.getURL('assets/prompts.json'))
                ]);
                
                platformConfigs = await platformRes.json();
                DEFAULT_PROMPTS = await promptsRes.json();

                // If the default profile is still empty, populate it now
                if (profiles.default.systemPrompt === '') {
                    profiles.default.systemPrompt = DEFAULT_PROMPTS.systemPrompt;
                    profiles.default.userPrompt = DEFAULT_PROMPTS.userPrompt;
                }
                
                await loadSettings();
                setupEventListeners();
                renderProfiles();
                loadProfileData();
            } catch (error) {
                console.error('Error initializing settings:', error);
                showStatus('Failed to load configurations.', 'error');
            }
        }

        function setupEventListeners() {
            platformSelect.addEventListener('change', () => {
                updatePlatformBadge();
                modelSelect.innerHTML = '<option value="">-- Test API Key to load models --</option>';
                modelSelect.disabled = true;
            });

            addProfileBtn.addEventListener('click', () => {
                profileModal.classList.add('show');
                profileNameInput.focus();
            });

            closeModalBtn.addEventListener('click', () => {
                profileModal.classList.remove('show');
                profileNameInput.value = '';
            });

            cancelProfileBtn.addEventListener('click', () => {
                profileModal.classList.remove('show');
                profileNameInput.value = '';
            });

            createProfileBtn.addEventListener('click', createNewProfile);

            saveBtn.addEventListener('click', saveSettings);
            resetBtn.addEventListener('click', resetToDefault);
            testKeyBtn.addEventListener('click', testApiKey);

            // Close modal when clicking outside
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) {
                    profileModal.classList.remove('show');
                    profileNameInput.value = '';
                }
            });
        }

        function populateModelDropdown(apiModels = []) { // apiModels is an array of model objects
            const platform = platformSelect.value;
            const config = platformConfigs[platform];
            const configuredModelValues = config.models.map(x => x.value); // e.g., ["models/gemini-2.5-pro"]
            
            const currentModel = profiles[currentProfile].model;

            modelSelect.innerHTML = '';
            modelSelect.disabled = false;

            const configuredGroup = document.createElement('optgroup');
            configuredGroup.label = 'Configured Models';
            
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'Other Available Models';

            const usedApiModels = new Set();

            // Find intersection: API models that match a configured model
            configuredModelValues.forEach(confValue => {
                const apiModelMatch = apiModels.find(apiModel => apiModel.name === confValue );
                if (apiModelMatch && !usedApiModels.has(apiModelMatch.name)) {
                    const option = document.createElement('option');
                    option.value = apiModelMatch.name;
                    option.textContent = apiModelMatch.displayName;
                    configuredGroup.appendChild(option);
                    usedApiModels.add(apiModelMatch.name);
                }
            });

            // Add other models from the API
            apiModels.forEach(apiModel => {
                if (!usedApiModels.has(apiModel.name)) {
                    const option = document.createElement('option');
                    option.value = apiModel.name;
                    option.textContent = apiModel.displayName;
                    otherGroup.appendChild(option);
                }
            });

            if (configuredGroup.childNodes.length === 0 && otherGroup.childNodes.length === 0) {
                modelSelect.innerHTML = '<option value="">-- No compatible models found --</option>';
                modelSelect.disabled = true;
                return;
            }

            if (configuredGroup.hasChildNodes()) {
                modelSelect.appendChild(configuredGroup);
            }
            if (otherGroup.hasChildNodes()) {
                modelSelect.appendChild(otherGroup);
            }

            modelSelect.value = currentModel;
            if (!modelSelect.value && modelSelect.options.length > 0) {
                modelSelect.selectedIndex = 0;
            }
        }

        function populateModelDropdownFromConfig() {
            const platform = platformSelect.value;
            const config = platformConfigs[platform];
            const currentModel = profiles[currentProfile].model;

            modelSelect.innerHTML = '';
            modelSelect.disabled = false;

            if (!config.models || config.models.length === 0) {
                modelSelect.innerHTML = '<option value="">-- No models configured --</option>';
                modelSelect.disabled = true;
                return;
            }

            config.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                modelSelect.appendChild(option);
            });

            modelSelect.value = currentModel;
            if (!modelSelect.value && modelSelect.options.length > 0) {
                modelSelect.selectedIndex = 0;
            }
        }

        function updatePlatformBadge() {
            const platform = platformSelect.value;
            const config = platformConfigs[platform];
            platformBadge.textContent = config.name;
            platformBadge.className = `platform-badge ${config.className}`;
        }

        function renderProfiles() {
            profileList.innerHTML = '';
            Object.keys(profiles).forEach(profileId => {
                const profile = profiles[profileId];
                const profileItem = document.createElement('div');
                profileItem.className = `profile-item ${profileId === currentProfile ? 'active' : ''}`;
                profileItem.setAttribute('data-profile', profileId);
                
                profileItem.innerHTML = `
                    <span class="profile-name">${profile.name}</span>
                    ${profileId !== 'default' ? '<button class="delete-profile-btn">Delete</button>' : ''}
                `;

                profileItem.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-profile-btn')) {
                        deleteProfile(profileId);
                    } else {
                        switchProfile(profileId);
                    }
                });

                profileList.appendChild(profileItem);
            });
        }

        function switchProfile(profileId) {
            if (currentProfile === profileId) return;

            currentProfile = profileId;
            
            chrome.storage.sync.set({ currentProfile: currentProfile }, () => {
                loadProfileData();
                renderProfiles();
                showStatus(`Switched to "${profiles[currentProfile].name}" profile`, 'success');
            });
        }

        function loadProfileData() {
            const profile = profiles[currentProfile];
            platformSelect.value = profile.platform;
            updatePlatformBadge();
            apiKeyInput.value = profile.apiKey;
            systemPromptTextarea.value = profile.systemPrompt;
            userPromptTextarea.value = profile.userPrompt;
            settingsSubtitle.textContent = `Now editing profile: "${profile.name}"`;

            modelSelect.innerHTML = '<option value="">-- Test API Key to load models --</option>';
            modelSelect.disabled = true;

            if (profile.apiKey) {
                testApiKey(true); // Run test silently on load
            }
        }

        function createNewProfile() {
            const profileName = profileNameInput.value.trim();
            if (!profileName) {
                showStatus('Please enter a profile name', 'error');
                return;
            }

            const profileId = profileName.toLowerCase().replace(/\s+/g, '-');
            if (profiles[profileId]) {
                showStatus('Profile name already exists', 'error');
                return;
            }

            profiles[profileId] = {
                name: profileName,
                platform: 'gemini',
                model: 'gemini-1.5-flash',
                apiKey: '',
                systemPrompt: DEFAULT_PROMPTS.systemPrompt,
                userPrompt: DEFAULT_PROMPTS.userPrompt
            };

            profileModal.classList.remove('show');
            profileNameInput.value = '';
            renderProfiles();
            switchProfile(profileId);
            showStatus('Profile created successfully!', 'success');
        }

        function deleteProfile(profileId) {
            if (profileId === 'default') return;
            
            delete profiles[profileId];
            if (currentProfile === profileId) {
                switchProfile('default');
            }
            renderProfiles();
            showStatus('Profile deleted', 'success');
        }

        async function saveSettings() {
            const apiKey = apiKeyInput.value.trim();
            const platform = platformSelect.value;
            const model = modelSelect.value;

            if (!model) {
                showStatus('Please select a model before saving.', 'error');
                return;
            }

            if (!apiKey) {
                showStatus('API Key is required. Please enter a valid key.', 'error');
                return;
            }
            
            const profile = profiles[currentProfile];
            profile.platform = platformSelect.value;
            profile.model = modelSelect.value;
            profile.apiKey = apiKeyInput.value;
            profile.systemPrompt = systemPromptTextarea.value;
            profile.userPrompt = userPromptTextarea.value;

            chrome.storage.sync.set({ 
                profiles: profiles,
                currentProfile: currentProfile 
            }, () => {
                showStatus('Settings saved successfully!', 'success');
            });
        }

        function loadSettings() {
            return new Promise((resolve) => {
                chrome.storage.sync.get(['profiles', 'currentProfile'], (result) => {
                    if (result.profiles) {
                        profiles = result.profiles;
                    }
                    if (result.currentProfile) {
                        currentProfile = result.currentProfile;
                    }
                    resolve();
                });
            });
        }

        function resetToDefault() {
            if (confirm('Are you sure you want to reset to default settings?')) {
                const profile = profiles[currentProfile];
                profile.platform = 'gemini';
                profile.model = 'gemini-1.5-flash';
                profile.apiKey = '';
                profile.systemPrompt = DEFAULT_PROMPTS.systemPrompt;
                profile.userPrompt = DEFAULT_PROMPTS.userPrompt;
                
                loadProfileData();
                showStatus('Reset to default settings. Remember to save!', 'success');
            }
        }

        function testApiKey(isSilent = false) {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                if (!isSilent) {
                    showStatus('Please enter an API key first', 'error');
                }
                return;
            }

            const platform = platformSelect.value;
            testKeyBtn.textContent = 'Testing...';
            testKeyBtn.disabled = true;

            chrome.runtime.sendMessage({ action: 'testApiKey', platform, apiKey }, (response) => {
                testKeyBtn.textContent = 'Test';
                testKeyBtn.disabled = false;

                if (response && response.error) {
                    const errorMsg = response.error.message || response.error;
                    if (!isSilent) {
                        showStatus(`Error: ${errorMsg}`, 'error');
                    }
                    modelSelect.innerHTML = `<option value="">-- Key validation failed --</option>`;
                    modelSelect.disabled = true;

                } else if (response && Array.isArray(response.models)) { // Gemini, OpenAI
                    if (!isSilent) {
                        showStatus('API key is valid! Models loaded.', 'success');
                    }
                    const availableModels = response.models.filter(model => {
                        if (platform === 'gemini') {
                            return model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent');
                        }
                        if (platform === 'openai') {
                            const modelId = model.name.toLowerCase();
                            const disallowed = ['embed', 'whisper', 'tts', 'dall-e'];
                            return !disallowed.some(term => modelId.includes(term));
                        }
                        return true;
                    });
                    populateModelDropdown(availableModels);

                } else if (response && response.success) { // Anthropic
                    if (!isSilent) {
                        showStatus('API key is valid!', 'success');
                    }
                    populateModelDropdownFromConfig();

                } else {
                    const errorMsg = 'An unknown error occurred during API key validation.';
                    if (!isSilent) {
                        showStatus(`Error: ${errorMsg}`, 'error');
                    }
                    modelSelect.innerHTML = `<option value="">-- ${errorMsg} --</option>`;
                    modelSelect.disabled = true;
                }
            });
        }

        function showStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type} show`;
            
            setTimeout(() => {
                statusMessage.classList.remove('show');
            }, 3000);
        }

        // Initial load
        initialize();
});