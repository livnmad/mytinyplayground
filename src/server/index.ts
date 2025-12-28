import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Serve built client assets
app.use(express.static(path.resolve(process.cwd(), 'dist')));
// Serve public assets like images
app.use('/images', express.static(path.resolve(process.cwd(), 'public/images')));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

// List available images from public/images
app.get('/api/images', (req, res) => {
  const imagesDir = path.resolve(process.cwd(), 'public/images');
  fs.readdir(imagesDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: 'Unable to read images directory' });
      return;
    }
    const images = (files || [])
      .filter((f) => /(\.png|\.jpg|\.jpeg|\.gif)$/i.test(f))
      .map((f) => `/images/${f}`);
    res.json({ images });
  });
});

// SPA fallback: serve index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
