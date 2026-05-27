const http = require("http")
const fs = require("fs")
const path = require("path")
const os = require("os")

const rootDir = __dirname
const port = Number(process.env.PORT || process.argv[2]) || 8000
const rooms = new Map()
const stalePlayerMs = 1000 * 60 * 20
const highScoreLimit = 10
const scoreStorePath = path.join(rootDir, "classroom-scores.json")
let savedScoreStore = loadScoreStore()
let scoreSaveTimer = null

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ico": "image/x-icon"
}

function normalizeRoomCode(value = "CLASS") {
  const clean = String(value || "CLASS")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16)

  return clean || "CLASS"
}

function getRoom(roomCode) {
  const code = normalizeRoomCode(roomCode)

  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      players: new Map(),
      leaders: new Map(getStoredLeaders(code).map(leader => [getLeaderKey(leader.name), leader])),
      clients: new Set()
    })
  }

  return rooms.get(code)
}

function sanitizeText(value, maxLength = 40, fallback = "") {
  const clean = String(value || fallback)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return clean.slice(0, maxLength) || fallback
}

function sanitizeNumber(value, min = 0, max = 999999) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.max(min, Math.min(max, Math.round(number)))
}

function loadScoreStore() {
  try {
    const raw = fs.readFileSync(scoreStorePath, "utf8")
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : { rooms: {} }
  } catch {
    return { rooms: {} }
  }
}

function getStoredLeaders(roomCode) {
  const records = savedScoreStore.rooms?.[roomCode]
  if (!Array.isArray(records)) return []

  return records
    .map(record => ({
      name: sanitizeText(record.name, 16, "Player"),
      score: sanitizeNumber(record.score),
      badges: sanitizeNumber(record.badges, 0, 5),
      game: sanitizeText(record.game, 32, "Lobby"),
      level: sanitizeText(record.level, 18, ""),
      updatedAt: sanitizeNumber(record.updatedAt, 0, Date.now())
    }))
    .filter(record => record.name && record.score > 0)
    .slice(0, highScoreLimit)
}

function getLeaderKey(name) {
  return sanitizeText(name, 16, "Player").toLowerCase()
}

function getRoomLeaders(room) {
  return [...room.leaders.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.badges !== a.badges) return b.badges - a.badges
      return a.name.localeCompare(b.name)
    })
    .slice(0, highScoreLimit)
}

function serializeScores() {
  const roomsPayload = {}

  for (const room of rooms.values()) {
    roomsPayload[room.code] = getRoomLeaders(room)
  }

  for (const [roomCode, leaders] of Object.entries(savedScoreStore.rooms || {})) {
    if (!roomsPayload[roomCode] && Array.isArray(leaders)) {
      roomsPayload[roomCode] = leaders.slice(0, highScoreLimit)
    }
  }

  return { rooms: roomsPayload }
}

function scheduleScoreSave() {
  clearTimeout(scoreSaveTimer)
  scoreSaveTimer = setTimeout(() => {
    try {
      savedScoreStore = serializeScores()
      fs.writeFileSync(scoreStorePath, JSON.stringify(savedScoreStore, null, 2))
    } catch {
      // Some public hosts use temporary or read-only disks. Live scores still work in memory.
    }
  }, 250)
}

function updateRoomLeader(room, player) {
  if (!player.name || player.score <= 0) return

  const key = getLeaderKey(player.name)
  const existing = room.leaders.get(key)
  const shouldReplace = !existing
    || player.score > existing.score
    || (player.score === existing.score && player.badges > existing.badges)

  if (!shouldReplace) return

  room.leaders.set(key, {
    name: player.name,
    score: player.score,
    badges: player.badges,
    game: player.game,
    level: player.level,
    updatedAt: player.updatedAt
  })

  const leaders = getRoomLeaders(room)
  room.leaders = new Map(leaders.map(leader => [getLeaderKey(leader.name), leader]))
  scheduleScoreSave()
}

