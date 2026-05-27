# Metaphoria Classroom Hosting

The live scoreboard needs `server.js`. A static-only host can show the game, but it cannot share live scores between devices.

## Public Internet Link

Deploy this folder as a Node web app.

Use these settings:

- Build command: `npm install`
- Start command: `npm start`
- Port: use the platform default. `server.js` already reads `process.env.PORT`.

After deployment, share the public URL with students. Everyone who opens the same URL joins the same default room: `CLASS`.

The classroom server keeps a shared Top 10 scoreboard for each room. A score earned on one device can appear on another device, so classmates can see the score to beat.

The teacher should open the dedicated scoreboard page:

```text
https://your-public-game-link.example/teacher-scoreboard.html?room=CLASS
```

Students should open:

```text
https://your-public-game-link.example/index.html?room=CLASS
```

For Netlify, redeploy the whole folder after these files are present:

- `netlify.toml`
- `netlify/functions/classroom.js`
- `package.json`

Without those Netlify Function files deployed, the teacher page is only a static screen and cannot receive scores.

To use another room, add a room code:

```text
https://your-public-game-link.example/index.html?room=SECTIONA
```

## Same Wi-Fi Classroom Link

Double-click `start-classroom.bat`, then share the `Student URL` printed in the window.

If phones cannot open it:

- Make sure all devices are on the same Wi-Fi.
- Allow Node.js through Windows Firewall when prompted.
- Use the computer IP shown by the server, not `localhost`.

## Important

`localhost` means "this device only." Students should never use `localhost` unless the server is running on their own device.
