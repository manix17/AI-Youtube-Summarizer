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
- `content/` - Content script injected into YouTube pages for UI and transcript extraction
- `popup/` - Extension popup interface with status indicators
- `options/` - Options page for profile and API key management
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

Profiles use a "lean storage" approach - only user modifications are stored, with defaults loaded from `assets/prompts.json` at runtime.

### Transcript Extraction (Dual Method)
1. **API Method** (preferred): Accesses YouTube's internal player data via injected script to get caption track URLs
2. **DOM Fallback**: Programmatically clicks transcript button and scrapes visible transcript elements

### Testing Strategy
- **Unit tests**: Individual utility functions (dom_parser, loading_messages, etc.)
- **Integration tests**: Full extension workflows using Puppeteer
- **API tests**: Mock API responses and error handling
- Jest config uses `jest-puppeteer` preset for browser automation

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

### Common Development Patterns
- All Chrome API calls use promises/async-await
- Message passing between extension components uses typed interfaces
- Error handling includes user-friendly messages and fallback behaviors  
- UI components adapt to YouTube's dark/light mode
- Storage operations are batched to avoid quota limits

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

The codebase follows a modular architecture with clear separation between extension components, comprehensive error handling, and support for multiple AI providers through a unified interface.