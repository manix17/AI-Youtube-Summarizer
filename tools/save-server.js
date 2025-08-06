#!/usr/bin/env node

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Serve static files from the entire project root
const PROJECT_ROOT = path.join(__dirname, '..');
app.use(express.static(PROJECT_ROOT));

// Path to the prompts.json file
const PROMPTS_FILE_PATH = path.join(__dirname, '..', 'src', 'assets', 'prompts.json');

// Root endpoint with links to tools
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>YouTube Summarizer - Dev Server</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .tools {
                    display: grid;
                    gap: 20px;
                    margin-top: 30px;
                }
                .tool-card {
                    border: 2px solid #e1e5e9;
                    border-radius: 8px;
                    padding: 20px;
                    text-decoration: none;
                    color: inherit;
                    transition: border-color 0.3s, transform 0.3s;
                }
                .tool-card:hover {
                    border-color: #667eea;
                    transform: translateY(-2px);
                }
                .tool-title {
                    font-size: 1.2em;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #333;
                }
                .tool-description {
                    color: #666;
                    margin-bottom: 0;
                }
                .status {
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                    color: #155724;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 YouTube Summarizer - Dev Server</h1>
                <div class="status">✅ Server running on http://localhost:${PORT}</div>
            </div>
            
            <div class="tools">
                <a href="/tools/prompt_optimizer.html" class="tool-card">
                    <div class="tool-title">🎯 Prompt Optimizer</div>
                    <p class="tool-description">Edit and optimize YouTube summarizer prompts with side-by-side layout and direct file saving</p>
                </a>
                
                <a href="/tools/markdown-test.html" class="tool-card">
                    <div class="tool-title">📝 Markdown Test</div>
                    <p class="tool-description">Visual test page for markdown conversion functionality with live preview</p>
                </a>
                
                <a href="/health" class="tool-card">
                    <div class="tool-title">🔍 Health Check</div>
                    <p class="tool-description">API endpoint status and server information</p>
                </a>
            </div>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'YouTube Summarizer Dev Server is running',
        port: PORT,
        tools: {
            promptOptimizer: `http://localhost:${PORT}/tools/prompt_optimizer.html`,
            markdownTest: `http://localhost:${PORT}/tools/markdown-test.html`
        }
    });
});

// Utility function to normalize and clean data
function normalizePromptData(data) {
    // Deep clone to avoid modifying original
    const normalized = JSON.parse(JSON.stringify(data));
    
    // Normalize line endings and clean text in all prompt fields
    function normalizeText(text) {
        if (typeof text !== 'string') return text;
        
        return text
            // Normalize line endings to LF (Unix style)
            .replace(/\r\n/g, '\n')  // CRLF to LF
            .replace(/\r/g, '\n')    // CR to LF
            // Remove zero-width characters and other invisible characters
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            // Normalize Unicode characters to NFC (canonical form)
            .normalize('NFC')
            // Trim excessive whitespace while preserving intentional formatting
            .replace(/[ \t]+$/gm, '') // Remove trailing spaces/tabs from lines
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to maximum 2
            // Fix common encoding issues
            .replace(/â€™/g, "'")  // Fix smart quotes
            .replace(/â€œ/g, '"')  // Fix smart quotes
            .replace(/â€/g, '"')   // Fix smart quotes
            .replace(/â€"/g, '—')  // Fix em dash
            .replace(/â€"/g, '–')  // Fix en dash
            .replace(/â€¦/g, '…')  // Fix ellipsis
            // Ensure consistent quotes
            .replace(/[""]/g, '"')  // Normalize curly quotes to straight
            .replace(/['']/g, "'"); // Normalize curly apostrophes
    }
    
    // Apply normalization to all preset fields
    if (normalized.presets) {
        Object.keys(normalized.presets).forEach(presetKey => {
            const preset = normalized.presets[presetKey];
            if (preset.name) {
                preset.name = normalizeText(preset.name);
            }
            if (preset.system_prompt) {
                preset.system_prompt = normalizeText(preset.system_prompt);
            }
            if (preset.user_prompt) {
                preset.user_prompt = normalizeText(preset.user_prompt);
            }
        });
    }
    
    return normalized;
}

// Utility function to validate and format JSON consistently
function formatJsonConsistently(data) {
    // Use consistent JSON formatting with proper spacing
    return JSON.stringify(data, null, 2)
        // Ensure consistent line endings (LF)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Add final newline for POSIX compliance
        + '\n';
}

// Save prompts endpoint
app.post('/save-prompts', async (req, res) => {
    try {
        const promptsData = req.body;
        
        // Validate the data structure
        if (!promptsData || typeof promptsData !== 'object') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid prompts data structure' 
            });
        }

        if (!promptsData.presets || typeof promptsData.presets !== 'object') {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing or invalid presets data' 
            });
        }

        // Create backup of original file
        try {
            const backupPath = PROMPTS_FILE_PATH.replace('.json', `.backup.${Date.now()}.json`);
            await fs.copyFile(PROMPTS_FILE_PATH, backupPath);
            console.log(`✅ Created backup: ${path.basename(backupPath)}`);
        } catch (backupError) {
            console.warn('⚠️  Could not create backup file:', backupError.message);
        }

        // Normalize and clean the data
        console.log('🔧 Normalizing line endings and cleaning encoding...');
        const normalizedData = normalizePromptData(promptsData);
        
        // Format JSON consistently
        const formattedJson = formatJsonConsistently(normalizedData);
        
        // Write with explicit UTF-8 encoding
        await fs.writeFile(PROMPTS_FILE_PATH, formattedJson, { encoding: 'utf8' });
        
        console.log(`✅ Successfully saved prompts to: ${PROMPTS_FILE_PATH}`);
        console.log(`📊 File size: ${(formattedJson.length / 1024).toFixed(1)} KiB`);
        console.log(`🔧 Applied normalization: line endings, encoding cleanup, text formatting`);
        
        res.json({ 
            success: true, 
            message: `Prompts saved successfully to ${path.basename(PROMPTS_FILE_PATH)}! Applied normalization and encoding fixes.`,
            fileSize: `${(formattedJson.length / 1024).toFixed(1)} KiB`,
            presetCount: Object.keys(normalizedData.presets).length,
            normalized: true,
            encoding: 'UTF-8',
            lineEndings: 'LF (Unix)'
        });

    } catch (error) {
        console.error('❌ Error saving prompts:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to save prompts: ${error.message}` 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 YouTube Summarizer Dev Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Available Tools:');
    console.log(`   🎯 Prompt Optimizer: http://localhost:${PORT}/tools/prompt_optimizer.html`);
    console.log(`   📝 Markdown Test:    http://localhost:${PORT}/tools/markdown-test.html`);
    console.log(`   🔍 Health Check:     http://localhost:${PORT}/health`);
    console.log('');
    console.log(`📁 Serving files from: ${PROJECT_ROOT}`);
    console.log(`💾 Saves prompts to:   ${PROMPTS_FILE_PATH}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down save server...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});