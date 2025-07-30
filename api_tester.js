export async function testOpenApiKey(apiKey) {
    if (!apiKey || !apiKey.startsWith('sk-')) {
        return { success: false, error: 'Invalid OpenAI API key format.' };
    }
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.error?.message || `HTTP Error: ${response.status}` };
        }
    } catch (error) {
        return { success: false, error: 'Network error or invalid response.' };
    }
}

export async function testAnthropicApiKey(apiKey) {
    if (!apiKey || apiKey.length <= 20) {
        return { success: false, error: 'Invalid Anthropic API key format.' };
    }
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "claude-3-haiku-20240307",
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }]
            })
        });

        const responseData = await response.json();
        if (response.ok || (response.status === 400 && responseData.error?.type !== 'authentication_error')) {
             return { success: true };
        } else if (response.status === 401 || responseData.error?.type === 'authentication_error') {
            return { success: false, error: 'Authentication failed: Invalid API Key.' };
        } else {
            return { success: false, error: responseData.error?.message || `HTTP Error: ${response.status}` };
        }
    } catch (error) {
        return { success: false, error: 'Network error or invalid response.' };
    }
}

export async function testGeminiApiKey(apiKey) {
    if (!apiKey || apiKey.length <= 30) {
        return { success: false, error: 'Invalid Google Gemini API key format.' };
    }
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.error?.message || `HTTP Error: ${response.status}` };
        }
    } catch (error) {
        return { success: false, error: 'Network error or invalid response.' };
    }
}
