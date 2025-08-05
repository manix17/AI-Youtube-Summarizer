# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Build the extension for production (outputs to `build/` directory)
- `npm run dev` - Start development mode with watch (auto-rebuilds on changes)
- `npm run lint` - Run TypeScript type checking (no emit, just validation)
- `npm test` - Run all Jest tests including unit and integration tests

### Testing
- `npm test` - Run all tests (uses Jest with Puppeteer for integration tests)
- `npm test -- --testNamePattern="dom_parser"` - Run specific test file
- Individual test files are in `tests/` directory with `.test.ts` extension

### Chrome Extension Loading
- Load the `build/` directory as unpacked extension in Chrome Developer Mode
- Enable "Developer mode" at chrome://extensions
- Use "Load unpacked" and select the build directory after running `npm run build`

## Architecture Overview

This is a Manifest V3 Chrome extension that uses AI to summarize YouTube videos by extracting transcripts and processing them through various AI providers.

### Core Architecture Components

**Extension Structure (5 main entry points):**
- `background/` - Service worker handling API calls and message routing
- `content/` - Content script injected into YouTube pages for UI and transcript extraction with dark theme support
- `popup/` - Extension popup interface with status indicators and support section
- `options/` - Options page for profile and API key management with storage optimization
- `injector.ts` - Injected script to access YouTube's player data

**Key Data Flow:**
1. Content script detects YouTube video page and injects summarize UI
2. User clicks summarize → content script extracts transcript and metadata
3. Message sent to background script with transcript + selected profile/preset
4. Background script calls appropriate AI API (OpenAI/Anthropic/Gemini)
5. Response processed and rendered as HTML in content script

### Multi-Provider AI Integration
The extension supports three AI providers with a unified interface:
- **OpenAI** - GPT models via chat completions API
- **Anthropic** - Claude models via messages API  
- **Gemini** - Google's models via generateContent API

All API configurations are centralized in `utils/api.ts` with provider-specific request/response handling.

### Profile System
User configurations are stored as "profiles" containing:
- AI provider and model selection
- API keys (stored securely in Chrome storage)
- Custom prompt presets (system + user prompts)
- Language preferences
- Temperature settings

**Storage Architecture:**
Profiles use an optimized "dual storage" approach:
- **Profile metadata**: Stored under `profile_{profileId}` keys with minimal data (name, platform, model, apiKey, language, currentPreset)
- **Individual presets**: Stored separately under `profile_{profileId}_{presetId}` keys to avoid Chrome storage quota issues
- **Default presets**: Loaded from `assets/prompts.json` and merged with user modifications at runtime
- **Dirty tracking**: Session-based tracking prevents unnecessary storage writes during page reload/navigation

**Storage Optimization Features:**
- Line ending normalization to prevent false differences between stored and DOM content
- Initialization flags prevent premature saves during profile loading
- Storage quota error handling with user-friendly messaging
- Preset reconstruction merges defaults with user customizations efficiently

### Transcript Extraction (Dual Method)
1. **API Method** (preferred): Accesses YouTube's internal player data via injected script to get caption track URLs
2. **DOM Fallback**: Programmatically clicks transcript button and scrapes visible transcript elements

### Testing Strategy

**Test-Driven Development (TDD) Approach:**
This project follows TDD methodology for all new feature development. The red-green-refactor cycle ensures robust, maintainable code:

1. **RED**: Write failing tests first that define the expected behavior
2. **GREEN**: Write minimal code to make tests pass
3. **REFACTOR**: Clean up code while keeping tests green

**Test Structure:**
- **Unit tests**: Individual utility functions and components (`tests/unit/`)
  - Content script functions: UI injection, metadata extraction, transcript handling
  - Background script functions: message handling, API integration, profile management
  - Utility functions: DOM parsing, loading messages, API testing
- **Integration tests**: Full extension workflows using Puppeteer (`tests/integration/`)
- **API tests**: Mock API responses and error handling
- Jest config uses `jest-puppeteer` preset for browser automation

**Current Test Coverage: 99 tests across 9 test suites**
- Content script tests: 21 tests covering UI, YouTube integration, Chrome APIs
- Background script tests: 16 tests covering message handling, summarization, error handling
- Integration tests: Extension manifest validation, build verification, component integration

