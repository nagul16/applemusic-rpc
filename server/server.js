const express = require('express');
const cors = require('cors');
const { Client } = require('discord-rpc');

const app = express();
const port = 3000;

const clientId = '1373525022819225601'; // Replace with your own app ID

const rpc = new Client({ transport: 'ipc' });

app.use(cors());
app.use(express.json());

// Check if server is running
app.get('/ping', (req, res) => {
  res.send('pong');
});

/**
 * Handle song update from content.js
 */
app.post('/update', async (req, res) => {
  const { isPlaying, title, artist, currentTime, duration } = req.body;

  if (!rpc) {
    return res.status(500).send('RPC client not initialized');
  }

  try {
    const activity = {
      details: title || 'Unknown Song',
      state: artist || 'Unknown Artist',
      largeImageKey: 'applemusic', // should match your uploaded Discord asset name
      largeImageText: 'Apple Music',
      smallImageKey: isPlaying ? 'play' : 'pause',
      smallImageText: isPlaying ? 'Playing' : 'Paused',
      instance: false,
    };

    if (isPlaying) {
      const start = Date.now() - currentTime * 1000;
      const end = start + duration * 1000;
      activity.startTimestamp = Math.floor(start / 1000);
      activity.endTimestamp = Math.floor(end / 1000);
    }

    await rpc.setActivity(activity);
    res.send('Presence updated');
  } catch (error) {
    console.error('Failed to set activity:', error);
    res.status(500).send('Error updating presence');
  }
});

/**
 * Start RPC and server
 */
rpc.on('ready', () => {
  console.log('Discord RPC connected');
  app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
  });
});

rpc.login({ clientId }).catch(console.error);
