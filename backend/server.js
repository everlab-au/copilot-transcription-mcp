import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads') });

const WHISPER_BINARY = path.join(__dirname, 'whisper-bin', 'whisper-cli');
const MODEL_PATH = path.join(__dirname, 'whisper-bin', 'ggml-tiny.bin');

// if (!fs.existsSync(WHISPER_BINARY)) {
//   console.error('❌ Whisper binary not found at:', WHISPER_BINARY);
//   process.exit(1);
// }
// if (!fs.existsSync(MODEL_PATH)) {
//   console.error('❌ Whisper model not found at:', MODEL_PATH);
//   process.exit(1);
// }

app.post('/transcribe', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No audio file uploaded');
  }

  const uploadedPath = req.file.path;
  console.log('📥 Uploaded file:', uploadedPath);
  const wavPath = `${uploadedPath}.wav`;
  const txtOutput = `${uploadedPath}.txt`;

  // Step 1: Convert to WAV
  const ffmpegCmd = `ffmpeg -y -i ${uploadedPath} -ar 16000 -ac 1 -c:a pcm_s16le ${wavPath}`;
  console.log(`🎙️ Converting to WAV: ${ffmpegCmd}`);

  exec(ffmpegCmd, (ffmpegErr) => {
    if (ffmpegErr) {
      console.error('❌ FFmpeg conversion failed:', ffmpegErr);
      return res.status(500).send('Failed to convert audio');
    }

    // Step 2: Run whisper.cpp
    const whisperCmd = `${WHISPER_BINARY} -m ${MODEL_PATH} -f ${wavPath} -otxt -of ${uploadedPath}`;
    console.log(`🧠 Running Whisper: ${whisperCmd}`);

    exec(whisperCmd, (whisperErr) => {
      if (whisperErr) {
        console.error('❌ Whisper execution failed:', whisperErr);
        return res.status(500).send('Transcription failed');
      }

      fs.readFile(txtOutput, 'utf8', (readErr, transcript) => {
        if (readErr) {
          console.error('❌ Failed to read transcript:', readErr);
          return res.status(500).send('Failed to read transcript');
        }

        res.json({ text: transcript });

        // Cleanup
        [uploadedPath, wavPath, txtOutput].forEach((file) => {
          fs.unlink(file, () => {});
        });
      });
    });
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the Whisper Local Transcriber');
});

app.listen(3001, '0.0.0.0', () => {
  console.log('🚀 Whisper server ready at http://localhost:3001');
});