### Build System
Webpack bundles the extension with multiple entry points:
- TypeScript compilation with path aliases (`@utils/`, `@content/`, etc.)
- CSS processing and asset copying
- Source maps for debugging
- Separate bundles for each extension component

### Path Aliases
All modules use TypeScript path aliases defined in `tsconfig.json`:
```
@utils/* → src/utils/*
@background/* → src/background/* 
@content/* → src/content/*
@popup/* → src/popup/*
@options/* → src/options/*
@assets/* → src/assets/*
```

## Development Notes

### Chrome Extension Permissions
- `activeTab` - Access current YouTube tab only when extension is clicked
- `scripting` - Inject content scripts and CSS
- `storage` - Store user profiles and settings
- `clipboardWrite` - Copy summaries to clipboard
- Host permission for Google AI API endpoints

### Key Files to Understand
- `src/types.ts` - Comprehensive type definitions for all extension components
- `src/utils/api.ts` - Unified AI provider interface and request handling
- `src/utils/api_tester.ts` - API key testing and validation utilities  
- `src/utils/dom_parser.ts` - Markdown to HTML conversion for summary rendering
- `src/utils/loading_messages.ts` - Contextual loading messages during processing
- `src/content/index.ts` - Main content script with UI injection and transcript extraction
- `src/content/injector.ts` - Script injected to access YouTube's internal player data
- `src/background/index.ts` - Message handling and AI API coordination
- `src/options/index.ts` - Profile and API key management interface
- `src/assets/prompts.json` - Default prompt presets for different summary styles
- `src/assets/platform_configs.json` - AI provider configuration and model options
- `manifest.json` - Extension configuration and permissions

### TDD Workflow for New Features

**MANDATORY: All new features MUST follow Test-Driven Development**

**Step 1 - Planning Phase:**
1. Use TodoWrite tool to break down feature into testable units
2. Identify what functions/components need to be created or modified
3. Define expected inputs, outputs, and behavior

**Step 2 - RED Phase (Write Failing Tests):**
1. Create test files in appropriate directory (`tests/unit/` or `tests/integration/`)
2. Write tests that describe the desired behavior
3. Tests should fail initially (red state)
4. Use existing test patterns as reference (see testing patterns below)

**Step 3 - GREEN Phase (Make Tests Pass):**
1. Write minimal implementation to make tests pass
2. Focus on functionality, not optimization
3. Run `npm test` to ensure all tests pass

**Step 4 - REFACTOR Phase (Clean Up):**
1. Improve code quality while keeping tests green
2. Run `npm test` after each refactor to ensure no regressions
3. Run `npm run lint` to ensure TypeScript compliance

**Step 5 - Integration:**
1. Ensure new feature integrates with existing components
2. Update documentation in CLAUDE.md if needed
3. Mark todos as completed using TodoWrite tool

**TDD Example: Adding Video Bookmark Feature**

*RED Phase - Write failing tests:*
```typescript
// tests/unit/content/bookmarks.test.ts
describe("Video Bookmarks", () => {
  it("should create bookmark button", () => {
    const button = createBookmarkButton("5:30", "Important point");
    expect(button.textContent).toContain("5:30");
    expect(button.dataset.timestamp).toBe("330"); // seconds
  });

  it("should save bookmark to storage", async () => {
    await saveBookmark("video123", "5:30", "Test bookmark");
    expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
      "bookmarks_video123": [{ timestamp: "5:30", note: "Test bookmark" }]
    });
  });
});
```

*GREEN Phase - Minimal implementation:*
```typescript
// src/content/bookmarks.ts
export function createBookmarkButton(timestamp: string, note: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = timestamp;
  button.dataset.timestamp = timestampToSeconds(timestamp).toString();
  return button;
}

export async function saveBookmark(videoId: string, timestamp: string, note: string): Promise<void> {
  const key = `bookmarks_${videoId}`;
  await chrome.storage.sync.set({
    [key]: [{ timestamp, note }]
  });
}
```

*REFACTOR Phase - Improve implementation:*
```typescript
// Enhanced with error handling, UI improvements, multiple bookmarks support
export class BookmarkManager {
  private videoId: string;
  
  async addBookmark(timestamp: string, note: string): Promise<void> {
    try {
      const existing = await this.getBookmarks();
      const updated = [...existing, { timestamp, note, id: generateId() }];
      await chrome.storage.sync.set({ [`bookmarks_${this.videoId}`]: updated });
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      throw new Error("Could not save bookmark");
    }
  }
}
```

