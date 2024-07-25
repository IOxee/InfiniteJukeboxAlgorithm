import fetch from 'node-fetch';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const clientId = '533b832102e9496ca59ad3d47962a0a5';
const clientSecret = 'cb6b85c138e54eb6b2bbd2ba38e4a18e';
const outputPath = "../js/examples/playerAndVisualizer/data";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getSpotifyAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

async function fetchTrackDetails(trackId, accessToken) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const trackDetails = await response.json();
  return trackDetails.name;
}

async function fetchTrackAnalysis(trackId, trackName, accessToken, outputPath) {
  const response = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  const analysisPath = path.join(outputPath, `${trackName}.json`);
  fs.writeFileSync(analysisPath, JSON.stringify(data, null, 2));
}

async function downloadFromSpotify(spotifyUrl, outputPath) {  
  const accessToken = await getSpotifyAccessToken();
  const trackId = new URL(spotifyUrl).pathname.split('/').pop();
  
  const trackName = await fetchTrackDetails(trackId, accessToken);
  await fetchTrackAnalysis(trackId, trackName, accessToken, outputPath);

  const command = `spotifydl "${spotifyUrl}" --output "${outputPath}" --output-only --output-file-type "wav"`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar spotifydl: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error en spotifydl: ${stderr}`);
      return;
    }

    console.log(`Salida de spotifydl: ${stdout}`);
  });
}

async function main() {
  rl.question('Enter the name of the song: ', async (songName) => {
    const accessToken = await getSpotifyAccessToken();
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=1`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    if (data.tracks && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      console.log(`Found track: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
      downloadFromSpotify(track.external_urls.spotify, outputPath, track.name);
    } else {
      console.log('No tracks found');
    }
    rl.close();
  });
}

main();