# Respawn Desktop — Build Instructions

## What you need
- Node.js (you already have it)
- A Windows PC to build the .exe (or use GitHub Actions)

## Setup on your Mac first

1. Copy this folder to your Desktop
2. Add your icon files:
   - `icon.ico` — Windows icon (256x256 .ico file)
   - `icon.icns` — Mac icon (optional)
   
   You can convert your logo.png to .ico at: https://convertio.co/png-ico/

3. Install dependencies:
   ```
   cd ~/Desktop/respawn-desktop
   npm install
   ```

4. Test it locally:
   ```
   npm start
   ```

## Build the Windows .exe

### Option A — On a Windows PC:
```
npm install
npm run build-win
```
Output will be in `dist/` folder — share the `.exe` installer

### Option B — GitHub Actions (build from Mac):
1. Push this folder to a GitHub repo
2. Add this workflow file at `.github/workflows/build.yml`
3. GitHub will build the .exe for you automatically

## What the app does
- Opens respawnapp.uk in a native window
- Sits in system tray when minimised
- Shows native Windows notifications
- Single instance — won't open twice
- Auto-updates since it loads from your live URL
