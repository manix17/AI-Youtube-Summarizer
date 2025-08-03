// tests/helpers/dom-helpers.ts

import { readFileSync } from 'fs';
import path from 'path';

export const loadHtmlFile = (relativePath: string): string => {
  const filePath = path.join(__dirname, '../../src', relativePath);
  return readFileSync(filePath, 'utf8');
};

export const createYouTubeMockPage = () => {
  return `
    <div id="masthead">YouTube Header</div>
    <div id="page-manager">
      <div id="watch">
        <div id="primary">
          <div id="primary-inner">
            <div id="below">
              <div id="watch-description">Video description area</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const setupYouTubeGlobals = () => {
  (window as any).ytInitialPlayerResponse = {
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [{
          baseUrl: 'https://www.youtube.com/api/timedtext?v=mock&lang=en',
          languageCode: 'en'
        }]
      }
    },
    videoDetails: {
      title: 'Mock Video Title',
      author: 'Mock Channel',
      lengthSeconds: '212'
    }
  };
};

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));