// injector.js
// This script is injected into the page to access the window object.

try {
    // Access the player response object from the window
    const playerResponse = window.ytInitialPlayerResponse;
    // Send it back to the content script
    window.postMessage({ type: 'FROM_PAGE', payload: playerResponse }, '*');
} catch (e) {
    // Send an error message if it fails
    window.postMessage({ type: 'FROM_PAGE', payload: null, error: e.message }, '*');
}