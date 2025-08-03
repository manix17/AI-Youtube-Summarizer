// tests/helpers/fetch-mocks.ts

export const createMockFetch = () => {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('prompts.json')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          presets: {
            detailed: {
              name: 'Detailed Summary',
              system_prompt: 'You are a helpful assistant.',
              user_prompt: 'Summarize this video transcript.',
              temperature: 0.7,
            },
          },
        }),
      });
    }
    
    if (url.includes('platform_configs.json')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          openai: { 
            name: 'OpenAI', 
            className: 'openai',
            models: [{ value: 'gpt-4', label: 'GPT-4' }] 
          },
          gemini: { 
            name: 'Google Gemini', 
            className: 'gemini',
            models: [{ value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }] 
          },
          anthropic: { 
            name: 'Anthropic', 
            className: 'anthropic',
            models: [{ value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' }] 
          },
        }),
      });
    }
    
    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });
};

export const setupFetchMocks = () => {
  const mockFetch = createMockFetch();
  global.fetch = mockFetch;
  return mockFetch;
};