### Common Development Patterns
- All Chrome API calls use promises/async-await
- Message passing between extension components uses typed interfaces
- Error handling includes user-friendly messages and fallback behaviors  
- UI components seamlessly adapt to YouTube's dark/light mode via MutationObserver
- Storage operations are optimized with dirty tracking and batch operations to avoid quota limits
- Session-based state management prevents unnecessary Chrome storage writes
- Line ending normalization ensures cross-platform consistency

### Security and Performance Considerations
- **Manifest V3 Compliance**: Uses service workers instead of background pages
- **Minimal Permissions**: Only requests essential permissions (activeTab, scripting, storage)
- **Content Security Policy**: Follows strict CSP guidelines, no eval() usage
- **Memory Management**: Proper cleanup of event listeners and DOM elements
- **API Rate Limiting**: Graceful handling of API limits with retry logic
- **Data Privacy**: API keys stored locally, no data sent to third parties except chosen AI provider

### Chrome Extension Specific Patterns
- Content script injection only on YouTube video pages (`*://www.youtube.com/watch?v=*`)
- Background script handles all external API calls to comply with CORS
- UI injection waits for DOM elements to load and handles YouTube's dynamic content
- Cross-component communication via Chrome's message passing API with typed interfaces
- Storage uses Chrome's sync storage for user settings persistence across devices

### User Experience Features

**Dark Theme Integration:**
- Automatic detection of YouTube's dark/light mode via `MutationObserver`
- Seamless styling that matches YouTube's native design system
- Applied to both summary containers and UI controls (selects, buttons)
- CSS classes dynamically toggled based on `html[dark]` attribute

**Extension Popup Interface:**
- Modern glassmorphism design with gradient backgrounds and animated particles
- Real-time status indicators showing extension state and YouTube page detection
- Integrated support section with attractive heart icon linking to Buy Me a Coffee
- Optimized layout fitting all content without scrolling (550px height)
- Smooth animations and hover effects throughout the interface

**Storage Quota Management:**
- Intelligent error handling for Chrome storage quota exceeded scenarios
- User-friendly error messages with actionable guidance
- Automatic storage usage tracking and optimization
- Profile and preset data distributed across multiple storage keys to avoid limits

### Testing Patterns and Best Practices

**Chrome API Mocking Pattern:**
```typescript
// Enhanced mocking supports both callback and Promise APIs
mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
  const data = { /* test data */ };
  if (callback) {
    callback(data);  // Callback-based (content script)
  } else {
    return Promise.resolve(data);  // Promise-based (background script)
  }
});
```

**DOM Testing Pattern:**
```typescript
// Test DOM manipulation and element creation
it("should create UI elements", () => {
  const container = document.createElement("div");
  container.id = "test-container";
  document.body.appendChild(container);
  
  expect(document.getElementById("test-container")).toBeTruthy();
});
```

**YouTube-Specific Testing:**
```typescript
// Mock YouTube page elements
document.body.innerHTML = `
  <h1 class="style-scope ytd-watch-metadata">Test Video</h1>
  <ytd-channel-name><div id="text"><a>Test Channel</a></div></ytd-channel-name>
`;

const titleElement = document.querySelector("h1.style-scope.ytd-watch-metadata");
expect(titleElement?.textContent).toBe("Test Video");
```

**Message Handler Testing Pattern:**
```typescript
// Test Chrome extension message handling
const sendResponse = jest.fn();
const request = { type: "testMessage", payload: { data: "test" } };

messageHandler(request, {}, sendResponse);
expect(sendResponse).toHaveBeenCalledWith(expectedResponse);
```

**Async Operation Testing:**
```typescript
// Handle async operations in tests
messageHandler(request, {}, sendResponse);
await new Promise(resolve => setTimeout(resolve, 100));
expect(mockFunction).toHaveBeenCalled();
```

**Error Handling Testing:**
```typescript
// Test error scenarios
mockFunction.mockRejectedValue(new Error("Test error"));
// ... trigger the error condition
expect(sendResponse).toHaveBeenCalledWith({
  success: false,
  error: "Test error"
});
```

The codebase follows a modular architecture with clear separation between extension components, comprehensive error handling, and support for multiple AI providers through a unified interface.