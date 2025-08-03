// tests/helpers/setup.ts

// Global test setup file
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  
  // Clear any global state
  if (typeof window !== 'undefined') {
    delete (window as any).ytInitialPlayerResponse;
  }
});

// Suppress console errors during tests unless needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Only show errors that aren't expected test errors
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Error during summarization')) {
      // This is an expected error from API tests
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});