#!/usr/bin/env node
/* global __dirname, Buffer */
/**
 * Generate a contact sheet from UI screenshots
 * Requires: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SCREENS_DIR = path.join(__dirname, '../e2e/screens');
const OUTPUT_FILE = path.join(SCREENS_DIR, 'ui-contact-sheet.png');

// Screenshot dimensions from test (390x844 at 2x scale)
const THUMB_WIDTH = 195; // Half size for contact sheet
const THUMB_HEIGHT = 422;
const COLS = 4;
const PADDING = 10;
const LABEL_HEIGHT = 30;

async function generateContactSheet() {
  console.log('📸 Generating UI contact sheet...');

  // Find all ui-*.png files except the contact sheet itself
  const files = fs.readdirSync(SCREENS_DIR)
    .filter(f => f.startsWith('ui-') && f.endsWith('.png') && f !== 'ui-contact-sheet.png')
    .sort();

  if (files.length === 0) {
    console.error('❌ No screenshots found in', SCREENS_DIR);
    process.exit(1);
  }

  console.log(`Found ${files.length} screenshots:`, files.map(f => `\n  - ${f}`).join(''));

  // Calculate grid dimensions
  const rows = Math.ceil(files.length / COLS);
  const canvasWidth = (THUMB_WIDTH + PADDING) * COLS + PADDING;
  const canvasHeight = (THUMB_HEIGHT + LABEL_HEIGHT + PADDING) * rows + PADDING;

  console.log(`Creating ${canvasWidth}x${canvasHeight} contact sheet (${COLS}x${rows} grid)...`);

  // Create base canvas
  const canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 248, g: 249, b: 250, alpha: 1 }
    }
  });

  const composites = [];

  // Process each screenshot
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PADDING + col * (THUMB_WIDTH + PADDING);
    const y = PADDING + row * (THUMB_HEIGHT + LABEL_HEIGHT + PADDING);

    const filePath = path.join(SCREENS_DIR, file);
    
    try {
      // Resize screenshot to thumbnail size
      const thumb = await sharp(filePath)
        .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toBuffer();

      composites.push({
        input: thumb,
        top: y,
        left: x
      });

      // Create label
      const label = file.replace('ui-', '').replace('.png', '').replace(/-/g, ' ');
      const labelSvg = Buffer.from(`
        <svg width="${THUMB_WIDTH}" height="${LABEL_HEIGHT}">
          <rect width="${THUMB_WIDTH}" height="${LABEL_HEIGHT}" fill="#fff" />
          <text x="${THUMB_WIDTH / 2}" y="20" font-family="Arial, sans-serif" font-size="12" 
                fill="#202124" text-anchor="middle" font-weight="600">${label}</text>
        </svg>
      `);

      composites.push({
        input: labelSvg,
        top: y + THUMB_HEIGHT,
        left: x
      });
    } catch (err) {
      console.warn(`⚠️  Failed to process ${file}:`, err.message);
    }
  }

  // Composite all thumbnails and labels onto the canvas
  await canvas
    .composite(composites)
    .png()
    .toFile(OUTPUT_FILE);

  console.log(`✅ Contact sheet saved to ${OUTPUT_FILE}`);
}

generateContactSheet().catch(err => {
  console.error('❌ Failed to generate contact sheet:', err);
  process.exit(1);
});
