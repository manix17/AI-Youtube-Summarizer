# Development Tools

This folder contains development and testing utilities for the YouTube Summarizer extension.

## Files

- **`markdown-test.html`** - Visual test page for the markdown conversion functionality
- **`dom-parser-module.js`** - Auto-generated JavaScript version of `src/utils/dom_parser.ts`
- **`prompt_optimizer.html`** - **NEW** Interactive tool for editing and optimizing prompts
- **`save-server.js`** - Node.js server for saving prompts directly to original file
- **`package.json`** - Dependencies for the save server

## 🚀 Prompt Optimizer Tool

A comprehensive web-based tool for editing and optimizing your YouTube summarizer prompts with maximum viewing area.

### Features

✨ **Modern Interface:**
- Dropdown selection for all available presets
- Side-by-side layout for system and user prompts
- Maximum text area size for optimal content viewing
- Real-time character count and file size statistics
- Responsive design that works on all screen sizes

🎯 **Smart Editing:**
- Live preview of character counts and file sizes
- Temperature and name editing for each preset
- Unsaved changes detection with confirmation dialogs
- Reset functionality to revert changes

💾 **Direct File Saving:**
- Saves directly to the original `../src/assets/prompts.json`
- Automatic backup creation before saving
- No need to manually copy files

### Quick Start

1. **Start the save server:**
   ```bash
   cd tools
   npm install
   npm start
   ```

2. **Open the optimizer:**
   Open `prompt_optimizer.html` in your browser

3. **Load prompts:**
   Click "🔄 Load Default" to load current prompts from the project

4. **Edit prompts:**
   - Select a preset from the dropdown
   - Edit system and user prompts side-by-side
   - Adjust temperature and name as needed

5. **Save changes:**
   Click "💾 Save to Original" to write directly to prompts.json

### Usage Tips

- **Maximum Viewing:** The layout maximizes text area space for comfortable editing of long prompts
- **Real-time Stats:** Watch character counts and file sizes update as you type
- **Backup Safety:** The server automatically creates timestamped backups before saving
- **Hot Reload:** Changes are reflected immediately in the extension after saving

### Server Endpoints

- `GET /health` - Health check endpoint
- `POST /save-prompts` - Save prompts to original file

The save server runs on `http://localhost:3001` and provides CORS headers for browser access.

---

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