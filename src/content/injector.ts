import type { YouTubeWindow, Message } from '../types';

// Cast window to our custom type to access ytInitialPlayerResponse
const ytWindow = window as unknown as YouTubeWindow;

try {
    const playerResponse = ytWindow.ytInitialPlayerResponse;
    
    const message: Message<any> = {
        type: 'FROM_PAGE',
        payload: playerResponse
    };

    window.postMessage(message, '*');

} catch (e: any) {
    const errorMessage: Message<null> = {
        type: 'FROM_PAGE',
        payload: null,
        error: e.message
    };
    window.postMessage(errorMessage, '*');
}
