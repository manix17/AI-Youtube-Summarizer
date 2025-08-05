# Development Tools

This folder contains development and testing utilities for the YouTube Summarizer extension.

## Files

- **`markdown-test.html`** - Visual test page for the markdown conversion functionality
- **`dom-parser-module.js`** - Auto-generated JavaScript version of `src/utils/dom_parser.ts`

## Usage

### Testing Markdown Conversion

1. **Start Live Server** from the project root:
   ```bash
   # Using Live Server extension in VS Code, or:
   npx live-server
   ```

2. **Open the test page**:
   ```
   http://127.0.0.1:5500/tools/markdown-test.html
   ```

3. **Test features**:
   - Select test samples from the dropdown
   - Use the live test area for custom markdown
   - Visual highlights show the fixed issues:
     - 🟢 Ordered lists (`<ol>`)
     - 🟡 Bold text in headings
     - 🔵 Q1: format handling

### Development Workflow

#### Manual Sync
```bash
npm run sync-parser
```

#### Auto-sync during development
```bash
npm run dev:full
```

This will:
1. Generate the initial JS module from TypeScript
2. Start webpack in watch mode
3. Watch `src/utils/dom_parser.ts` for changes
4. Auto-regenerate `tools/dom-parser-module.js` when the TypeScript file changes

#### Individual commands
```bash
# Sync parser only
npm run sync-parser

# Watch parser file for changes
npm run watch:parser

# Regular webpack dev mode
npm run dev
```

## How it Works

1. **Source**: `src/utils/dom_parser.ts` - Your main TypeScript implementation
2. **Auto-generation**: `scripts/sync-dom-parser.js` - Converts TS to JS
3. **Testing**: `tools/dom-parser-module.js` - JavaScript version for browser testing
4. **Visual Testing**: `tools/markdown-test.html` - Live test interface

### Staying in Sync

The JavaScript module is automatically generated from the TypeScript source:

- ✅ **Always up-to-date**: Changes to `dom_parser.ts` are reflected immediately
- ✅ **Single source of truth**: No duplicate code to maintain
- ✅ **Real-time feedback**: Test changes as you develop

### File Watcher

The `npm run dev:full` command uses:
- **`chokidar-cli`** - Watches TypeScript file for changes
- **`concurrently`** - Runs multiple commands simultaneously
- **Manual conversion** - Strips TypeScript types to create valid JavaScript

## Benefits

- 🔄 **Automatic sync** between TypeScript and JavaScript
- 🎨 **Visual testing** with real data from your test fixtures
- 🚀 **Live development** with instant feedback
- ✅ **Consistency** between test environment and production code