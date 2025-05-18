// content.js

/**
 * Content script for Apple Music Discord Rich Presence extension.
 * Uses Media Session API as primary source for song info.
 * Falls back to DOM queries to get song title, artist, current time, and duration.
 * Sends updates to local server for Discord RPC.
 */
 let lastSentState = { isPlaying: false, title: null };

 (() => {
    // Server URL for local Discord RPC updater
    const SERVER_URL = 'http://localhost:3000';
  
    // Interval time in ms for sending song info updates
    const UPDATE_INTERVAL = 5000;
  
    // Flag for whether the server connection is confirmed
    let serverAvailable = false;
  
    /**
     * Checks if the local server is running by pinging /ping endpoint.
     */
    function checkServer() {
      fetch(`${SERVER_URL}/ping`, {
        method: 'GET',
        mode: 'no-cors',
      })
        .then(() => {
          serverAvailable = true;
          console.log('[Content] Server connection established');
        })
        .catch(() => {
          serverAvailable = false;
          console.warn('[Content] Cannot connect to local server. Is it running?');
        });
    }
  
    /**
     * Safely tries to get shadow DOM element with chaining.
     * @param {Element} root - starting element
     * @param {Array<string>} selectors - array of selectors or "shadowRoot" string
     * @returns {Element|null}
     */
    function getShadowElement(root, selectors) {
      let current = root;
      for (const sel of selectors) {
        if (!current) return null;
        if (sel === 'shadowRoot') {
          current = current.shadowRoot;
        } else {
          current = current.querySelector(sel);
        }
      }
      return current;
    }
  
    /**
     * Gets song info primarily from Media Session API.
     * Falls back to DOM queries to get title, artist, currentTime, duration.
     * @returns {Object} song info with properties: isPlaying, title, artist, currentTime, duration
     */
    function getSongInfo() {
      let isPlaying = false;
      let title = null;
      let artist = null;
      let currentTime = 0;
      let duration = 0;
  
      // Try Media Session API first
      if (navigator.mediaSession && navigator.mediaSession.metadata) {
        const metadata = navigator.mediaSession.metadata;
        title = metadata.title || null;
        artist = metadata.artist || null;
  
        // Unfortunately mediaSession API does not provide playback state directly
        // We'll check if any audio/video element is playing
        const mediaElements = [...document.querySelectorAll('audio, video')];
        const playingMedia = mediaElements.find(
          (media) => !media.paused && media.readyState > 2
        );
        if (playingMedia) {
          isPlaying = true;
          currentTime = playingMedia.currentTime || 0;
          duration = playingMedia.duration || 0;
        }
      }
  
      // Fallback: if no media session info or missing title/artist, try DOM queries
      if (!title || !artist) {
        // Query Apple Music specific metadata fragments if available
        const fragments = document.querySelectorAll('.lcd-meta-line__fragment');
        if (fragments.length >= 2) {
          title = fragments[0].textContent.trim();
          artist = fragments[1].textContent.trim();
        } else if (fragments.length === 1) {
          title = fragments[0].textContent.trim();
          artist = 'Unknown Artist';
        }
      }
  
      // Fallback for playback state and timing if not set
      if (!isPlaying) {
        // Look for any playing audio elements
        const audios = document.querySelectorAll('audio');
        for (const audio of audios) {
          if (!audio.paused && audio.readyState > 2) {
            isPlaying = true;
            currentTime = audio.currentTime || 0;
            duration = audio.duration || 0;
            break;
          }
        }
      }
  
      return {
        isPlaying,
        title: title || 'Unknown Song',
        artist: artist || 'Unknown Artist',
        currentTime,
        duration,
      };
    }
  
    /**
     * Sends the current song info to the local Discord RPC server.
     * @param {Object} songInfo 
     */
    function sendSongInfo(songInfo) {
      if (!serverAvailable) {
        console.warn('[Content] Server not available. Skipping send.');
        return;
      }
  
      fetch(`${SERVER_URL}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(songInfo),
        mode: 'no-cors',
      }).catch((err) => {
        console.error('[Content] Failed to send update:', err);
        serverAvailable = false; // mark server as down to retry later
      });
    }
  
    // Initial server check
    checkServer();
  
    // Periodic update every 5 seconds
    setInterval(() => {
      if (!serverAvailable) {
        checkServer();
        return;
        
      }
  
      const songInfo = getSongInfo();
  
      if (songInfo.isPlaying) {
        console.log('[Content] Sending song info:', songInfo);
        sendSongInfo(songInfo);
      }
    }, UPDATE_INTERVAL);
  
    console.log('[Content] Content script loaded');
  })();
  