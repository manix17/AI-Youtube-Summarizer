# GEMINI.md - YouTube Summarizer Chrome Extension

This file configures the project for use with Gemini Code CLI, providing context and guidelines for AI-assisted development.

## Project Overview

**Project Name**: YouTube Summarizer Chrome Extension  
**Type**: Browser Extension (Chrome)  
**Language**: JavaScript/TypeScript  
**Purpose**: AI-powered summarization of YouTube videos  
**Status**: Development/Production Ready  

## Project Structure

```
youtube-summarizer-extension/
├── src/
│   ├── background/          # Service worker scripts
│   │   ├── background.js    # Main background script
│   │   └── api-service.js   # AI API integration
│   ├── content/             # Content scripts for YouTube
│   │   ├── content.js       # Main content script
│   │   ├── ui-injector.js   # UI component injection
│   │   └── video-parser.js  # Video data extraction
│   ├── popup/               # Extension popup interface
│   │   ├── popup.html       # Popup HTML structure
│   │   ├── popup.js         # Popup logic
│   │   └── popup.css        # Popup styling
│   ├── options/             # Settings/options page
│   │   ├── options.html     # Options page HTML
│   │   ├── options.js       # Options page logic
│   │   └── options.css      # Options page styling
│   ├── utils/               # Shared utilities
│   │   ├── storage.js       # Chrome storage helpers
│   │   ├── messaging.js     # Inter-component communication
│   │   └── constants.js     # App constants
│   └── assets/              # Static assets
│       ├── icons/           # Extension icons
│       ├── images/          # UI images
│       └── styles/          # Shared CSS
├── manifest.json            # Extension manifest
├── build/                   # Built/compiled files
├── tests/                   # Test files
├── docs/                    # Documentation
├── package.json             # Dependencies
└── webpack.config.js        # Build configuration
```

## Core Technologies

- **Chrome Extension APIs**: Storage, Tabs, Scripting, Runtime
- **JavaScript/TypeScript**: ES6+, async/await patterns
- **AI Integration**: OpenAI/Claude/Gemini APIs for summarization
- **YouTube Integration**: DOM manipulation, video data extraction
- **Build Tools**: Webpack, Babel, TypeScript compiler
- **Testing**: Jest, Chrome extension testing utilities

## Key Components

### Background Script (`src/background/`)
- Service worker for Chrome Extension Manifest V3
- Handles API communication with AI services
- Manages extension lifecycle and permissions
- Coordinates between content scripts and popup

### Content Scripts (`src/content/`)
- Injected into YouTube pages
- Extracts video metadata and transcript data
- Injects summarization UI elements
- Handles user interactions on YouTube

### Popup Interface (`src/popup/`)
- Main user interface for the extension
- Displays summaries and extension controls
- Manages user preferences and settings
- Provides quick access to summarization features

### Utilities (`src/utils/`)
- Storage management for extension data
- Message passing between components
- Common constants and configuration
- Error handling and logging utilities

## Development Guidelines

### Code Style
- Use ES6+ features and modern JavaScript patterns
- Implement proper error handling and user feedback
- Follow Chrome Extension security best practices
- Maintain clean separation between UI and business logic
- Use descriptive variable and function names

### Chrome Extension Specific
- Always use Manifest V3 APIs
- Implement proper CSP (Content Security Policy)
- Use minimal required permissions
- Handle cross-origin requests securely
- Implement proper cleanup in content scripts

### AI Integration
- Handle API rate limits and errors gracefully
- Implement retry logic for failed requests
- Cache summaries to reduce API calls
- Provide clear user feedback during processing
- Respect user privacy and data handling

## Common Tasks

### Adding New Features
1. Identify which component needs modification
2. Update manifest.json if new permissions needed
3. Implement feature with proper error handling
4. Test across different YouTube page types
5. Update documentation and help files

### API Integration
1. Add API configuration to utils/constants.js
2. Implement API calls in background/api-service.js
3. Handle responses and errors appropriately
4. Update UI to reflect API status and results
5. Test with different API response scenarios

### UI Modifications
1. Update HTML structure in appropriate component
2. Add CSS styling following existing patterns
3. Implement JavaScript interactions
4. Ensure accessibility compliance
5. Test across different screen sizes and themes

## Testing Strategy

### Unit Tests
- Test utility functions independently
- Mock Chrome APIs for testing
- Test API integration with mock responses
- Validate data parsing and transformation

### Integration Tests
- Test component communication
- Validate end-to-end user workflows
- Test with real YouTube pages
- Verify extension lifecycle management

### Manual Testing
- Test on different YouTube video types
- Verify functionality across Chrome versions
- Test with various network conditions
- Validate user experience flows

## Build and Deployment

### Development Build
```bash
npm run dev          # Start development build with watch mode
npm run test         # Run test suite
npm run lint         # Check code quality
```

### Production Build
```bash
npm run build        # Create production build
npm run package      # Package for Chrome Web Store
npm run validate     # Validate extension package
```

## Troubleshooting

### Common Issues
- **Content script not injecting**: Check manifest permissions and content script matches
- **API calls failing**: Verify CORS settings and API key configuration
- **Storage not persisting**: Check Chrome storage permissions and quotas
- **UI not appearing**: Verify CSS injection and YouTube DOM changes

### Debug Tools
- Chrome Developer Tools for extension debugging
- Extension reload workflows during development
- Console logging with appropriate log levels
- Network monitoring for API calls

## Security Considerations

### Data Privacy
- Minimize data collection and storage
- Use secure API communication (HTTPS only)
- Implement proper data encryption for sensitive information
- Clear user data on uninstall if applicable

### Chrome Security
- Use minimal required permissions
- Implement proper CSP headers
- Validate all user inputs
- Sanitize DOM manipulation
- Avoid eval() and similar unsafe practices

## Performance Guidelines

### Optimization
- Lazy load non-critical components
- Implement efficient DOM queries
- Cache API responses appropriately
- Minimize content script impact on page performance
- Use debouncing for user interactions

### Memory Management
- Clean up event listeners properly
- Remove injected DOM elements when not needed
- Manage background script lifecycle efficiently
- Monitor extension memory usage

## AI Assistant Instructions

When working on this project:

1. **Always consider Chrome Extension context** - Remember this is a browser extension with specific security and API constraints
2. **Focus on user experience** - Prioritize smooth integration with YouTube's interface
3. **Handle errors gracefully** - AI APIs can fail; always provide fallback experiences
4. **Maintain privacy** - Be cautious about what data is processed and stored
5. **Test suggestions thoroughly** - Chrome extensions have unique testing requirements
6. **Follow Manifest V3** - Ensure all suggestions are compatible with current Chrome Extension standards
7. **Consider performance impact** - Content scripts should minimize page loading impact

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [YouTube API Documentation](https://developers.google.com/youtube/v3)
- [Chrome Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)

---

*Last Updated: [Current Date]*  
*Gemini Code CLI Compatible: Yes*  
*Project Version: [Current Version]*