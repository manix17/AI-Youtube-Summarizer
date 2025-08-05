// tests/helpers/chrome-mocks.ts

export const createMockChrome = () => ({
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      if (callback) {
        callback({ success: true, models: [{ name: "model-1", displayName: "Model 1" }] });
      }
    }),
    getURL: jest.fn((path) => `chrome-extension://mock-extension-id/${path}`),
    openOptionsPage: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        // Support both callback and Promise API
        if (callback) {
          callback({});
        } else {
          return Promise.resolve({});
        }
      }),
      set: jest.fn((data, callback) => {
        if (callback) {
          callback();
        } else {
          return Promise.resolve();
        }
      }),
      remove: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn((query, callback) => {
      if (callback) {
        callback([{ url: "https://example.com", active: true }]);
      }
    }),
    create: jest.fn(),
  },
});

export const setupChromeMocks = () => {
  const mockChrome = createMockChrome();
  (global as any).chrome = mockChrome;
  return mockChrome;
};