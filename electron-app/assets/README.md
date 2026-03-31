# Icon Assets

Place the following icon files here before building:

- `icon.png` — 512x512 PNG (used for Linux + macOS tray)
- `icon.ico` — Windows multi-resolution ICO (16, 32, 48, 256px)
- `icon.icns` — macOS ICNS (16, 32, 64, 128, 256, 512px)
- `dmg-background.png` — 540x380 PNG for macOS DMG background (optional)

## Generating Icons

From a single high-res PNG:

### macOS (.icns)
```bash
brew install imagemagick
convert icon.png -resize 512x512 icon_512.png
# ... or use iconutil
```

### Windows (.ico)
```bash
convert icon.png -resize 256x256 -define icon:auto-resize="256,128,96,64,48,32,16" icon.ico
```

For the tray icon, a transparent background with the logo centered works best.
The Foreman logo concept: a dark background (#0d1f2d) with a teal "F" or wrench icon.
