const params = new URLSearchParams(window.location.search)
let roomCode = normalizeRoom(params.get("room") || "CLASS")
let classroomApiBase = getInitialClassroomApiBase()
let eventSource = null
let pollTimer = null

const roomInput = document.getElementById("roomInput")
const roomButton = document.getElementById("roomButton")
const studentLink = document.getElementById("studentLink")
const copyLinkButton = document.getElementById("copyLinkButton")
const liveRows = document.getElementById("liveRows")
const topRows = document.getElementById("topRows")
const liveCount = document.getElementById("liveCount")
const topCount = document.getElementById("topCount")
const connectionStatus = document.getElementById("connectionStatus")
const lastUpdated = document.getElementById("lastUpdated")

function normalizeRoom(value) {
  const clean = String(value || "CLASS")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16)

  return clean || "CLASS"
}

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "")
}

function getInitialClassroomApiBase() {
  const fromUrl = normalizeApiBase(params.get("api") || "")

  if (fromUrl) {
    try {
      localStorage.setItem("metaphoriaClassroomApi", fromUrl)
    } catch {
      // API still works for this page load.
    }
    return fromUrl
  }

  const fromConfig = normalizeApiBase(window.METAPHORIA_API_BASE || "")
  if (fromConfig) return fromConfig

  try {
    const saved = normalizeApiBase(localStorage.getItem("metaphoriaClassroomApi") || "")
    if (saved) return saved
  } catch {
    // Ignore storage limits.
  }

  if (window.location.hostname.includes("netlify.app")) {
    return "/.netlify/functions/classroom"
  }

  return ""
}

function isNetlifyFunctionApi() {
  return /\/\.netlify\/functions\/classroom$/i.test(classroomApiBase)
}

function getApiUrl(path, query = "") {
  if (!classroomApiBase) return `${path}${query}`
  if (isNetlifyFunctionApi()) return `${classroomApiBase}${query}`
  return `${classroomApiBase}${path}${query}`
}

function getRoomUrl() {
  return getApiUrl("/api/room", `?room=${encodeURIComponent(roomCode)}`)
}

function getEventsUrl() {
  if (isNetlifyFunctionApi()) return ""
  return getApiUrl("/api/events", `?room=${encodeURIComponent(roomCode)}&teacher=1`)
}

function shouldShareApiParam() {
  return Boolean(classroomApiBase && !isNetlifyFunctionApi())
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]))
}

function getStudentUrl() {
  const url = new URL("/index.html", window.location.origin)
  url.searchParams.set("room", roomCode)

  if (shouldShareApiParam()) {
    url.searchParams.set("api", classroomApiBase)
  }

  return url.href
}

function updateRoomUi() {
  roomInput.value = roomCode
  studentLink.textContent = getStudentUrl()
}

function createLiveRows(players = []) {
  if (!players.length) {
    return `<tr><td class="empty-cell" colspan="8">Waiting for students to join this room.</td></tr>`
  }

  return players.map((player, index) => `
    <tr>
      <td class="rank-cell">${index + 1}</td>
      <td>${escapeHtml(player.name || "Player")}</td>
      <td class="score-cell">${Number(player.score) || 0}</td>
      <td>${escapeHtml(player.game || "Lobby")}</td>
      <td>${escapeHtml(player.level || "-")}</td>
      <td>${Number(player.streak) || 0}</td>
      <td>${Number(player.hints) || 0}</td>
      <td>${Number(player.badges) || 0}/5</td>
    </tr>
  `).join("")
}

function createTopRows(leaders = []) {
  if (!leaders.length) {
    return `<tr><td class="empty-cell" colspan="6">No student has earned a score yet.</td></tr>`
  }

  return leaders.map((player, index) => `
    <tr>
      <td class="rank-cell">${index + 1}</td>
      <td>${escapeHtml(player.name || "Player")}</td>
      <td class="score-cell">${Number(player.score) || 0}</td>
      <td>${escapeHtml(player.game || "Lobby")}</td>
      <td>${escapeHtml(player.level || "-")}</td>
      <td>${Number(player.badges) || 0}/5</td>
    </tr>
  `).join("")
}

function setStatus(connected, message) {
  connectionStatus.textContent = message
  connectionStatus.classList.toggle("connected", connected)
  connectionStatus.classList.toggle("offline", !connected)
}

function renderScoreboard(data) {
  const players = Array.isArray(data.players) ? data.players : []
  const leaders = Array.isArray(data.leaders) ? data.leaders : []

  liveRows.innerHTML = createLiveRows(players)
  topRows.innerHTML = createTopRows(leaders)
  liveCount.textContent = `${players.length} live`
  topCount.textContent = `Top ${leaders.length}`
  lastUpdated.textContent = `Last update: ${new Date().toLocaleTimeString()}`
  setStatus(true, `Connected to room ${data.roomCode || roomCode}`)
}

function fetchScores() {
  return fetch(getRoomUrl(), { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Scoreboard server not available.")
      return response.json()
    })
    .then(renderScoreboard)
    .catch(() => {
      const message = isNetlifyFunctionApi()
        ? "Not connected. Redeploy Netlify with the new classroom function files."
        : "Not connected. Open this page from the classroom server link."
      setStatus(false, message)
    })
}

function connectEvents() {
  const eventsUrl = getEventsUrl()
  if (!window.EventSource || !eventsUrl) return
  if (eventSource) eventSource.close()

  eventSource = new EventSource(eventsUrl)

  eventSource.addEventListener("scoreboard", event => {
    try {
      renderScoreboard(JSON.parse(event.data))
    } catch {
      setStatus(false, "Scoreboard update failed. Retrying...")
    }
  })

  eventSource.onerror = () => {
    setStatus(false, "Live connection retrying. Backup refresh is still running.")
  }
}

function startScoreboard() {
  updateRoomUi()
  fetchScores()
  connectEvents()
  clearInterval(pollTimer)
  pollTimer = setInterval(fetchScores, 2000)
}

roomButton.addEventListener("click", () => {
  const nextRoom = normalizeRoom(roomInput.value)
  const url = new URL(window.location.pathname, window.location.origin)
  url.searchParams.set("room", nextRoom)

  if (shouldShareApiParam()) {
    url.searchParams.set("api", classroomApiBase)
  }

  window.location.href = url.href
})

roomInput.addEventListener("keydown", event => {
  if (event.key === "Enter") roomButton.click()
})

copyLinkButton.addEventListener("click", () => {
  const text = getStudentUrl()

  navigator.clipboard?.writeText(text)
    .then(() => {
      copyLinkButton.textContent = "Copied"
      setTimeout(() => {
        copyLinkButton.textContent = "Copy"
      }, 1200)
    })
    .catch(() => {
      window.prompt("Student link:", text)
    })
})

startScoreboard()
