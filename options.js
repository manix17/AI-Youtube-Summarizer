
// options.js

document.addEventListener('DOMContentLoaded', () => {
    let platformConfigs = {};

        let currentProfile = 'default';
        let profiles = {
            default: {
                name: 'Default',
                platform: 'gemini',
                model: 'gemini-1.5-flash',
                apiKey: '',
                systemPrompt: 'You are an expert content summarizer. Analyze the provided YouTube video transcript and create a concise, well-structured summary in bullet points.',
                userPrompt: `Here's a YouTube video transcript. Please provide a concise summary with key points in bullet format:\n\n{transcript}\n\nFocus on:\n- Main topics and themes\n- Key insights and takeaways\n- Important details and conclusions`
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

        async function initialize() {
            try {
                const response = await fetch('platform_configs.json');
                platformConfigs = await response.json();
                
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
                updateModelOptions();
                updatePlatformBadge();
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

        function updateModelOptions() {
            const platform = platformSelect.value;
            const config = platformConfigs[platform];
            
            modelSelect.innerHTML = '';
            config.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                modelSelect.appendChild(option);
            });
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
            currentProfile = profileId;
            loadProfileData();
            renderProfiles();
        }

        function loadProfileData() {
            const profile = profiles[currentProfile];
            platformSelect.value = profile.platform;
            updateModelOptions();
            updatePlatformBadge();
            modelSelect.value = profile.model;
            apiKeyInput.value = profile.apiKey;
            systemPromptTextarea.value = profile.systemPrompt;
            userPromptTextarea.value = profile.userPrompt;
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
                systemPrompt: profiles.default.systemPrompt,
                userPrompt: profiles.default.userPrompt
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

        function saveSettings() {
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
                profiles[currentProfile] = {
                    ...profiles[currentProfile],
                    platform: 'gemini',
                    model: 'gemini-1.5-flash',
                    apiKey: '',
                    systemPrompt: profiles.default.systemPrompt,
                    userPrompt: profiles.default.userPrompt
                };
                loadProfileData();
                showStatus('Reset to default settings', 'success');
            }
        }

        function testApiKey() {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                showStatus('Please enter an API key first', 'error');
                return;
            }

            const platform = platformSelect.value;
            testKeyBtn.textContent = 'Testing...';
            testKeyBtn.disabled = true;

            chrome.runtime.sendMessage({ action: 'testApiKey', platform, apiKey }, (response) => {
                testKeyBtn.textContent = 'Test';
                testKeyBtn.disabled = false;

                if (response.success) {
                    showStatus('API key is valid!', 'success');
                } else {
                    showStatus(`Error: ${response.error}`, 'error');
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