function getRoomSnapshot(room) {
  const now = Date.now()

  for (const [clientId, player] of room.players) {
    if (now - player.updatedAt > stalePlayerMs) {
      room.players.delete(clientId)
    }
  }

  const players = [...room.players.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.badges !== a.badges) return b.badges - a.badges
      return a.name.localeCompare(b.name)
    })
    .slice(0, 50)

  return {
    roomCode: room.code,
    playerCount: players.length,
    players,
    leaders: getRoomLeaders(room)
  }
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  })
  res.end(JSON.stringify(body))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ""

    req.on("data", chunk => {
      body += chunk
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large."))
        req.destroy()
      }
    })

    req.on("end", () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function broadcastRoom(room) {
  const snapshot = getRoomSnapshot(room)
  const payload = `event: scoreboard\ndata: ${JSON.stringify(snapshot)}\n\n`

  for (const client of room.clients) {
    client.write(payload)
  }
}

function handleEvents(req, res, url) {
  const room = getRoom(url.searchParams.get("room"))

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no"
  })
  res.write(`event: scoreboard\ndata: ${JSON.stringify(getRoomSnapshot(room))}\n\n`)

  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n")
  }, 25000)

  room.clients.add(res)
  req.on("close", () => {
    clearInterval(heartbeat)
    room.clients.delete(res)
  })
}

async function handleScore(req, res) {
  try {
    const body = await readJsonBody(req)
    const room = getRoom(body.roomCode)
    const clientId = sanitizeText(body.clientId, 80, `guest-${Date.now()}`)
    const previous = room.players.get(clientId) || {}
    const now = Date.now()
    const player = {
      clientId,
      name: sanitizeText(body.name, 16, previous.name || "Player"),
      score: sanitizeNumber(body.score),
      streak: sanitizeNumber(body.streak, 0, 999),
      hints: sanitizeNumber(body.hints, 0, 999),
      badges: sanitizeNumber(body.badges, 0, 5),
      game: sanitizeText(body.game, 32, previous.game || "Lobby"),
      level: sanitizeText(body.level, 18, previous.level || ""),
      status: sanitizeText(body.status, 36, previous.status || "Playing"),
      updatedAt: now
    }

    room.players.set(clientId, player)
    updateRoomLeader(room, player)
    broadcastRoom(room)
    sendJson(res, 200, getRoomSnapshot(room))
  } catch (error) {
    sendJson(res, 400, { error: "Could not read score update." })
  }
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname)
  const filePath = path.resolve(rootDir, requestedPath.replace(/^[/\\]+/, ""))
  const relativePath = path.relative(rootDir, filePath)

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Forbidden")
    return
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Not found")
      return
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    })
    res.end(content)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {})
    return
  }

  if (url.pathname === "/api/room" && req.method === "GET") {
    sendJson(res, 200, getRoomSnapshot(getRoom(url.searchParams.get("room"))))
    return
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true })
    return
  }

  if (url.pathname === "/api/events" && req.method === "GET") {
    handleEvents(req, res, url)
    return
  }

  if (url.pathname === "/api/score" && req.method === "POST") {
    await handleScore(req, res)
    return
  }

  serveStatic(req, res, url)
})

server.on("error", error => {
  console.error(`Could not start server on port ${port}: ${error.message}`)
  process.exit(1)
})

server.listen(port, "0.0.0.0", () => {
  const lanUrls = Object.values(os.networkInterfaces())
    .flat()
    .filter(net => net && net.family === "IPv4" && !net.internal)
    .map(net => ({
      student: `http://${net.address}:${port}/index.html?room=CLASS`,
      teacher: `http://${net.address}:${port}/teacher-scoreboard.html?room=CLASS`
    }))

  console.log(`Metaphoria classroom server running at http://localhost:${port}/index.html`)
  console.log(`Teacher Scoreboard: http://localhost:${port}/teacher-scoreboard.html?room=CLASS`)
  lanUrls.forEach(urls => {
    console.log(`Student URL: ${urls.student}`)
    console.log(`Teacher Scoreboard: ${urls.teacher}`)
  })
})
