// background.js - handles server communication
const SERVER_URL = 'http://127.0.0.1:3000';

// Handle messages from content script
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'PING_SERVER') {
    try {
      const response = await fetch(`${SERVER_URL}/ping`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  if (message.type === 'UPDATE_PRESENCE') {
    try {
      const response = await fetch(`${SERVER_URL}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.data)
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

console.log('Background script loaded');