# Test Organization

This directory contains organized tests for the YouTube Summarizer Chrome Extension.

## Structure

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── utils/             # Utility function tests
│   └── ui/                # UI component tests
├── integration/           # Integration tests
├── e2e/                  # End-to-end tests (future)
├── fixtures/             # Test data and fixtures
├── helpers/              # Shared test utilities
│   ├── chrome-mocks.ts   # Chrome API mocking utilities
│   ├── fetch-mocks.ts    # Fetch API mocking utilities
│   ├── dom-helpers.ts    # DOM manipulation helpers
│   └── setup.ts          # Global test setup
└── README.md             # This file
```

## Test Categories

### Unit Tests (`/unit/`)

**Utils Tests** (`/unit/utils/`)
- `api.test.ts` - Tests for API integration utilities
- `api-tester.test.ts` - Tests for API key validation
- `dom-parser.test.ts` - Tests for markdown to HTML conversion
- `loading-messages.test.ts` - Tests for loading message generation

**UI Tests** (`/unit/ui/`)
- `popup.test.ts` - Tests for extension popup interface
- `options.test.ts` - Tests for options page interface

### Integration Tests (`/integration/`)

**Extension Integration** (`/integration/extension.test.ts`)
- Manifest validation
- Build artifact validation  
- UI component integration
- Content script simulation
- Chrome API integration
- Data flow testing

### Fixtures (`/fixtures/`)

- `complex_markdown.json` - Complex markdown test data
- `md_rendering_test.json` - Markdown rendering test cases

### Helpers (`/helpers/`)

**Chrome Mocks** (`chrome-mocks.ts`)
- Provides mock Chrome extension APIs
- Includes runtime, storage, and tabs APIs
- Configurable responses for testing

**Fetch Mocks** (`fetch-mocks.ts`) 
- Mock fetch responses for configuration files
- Handles prompts.json and platform_configs.json

**DOM Helpers** (`dom-helpers.ts`)
- HTML file loading utilities
- YouTube page structure mocking
- DOM manipulation helpers

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- tests/unit/
npm test -- tests/integration/ 
npm test -- tests/unit/utils/

# Run specific test files
npm test -- tests/unit/utils/api.test.ts
npm test -- tests/integration/extension.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Test Patterns

### Unit Test Pattern
```typescript
import { setupChromeMocks } from "../../helpers/chrome-mocks";
import { setupFetchMocks } from "../../helpers/fetch-mocks";

describe("Component Name", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;
  
  beforeEach(() => {
    mockChrome = setupChromeMocks();
    // Additional setup
  });
  
  it("should do something", () => {
    // Test implementation
  });
});
```

### Integration Test Pattern
```typescript
import { loadHtmlFile, createYouTubeMockPage } from "../helpers/dom-helpers";

describe("Integration Test", () => {
  it("should integrate components", () => {
    const html = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = html;
    // Test integration
  });
});
```

## Coverage

Tests aim for comprehensive coverage of:
- ✅ Utility functions (API, parsing, messaging)
- ✅ UI components (popup, options)  
- ✅ Extension integration points
- ✅ Chrome API interactions
- ✅ Build system validation
- ✅ Manifest compliance

## Best Practices

1. **Use appropriate test environment** - JSDOM for DOM tests, Node for pure logic
2. **Mock external dependencies** - Chrome APIs, fetch requests, etc.
3. **Test behavior, not implementation** - Focus on inputs/outputs
4. **Use descriptive test names** - Clear what is being tested
5. **Group related tests** - Use describe blocks for organization
6. **Clean up after tests** - Reset mocks and DOM state
7. **Test error conditions** - Include failure scenarios