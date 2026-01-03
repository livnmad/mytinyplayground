import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
const fsp = fs.promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Serve built client assets
app.use(express.static(path.resolve(process.cwd(), 'dist')));
// Serve public assets like images
app.use('/images', express.static(path.resolve(process.cwd(), 'public/images')));
// Serve theme assets
app.use('/Themes', express.static(path.resolve(process.cwd(), 'public/Themes')));

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

// List available themes from public/Themes (folder names)
app.get('/api/themes', (req, res) => {
  const themesDir = path.resolve(process.cwd(), 'public/Themes');
  fs.readdir(themesDir, { withFileTypes: true }, async (err, entries) => {
    if (err) {
      res.status(500).json({ error: 'Unable to read themes directory' });
      return;
    }
    const dirs = (entries || []).filter((e) => e.isDirectory());
    const requiredCodes = ['00', ...Array.from({ length: 20 }, (_, i) => (i + 1).toString().padStart(2, '0'))];

    const isComplete = async (dirName: string) => {
      try {
        const files = await fsp.readdir(path.resolve(themesDir, dirName));
        const imageFiles = files.filter((f) => /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(f));
        const faceFile = imageFiles.find((f) => /^00\.(png|jpg|jpeg|gif|webp)$/i.test(f));
        const hasAllCards = requiredCodes.slice(1).every((code) =>
          imageFiles.some((f) => new RegExp(`^${code}\.(png|jpg|jpeg|gif|webp)$`, 'i').test(f))
        );
        return !!faceFile && hasAllCards;
      } catch {
        return false;
      }
    };

    try {
      const checks = await Promise.all(
        dirs.map(async (d) => ({ name: d.name, ok: await isComplete(d.name) }))
      );
      const themes = checks
        .filter((c) => c.ok)
        .map((c) => ({ id: c.name, name: c.name.replace(/_/g, ' ') }));
      res.json({ themes });
    } catch {
      res.status(500).json({ error: 'Unable to evaluate themes' });
    }
  });
});

// List theme images (00 as face, 01-20 for cards). Returns URLs.
app.get('/api/themes/:theme/images', (req, res) => {
  const themeId = req.params.theme;
  const themeDir = path.resolve(process.cwd(), 'public/Themes', themeId);
  fs.readdir(themeDir, (err, files) => {
    if (err) {
      res.status(404).json({ error: 'Theme not found' });
      return;
    }
    const imageFiles = (files || []).filter((f) => /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(f));
    const faceFile = imageFiles.find((f) => /^00\.(png|jpg|jpeg|gif|webp)$/i.test(f));
    const cardFiles = imageFiles.filter((f) => /^(0[1-9]|1[0-9]|20)\.(png|jpg|jpeg|gif|webp)$/i.test(f));
    const face = faceFile ? `/Themes/${themeId}/${faceFile}` : null;
    const cards = cardFiles
      .sort() // ensure stable order
      .map((f) => ({ code: f.slice(0, 2), url: `/Themes/${themeId}/${f}` }));
    res.json({ theme: { id: themeId, name: themeId.replace(/_/g, ' ') }, face, cards });
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
