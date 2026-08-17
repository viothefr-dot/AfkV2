# Minecraft AFK Dashboard

Node.js + Mineflayer web dashboard for servers that permit automation/bots.

## Run locally
1. Install Node.js 18+.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

## Cloud deployment
Deploy this folder to any Node.js hosting service that permits persistent WebSocket/TCP connections. Set the start command to `npm start`.

## Notes
- `offline` authentication only works with servers configured for offline-mode authentication.
- Microsoft authentication is intentionally not implemented in this minimal project; use a legitimate Microsoft account and add secure OAuth/token storage before production use.
- The periodic rotation is a configurable movement/rotation feature. Do not use it to evade a server's anti-AFK or anti-bot rules where automation is prohibited.

## Version selector
The dashboard now includes a Minecraft version selector, including 1.21.11 and several older versions. `Auto-detect` leaves the version unset. The selected version is passed to Mineflayer; the installed Mineflayer/minecraft-protocol release must support that version.

## Chat input
The dashboard now has a chat box. When the bot is connected, messages are sent with Mineflayer's normal `bot.chat()` function.

## Kick-reason logging fix
Kick reasons are now decoded from Minecraft chat-component objects so the dashboard logs a readable reason instead of `[object Object]`.

## Map viewer
The dashboard now renders received Minecraft map-item update packets on a pixelated canvas. It is a manual viewer only and does not OCR, recognize, or submit CAPTCHA answers.
