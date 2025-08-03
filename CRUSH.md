# CRUSH.md - YouTube Summarizer Chrome Extension

## Build Commands
- `npm run build` - Production build
- `npm run dev` - Development build with watch mode

## Test Commands
- `npm test` - Run all tests
- `npm test -- tests/filename.test.ts` - Run a single test file
- `npm test -- --watch` - Run tests in watch mode

## Lint/Typecheck Commands
- `npm run lint` - Type checking with TypeScript (no emit)

## Code Style Guidelines

### General Development
- Use ES6+ features and modern JavaScript patterns
- Implement proper error handling and user feedback
- Maintain clean separation between UI and business logic
- Use descriptive variable and function names

### Imports
- Use absolute imports with @ prefix (e.g., @utils/api, @content/index)
- Group imports: node modules, absolute imports, relative imports
- Alphabetize within each group

### Formatting
- TypeScript with strict mode enabled
- 2 space indentation

### Types
- Use TypeScript strict mode (noImplicitAny, strictNullChecks)
- Define interfaces for complex objects
- Prefer const/let over var

### Naming Conventions
- camelCase for variables and functions
- PascalCase for interfaces and classes
- UPPER_SNAKE_CASE for constants

### Error Handling
- Always handle API errors gracefully
- Use try/catch for async operations
- Provide user feedback for failures
- Handle API rate limits and errors gracefully
- Implement retry logic for failed requests

### Chrome Extension Specific
- Use Manifest V3 APIs
- Respect user privacy and data handling
- Handle cross-origin requests securely
- Implement proper CSP (Content Security Policy)
- Use minimal required permissions
- Implement proper cleanup in content scripts

### AI Integration
- Handle API rate limits and errors gracefully
- Implement retry logic for failed requests
- Cache summaries to reduce API calls
- Provide clear user feedback during processing
- Respect user privacy and data handling

## Project Structure
- src/ - Source code
  - background/ - Service worker for Chrome Extension Manifest V3
  - content/ - Injected into YouTube pages
  - popup/ - Main user interface for the extension
  - options/ - Options page for extension settings
  - utils/ - Utility functions and helpers
- tests/ - Test files
- assets/ - Images, CSS, JSON configs

## Testing Strategy
- Test utility functions independently
- Mock Chrome APIs for testing
- Test API integration with mock responses
- Validate data parsing and transformation
- Test component communication
- Validate end-to-end user workflows