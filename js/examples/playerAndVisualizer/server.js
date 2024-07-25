// Illustrates how to connect the Infinite Jukebox algorithm to audio and a
// visualizer. See ./README.md for details.
//

import express from 'express';
import fetch from 'node-fetch';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = 2012;
const repoRoot = path.join(__dirname, '../../../');
const algorithmDir = path.join(repoRoot, 'js', 'algorithm');

function serveLocalOrRemotePath(app, sourcePath, targetPath) {
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    app.get(sourcePath, async (req, resp) => {
      try {
        const fetchResult = await fetch(targetPath);
        if (fetchResult.ok) {
          resp.set('Content-Type', fetchResult.headers.get('Content-Type'));
          fetchResult.body.pipe(resp);
        } else {
          resp.status(fetchResult.status).send();
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        resp.status(500).send();
      }
    });
  } else {
    app.use(sourcePath, express.static(targetPath));
  }
}

function main(args) {
  if (args.length !== 1) {
    console.log('Usage: node server.js <song>');
    return;
  }

  const [song] = args;
  // ahora se le va a pasar una nombre de una cancion. y tendra que montar el siguiente enlace, todos empiezan con data/ y 1 termina en .json y el otro en .wav
  let spotifyAnalysisPath = `data/${song}.json`;
  let songPath = `data/${song}.wav`;

  if (song.startsWith('http://') || song.startsWith('https://')) {
    spotifyAnalysisPath = song;
    songPath = song;
  }

  const app = express();

  serveLocalOrRemotePath(app, '/data/analysis.json', spotifyAnalysisPath);
  serveLocalOrRemotePath(app, '/data/song.wav', songPath);
  app.use('/algorithm', express.static(algorithmDir));
  app.use('/', express.static('./web'));

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

main(process.argv.slice(2));
