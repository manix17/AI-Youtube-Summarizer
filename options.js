// options.js

document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_PROMPTS = {
        systemPrompt: `You are an expert content summarizer specializing in YouTube video analysis. Your task is to transform video transcripts into clear, actionable summaries that help viewers quickly understand the key value and decide whether to watch the full video.

FORMATTING REQUIREMENTS:
- Use bullet points with clear hierarchy (main points with sub-points when needed)
- Start with a brief one-sentence overview
- Organize content logically by topics or chronological flow
- Include specific examples, numbers, or actionable items when mentioned
- Use bold text for key concepts and important terms

CONTENT FOCUS:
- Extract the main thesis or purpose of the video
- Identify 3-7 key takeaways or insights
- Include any specific steps, tips, or recommendations
- Include timestamp in generated summary for referring to the video time
- Note important context (who, what, when, where relevant)
- Highlight any surprising or counterintuitive information
- Mention tools, resources, or references if provided

OUTPUT STRUCTURE:
- Overview (1 sentence)
- Key Points (3-7 main bullets with sub-points as needed)
- Actionable Takeaways (if applicable)
- Notable Mentions (tools, resources, people referenced)

Keep summaries concise but comprehensive - aim for someone to get 80% of the value in 20% of the reading time.`,
        userPrompt: `Please analyze this YouTube video transcript and create a comprehensive summary following your formatting guidelines.

**Video Context:**
- Title: {video_title}
- Duration: {video_duration}
- Channel: {channel_name}

**Transcript:**
{transcript}

**Summary Requirements:**
- Provide a one-sentence overview of the video's main purpose
- Extract 3-7 key points with supporting details
- Include any actionable steps, tips, or recommendations
- Highlight specific examples, numbers, or tools mentioned
- Note any surprising insights or counterintuitive information
- End with notable resources or references if mentioned

Focus on creating value for someone who wants to understand the core content without watching the full video.`
    };

    let platformConfigs = {};

        let currentProfile = 'default';
        let profiles = {
            default: {
                name: 'Default',
                platform: 'gemini',
                model: 'gemini-1.5-flash',
                apiKey: '',
                systemPrompt: DEFAULT_PROMPTS.systemPrompt,
                userPrompt: DEFAULT_PROMPTS.userPrompt
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

            if (apiKey) {
                saveBtn.textContent = 'Validating & Saving...';
                saveBtn.disabled = true;

                const response = await new Promise(resolve => {
                    chrome.runtime.sendMessage({ action: 'testApiKey', platform, apiKey }, (response) => {
                        resolve(response);
                    });
                });

                saveBtn.innerHTML = '💾 Save Settings';
                saveBtn.disabled = false;

                if (!response.success) {
                    showStatus(`Invalid API Key: ${response.error}. Settings not saved.`, 'error');
                    return;
                }
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
                saveSettings();
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