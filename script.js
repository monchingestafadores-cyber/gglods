let unlockedGame = 1
let completedGames = new Set()
let currentModule = 1
let lessonIndex = 0

let currentGame = 1
let currentSentenceLevel = 1
let unlockedSentenceLevel = 1
let completedSentenceLevels = new Set()
let currentQuestion = 0
let questions = []

let score = 0
let streak = 0
let correctAnswers = 0
let hintCount = 0
let rewardTracker = 0
let carryScore = 0
let carryStreak = 0
let carryHintCount = 0
let gameStartRecords = {
  "1-1": { score: 0, streak: 0, hintCount: 0 }
}

let alreadyAnswered = false
let questionTimerInterval = null
let questionDuration = 15
let questionTimeLeft = 15
let musicMuted = false

let lessonTimerInterval = null
let readTimeLeft = 5
let skipLessonReadTimer = false
let resetStatsOnNextGameStart = false
let activeLessons = null
let activeGuideMessages = null
let lessonStartsGame = true
let playerName = ""
let earnedBadges = new Set()
let badgeProgress = {}
let playerProfiles = []
let activeProfileId = ""
let creatingNewPlayer = false
let allBadgesBonusAwarded = false
let activeGame2Text = null
let badgeRunSnapshot = null

const fixedLayout = {
  width: 1280,
  height: 720
}

const QUESTIONS_PER_RUN = 5
const PASSING_ANSWERS = 4
const BADGE_REQUIRED_CORRECT = 3
const ALL_BADGES_BONUS = 100
const BADGE_CAP = 5

const learnTopicClasses = [
  "learn-topic-game",
  "learn-topic-overview",
  "learn-topic-module1",
  "learn-topic-module2",
  "learn-topic-module3"
]

const playerProfileStorageKey = "figurativeForcePlayerProfile"
const playerProfilesStorageKey = "figurativeForcePlayerProfiles"
const activePlayerStorageKey = "figurativeForceActivePlayer"
const multiplayerClientStorageKey = "figurativeForceClassroomClient"
const classroomRoomStorageKey = "metaphoriaClassroomRoom"
const classroomApiStorageKey = "metaphoriaClassroomApi"
let multiplayerRoomCode = getInitialMultiplayerRoomCode()
let classroomApiBase = getInitialClassroomApiBase()

let multiplayerClientId = ""
let multiplayerConnected = false
let multiplayerEventSource = null
let multiplayerScoreTimer = null
let multiplayerPollTimer = null
let multiplayerHeartbeatTimer = null

const badgeDefinitions = {
  simile: {
    label: "Simile",
    display: "assets/images/simile-badge.png",
    id: "assets/images/c-simile-badge.png"
  },
  metaphor: {
    label: "Metaphor",
    display: "assets/images/metaphor-badge.png",
    id: "assets/images/c-metaphor-badge.png"
  },
  personification: {
    label: "Personification",
    display: "assets/images/personification-badge.png",
    id: "assets/images/c-personification-badge.png"
  },
  hyperbole: {
    label: "Hyperbole",
    display: "assets/images/hyperbole-badge.png",
    id: "assets/images/c-hyperbole-badge.png"
  },
  symbolism: {
    label: "Symbolism",
    display: "assets/images/symbolism-badge.png",
    id: "assets/images/c-symbolism-badge.png"
  }
}

function createEmptyBadgeProgress() {
  return Object.keys(badgeDefinitions).reduce((progress, badgeId) => {
    progress[badgeId] = 0
    return progress
  }, {})
}

function snapshotBadgeState() {
  return {
    earnedBadges: [...earnedBadges],
    badgeProgress: { ...badgeProgress },
    allBadgesBonusAwarded
  }
}

function captureBadgeRunStart() {
  badgeRunSnapshot = snapshotBadgeState()
}

function restoreBadgeRunStart() {
  if (!badgeRunSnapshot) return

  earnedBadges = new Set(badgeRunSnapshot.earnedBadges.filter(badgeId => badgeDefinitions[badgeId]).slice(0, BADGE_CAP))
  badgeProgress = { ...createEmptyBadgeProgress(), ...badgeRunSnapshot.badgeProgress }
  allBadgesBonusAwarded = badgeRunSnapshot.allBadgesBonusAwarded
  updateGameIdCard()
}

function rollbackCurrentRunProgress() {
  restoreBadgeRunStart()

  const startRecord = gameStartRecords[getGameStartKey(currentGame)]
  if (startRecord) {
    score = startRecord.score
    streak = startRecord.streak
    hintCount = startRecord.hintCount
  }

  updateStats()
  savePlayerProfile()
}

function updateFixedLayout() {
  const viewport = window.visualViewport
  const viewportWidth = Math.min(
    viewport?.width || Infinity,
    document.documentElement.clientWidth || Infinity,
    window.innerWidth || Infinity
  )
  const viewportHeight = Math.min(
    viewport?.height || Infinity,
    document.documentElement.clientHeight || Infinity,
    window.innerHeight || Infinity
  )
  const scale = Math.min(viewportWidth / fixedLayout.width, viewportHeight / fixedLayout.height)
  const left = Math.max(0, (viewportWidth - fixedLayout.width * scale) / 2)
  const top = Math.max(0, (viewportHeight - fixedLayout.height * scale) / 2)

  document.documentElement.style.setProperty("--stage-scale", scale.toString())
  document.documentElement.style.setProperty("--fixed-scale", scale.toString())
  document.documentElement.style.setProperty("--fixed-left", `${left}px`)
  document.documentElement.style.setProperty("--fixed-top", `${top}px`)
}

updateFixedLayout()
window.addEventListener("resize", updateFixedLayout)
window.addEventListener("orientationchange", updateFixedLayout)

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateFixedLayout)
}
window.addEventListener("orientationchange", updateFixedLayout)
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateFixedLayout)
  window.visualViewport.addEventListener("scroll", updateFixedLayout)
}

const gameMechanicsPages = {
  1: {
    title: "Sentence Sleuths",
    content: `<div class="game-mechanics-card">
      <h2>Game Mechanics</h2>
      <div class="mechanics-mini-grid">
        <div><strong>Goal</strong><span>Read each sentence and identify the literary device.</span></div>
        <div><strong>Levels</strong><span>Clear Levels 1, 2, and 3 before Text Detectives unlocks.</span></div>
        <div><strong>Scoring</strong><span>Correct answer: +10. Streaks and hints help your run.</span></div>
        <div><strong>Tools</strong><span>Use Hint or 50/50 when you need support.</span></div>
      </div>
      <p class="mechanics-flow-line">Read → Choose → Feedback → Points → Next Level</p>
    </div>`
  },
  2: {
    title: "Text Detectives",
    content: `<div class="game-mechanics-card">
      <h2>Game Mechanics</h2>
      <div class="mechanics-mini-grid">
        <div><strong>Goal</strong><span>Analyze a short literary text and spot the device used.</span></div>
        <div><strong>Questions</strong><span>Identify, understand meaning, and use context clues.</span></div>
        <div><strong>Scoring</strong><span>Correct answers add points and build your streak.</span></div>
        <div><strong>Tools</strong><span>Hints give definitions or examples without giving away the answer.</span></div>
      </div>
      <p class="mechanics-flow-line">Read Text → Study Clue → Choose → Feedback</p>
    </div>`
  },
  3: {
    title: "Expression Lab",
    content: `<div class="game-mechanics-card">
      <h2>Game Mechanics</h2>
      <div class="mechanics-mini-grid">
        <div><strong>Goal</strong><span>Rewrite a literal sentence using the requested figure of speech.</span></div>
        <div><strong>Rules</strong><span>Simile needs like/as. Metaphor is direct. Personification gives human action.</span></div>
        <div><strong>Scoring</strong><span>Correct creative answer: +15.</span></div>
        <div><strong>Tools</strong><span>Use the hint if you need a rule reminder before submitting.</span></div>
      </div>
      <p class="mechanics-flow-line">Read → Rewrite → Submit → Feedback</p>
    </div>`
  }
}

const modules = {
  1: [
    gameMechanicsPages[1],
    { title: "Game 1", content: "<h2>What is a Figure of Speech?</h2><p>A figure of speech is a creative way of using words to make writing more colorful and interesting.</p>" },
    { title: "Simile and Metaphor", content: "<h2>Simile</h2><p>Uses like or as. Example: She shines like the sun.</p><h2>Metaphor</h2><p>Direct comparison. Example: The classroom was a zoo.</p>" },
    { title: "Personification, Hyperbole, Idiom", content: "<h2>Personification</h2><p>Gives human actions to non-human things.</p><h2>Hyperbole</h2><p>Uses exaggeration.</p><h2>Idiom</h2><p>A phrase with a different meaning.</p>" }
  ],
  2: [
    gameMechanicsPages[2],
    { title: "Game 2", content: "<h2>Analyzing Figurative Language</h2><p>Look for the figure of speech, understand its meaning, and explain the feeling it gives.</p>" },
    { title: "Sound Devices", content: "<h2>Alliteration</h2><p>Repeated beginning sounds.</p><h2>Onomatopoeia</h2><p>Words that sound like noises.</p>" },
    { title: "Irony", content: "<h2>Irony</h2><p>When what happens is different from what is expected.</p>" }
  ],
  3: [
    gameMechanicsPages[3],
    { title: "Game 3", content: "<h2>Creating Figurative Language</h2><p>You will rewrite literal sentences into figurative ones.</p>" },
    { title: "Creative Rules", content: "<p>Use like/as for simile. Avoid like/as for metaphor. Give human action for personification.</p>" },
    { title: "Ready", content: "<h2>Ready?</h2><p>Create your own figurative expressions.</p>" }
  ]
}

function notice(text) {
  return `<p class="lesson-notice"><strong>Notice:</strong> ${text}</p>`
}

const learnModules = {
  overview: [
    {
      title: "Overview",
      content: `<h2>What is a Literary Device?</h2><p>Literary devices enhance writing by adding depth, emphasis, and a richer sensory experience for the reader.</p><p>They are tools and techniques that poets use to enrich meaning, imagery, and impact.</p>`
    },
    {
      title: "Overview",
      content: `<h2>Importance of Literary Devices</h2><ul class="lesson-list"><li>Enhance creativity and artistic quality</li><li>Help readers understand deeper meanings</li><li>Make ideas and emotions more vivid</li><li>Improve the effectiveness of descriptions</li><li>Increase appreciation and interest in literary works</li></ul>`
    },
    {
      title: "Overview",
      content: `<h2>Two Kinds of Literary Devices</h2><p>Literary devices have two aspects:</p><ul class="lesson-list"><li>Literary Elements</li><li>Literary Techniques</li></ul>`
    },
    {
      title: "Literary Elements",
      content: `<h2>Literary Elements</h2><p>Literary elements have an inherent existence in a literary piece.</p><p>They are extensively employed by writers to develop a literary work.</p>`
    },
    {
      title: "Literary Elements",
      content: `<h2>Examples</h2><ul class="lesson-list"><li>Plot</li><li>Setting</li><li>Narrative Structure</li><li>Characters</li><li>Mood</li><li>Theme</li><li>Moral</li></ul>`
    },
    {
      title: "Literary Techniques",
      content: `<h2>Literary Techniques</h2><p>Literary techniques are words, phrases, or structures used to achieve artistic ends and help readers understand literary works better.</p><ul class="lesson-list"><li>Metaphor</li><li>Simile</li><li>Alliteration</li><li>Hyperbole</li><li>Personification</li></ul>`
    },
    {
      title: "Categories",
      content: `<h2>Categories of Literary Devices</h2><ul class="lesson-list"><li>Figurative Language / Figures of Speech</li><li>Sound Devices</li><li>Sensory Devices</li></ul>`
    },
    {
      title: "References",
      content: `<h2>References</h2><ul class="lesson-list"><li>Department of Education. Lesson Exemplar for English Grade 7, Quarter 1: Lesson 4 of 8, SY 2024-2025.</li><li>Figure of Speech - Examples and Definition of Figure of Speech.</li></ul>`
    }
  ],
  module1: [
    {
      title: "Module 1",
      content: `<h2>Figurative Language</h2><p>Figurative language uses words or expressions with meanings different from their literal interpretation.</p><p>It suggests comparisons or creates images in the reader's mind, adding color, texture, and depth to writing.</p>`
    },
    {
      title: "Module 1",
      content: `<h2>Common Types of Figures of Speech</h2><ul class="lesson-list"><li>Simile</li><li>Metaphor</li><li>Personification</li><li>Hyperbole</li><li>Symbolism</li></ul>`
    },
    {
      title: "Simile",
      content: `<h2>Simile</h2><p>A simile compares two unlike things using the words <strong>like</strong> or <strong>as</strong>. It points out a shared quality.</p>`
    },
    {
      title: "Simile",
      content: `<h2>Example</h2><div class="lesson-example">&quot;Her smile was as bright as the sun.&quot;<br>This is a simile because it uses <strong>as</strong> to compare a smile to the sun.</div>${notice("The word <strong>as</strong> signals a comparison. The sun is bright, so the sentence describes how radiant the smile is.")}`
    },
    {
      title: "Simile",
      content: `<h2>Example</h2><div class="lesson-example">&quot;He runs like the wind.&quot;<br>This is a simile because it uses <strong>like</strong> to compare a person's speed to the wind.</div>${notice("Ask yourself: can a person literally become the wind? No. The comparison describes how fast he runs.")}`
    },
    {
      title: "Simile",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The news hit him like a ton of bricks.&quot;<br>This is a simile because it uses <strong>like</strong> to compare the impact of the news to a ton of bricks.</div>${notice("The comparison shows how shocking or overwhelming the news felt to him.")}`
    },
    {
      title: "Metaphor",
      content: `<h2>Metaphor</h2><p>A metaphor compares two unlike things without using <strong>like</strong> or <strong>as</strong>. It states that one thing is another.</p>`
    },
    {
      title: "Metaphor",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The world is a stage.&quot;<br>This is a metaphor because it directly compares the world to a stage.</div>${notice("The sentence suggests that people in the world act like performers in a play.")}`
    },
    {
      title: "Metaphor",
      content: `<h2>Example</h2><div class="lesson-example">&quot;Time is a thief.&quot;<br>This is a metaphor because it directly compares time to a thief.</div>${notice("Time cannot literally steal, but the comparison shows how time takes away moments, youth, and opportunities.")}`
    },
    {
      title: "Metaphor",
      content: `<h2>Example</h2><div class="lesson-example">&quot;He is a shining star.&quot;<br>This is a metaphor because it directly compares a person to a shining star.</div>${notice("The sentence highlights that he is talented, admirable, or outstanding.")}`
    },
    {
      title: "Personification",
      content: `<h2>Personification</h2><p>Personification gives human qualities to inanimate objects, animals, or ideas.</p>`
    },
    {
      title: "Personification",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The wind whispered through the trees.&quot;<br>This is personification because the wind is given the human ability to whisper.</div>${notice("Wind cannot literally whisper, but the comparison helps create a calm and gentle image.")}`
    },
    {
      title: "Personification",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The sun smiled down on us.&quot;<br>This is personification because the sun is given the human action of smiling.</div>${notice("The sentence creates a warm and pleasant feeling by describing the sunlight as friendly and cheerful.")}`
    },
    {
      title: "Personification",
      content: `<h2>Example</h2><div class="lesson-example">&quot;Opportunity knocked at her door.&quot;<br>This is personification because opportunity is described as if it were a person knocking.</div>${notice("Opportunity cannot literally knock, but the sentence suggests that a good chance became available.")}`
    },
    {
      title: "Personification",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The flowers danced in the breeze.&quot;<br>This is personification because flowers are given the human action of dancing.</div>${notice("Flowers cannot truly dance, but wind movement makes them appear lively and graceful.")}`
    },
    {
      title: "Hyperbole",
      content: `<h2>Hyperbole</h2><p>Hyperbole is an exaggeration used for emphasis or effect. It is not meant to be taken literally.</p>`
    },
    {
      title: "Hyperbole",
      content: `<h2>Example</h2><div class="lesson-example">&quot;I'm so hungry I could eat a horse.&quot;<br>This is hyperbole because it exaggerates extreme hunger.</div>${notice("A person cannot literally eat a horse, but the statement emphasizes how hungry the speaker feels.")}`
    },
    {
      title: "Hyperbole",
      content: `<h2>Example</h2><div class="lesson-example">&quot;I've told you a million times.&quot;<br>This is hyperbole because it exaggerates the number of times something was said.</div>${notice("The speaker did not literally repeat it a million times. The sentence stresses frustration or repetition.")}`
    },
    {
      title: "Hyperbole",
      content: `<h2>Example</h2><div class="lesson-example">&quot;This bag weighs a ton.&quot;<br>This is hyperbole because it exaggerates the weight of the bag.</div>${notice("The bag does not actually weigh a ton, but the statement emphasizes that it feels very heavy.")}`
    },
    {
      title: "Symbolism",
      content: `<h2>Symbolism</h2><p>Symbolism uses objects, people, or ideas to represent something else. A symbol can stand for a larger concept or meaning.</p><ul class="lesson-list"><li>A dove often symbolizes peace.</li><li>A red rose can symbolize love or passion.</li><li>A dark forest can symbolize the unknown or danger.</li></ul>`
    },
    {
      title: "Activity 1",
      content: `<h2>Identify the Figure of Speech</h2><p>Direction: Identify whether the sentence is a Simile, Metaphor, Personification, Hyperbole, or Symbolism.</p><ul class="lesson-list"><li>The stars danced in the night sky.</li><li>She is as brave as a lion.</li><li>My backpack weighs a ton.</li><li>The heart symbolizes love.</li><li>Life is a journey.</li></ul>`
    },
    {
      title: "Activity 2",
      content: `<h2>Construct Simple Sentences</h2><p>Direction: Construct one simple sentence for each type of figurative language.</p><ul class="lesson-list"><li>Simile</li><li>Metaphor</li><li>Personification</li><li>Hyperbole</li><li>Symbolism</li></ul>`
    },
    {
      title: "Answer Key",
      content: `<h2>Activity 1 Answers</h2><ul class="lesson-list"><li>Personification</li><li>Simile</li><li>Hyperbole</li><li>Symbolism</li><li>Metaphor</li></ul>`
    },
    {
      title: "References",
      content: `<h2>References</h2><ul class="lesson-list"><li>Department of Education. Lesson Exemplar for English Grade 7, Quarter 1: Lesson 4 of 8, SY 2024-2025.</li><li>Figure of Speech - Examples and Definition of Figure of Speech.</li></ul>`
    }
  ],
  module2: [
    {
      title: "Module 2",
      content: `<h2>Sound Devices</h2><p>Sound devices are literary techniques that exploit the sounds of words for artistic effect.</p><p>They add rhythm, emphasis, and layers of meaning to writing.</p>`
    },
    {
      title: "Goals",
      content: `<h2>By the End</h2><ul class="lesson-list"><li>Identify and explain sound devices in literary texts</li><li>Appreciate sound devices as creative and expressive tools</li><li>Construct simple sentences using sound devices correctly</li></ul>`
    },
    {
      title: "Sound Devices",
      content: `<h2>Common Types of Sound Devices</h2><ul class="lesson-list"><li>Alliteration</li><li>Rhyme</li><li>Onomatopoeia</li></ul>`
    },
    {
      title: "Alliteration",
      content: `<h2>Alliteration</h2><p>Alliteration repeats the same initial consonant sounds in a series of words.</p><p>It can create mood, rhythm, and emphasis.</p>`
    },
    {
      title: "Alliteration",
      content: `<h2>Example</h2><div class="lesson-example">&quot;Peter Piper picked a peck of pickled peppers.&quot;<br>This is alliteration because the sentence repeats the beginning /p/ sound.</div>${notice("The repeated consonant sound makes the sentence catchy, rhythmic, and enjoyable to read aloud.")}`
    },
    {
      title: "Alliteration",
      content: `<h2>Example</h2><div class="lesson-example">&quot;Sally sells seashells by the seashore.&quot;<br>This is alliteration because the sentence repeats the beginning /s/ sound.</div>${notice("The repeated sound creates a musical effect and makes the phrase memorable.")}`
    },
    {
      title: "Alliteration",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The wild winds whisked through the woods.&quot;<br>This is alliteration because the sentence repeats the beginning /w/ sound.</div>${notice("The repeated sound helps create a smooth and vivid description of the wind.")}`
    },
    {
      title: "Rhyme",
      content: `<h2>Rhyme</h2><p>Rhyme repeats similar sounds, usually at the ends of lines in poetry.</p><ul class="lesson-list"><li>AABB</li><li>ABAB</li><li>ABCB</li></ul>`
    },
    {
      title: "Rhyme",
      content: `<h2>AABB Example</h2><div class="lesson-example">The sun rises over the land so bright, (A)<br>Lighting the morning with golden light. (A)<br>The farmers work beneath the sky, (B)<br>As birds above go flying by. (B)</div>${notice("The first and second lines rhyme, while the third and fourth lines also rhyme. This paired pattern is called AABB.")}`
    },
    {
      title: "Rhyme",
      content: `<h2>ABAB Example</h2><div class="lesson-example">The farmer wakes before the day, (A)<br>To tend the fields with careful hand. (B)<br>The rooster sings to start the play, (A)<br>As morning light fills all the land. (B)</div>${notice("The ending sounds of the first and third lines match, and the second and fourth lines match. This creates an alternating rhythm.")}`
    },
    {
      title: "Onomatopoeia",
      content: `<h2>Onomatopoeia</h2><p>Onomatopoeia is a word that imitates the sound it represents.</p><p>It can describe many sounds and make writing vivid and realistic.</p>`
    },
    {
      title: "Onomatopoeia",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The bees buzzed loudly in the garden.&quot;<br>The word <strong>buzzed</strong> imitates the sound made by bees.</div>${notice("The word helps the reader hear the real sound of bees in the garden.")}`
    },
    {
      title: "Onomatopoeia",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The clock ticked in the room.&quot;<br>The word <strong>ticked</strong> imitates the sound of a clock.</div>${notice("It makes us imagine the quiet ticking sound in a silent room.")}`
    },
    {
      title: "Onomatopoeia",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The bacon sizzled in the pan.&quot;<br>The word <strong>sizzled</strong> imitates food cooking in heat.</div>${notice("The word helps us hear the crackling sound as the bacon cooks in the pan.")}`
    },
    {
      title: "Activity 1",
      content: `<h2>Sound Device Challenge</h2><p>Direction: Identify the sound device used. Choose from Rhyme, Alliteration, or Onomatopoeia.</p><ul class="lesson-list"><li>Tick-tock went the clock all night.</li><li>Funny frogs frolicked freely.</li><li>The goat sailed in a boat.</li><li>Crash! The vase fell to the floor.</li><li>Busy bees buzzed by the barn.</li></ul>`
    },
    {
      title: "Activity 2",
      content: `<h2>Create Your Own Sound Device</h2><p>Direction: Write your own sentence based on the given sound device.</p><ul class="lesson-list"><li>Rhyme</li><li>Alliteration</li><li>Onomatopoeia</li></ul>`
    },
    {
      title: "Answer Key",
      content: `<h2>Activity 1 Answers</h2><ul class="lesson-list"><li>Onomatopoeia</li><li>Alliteration</li><li>Rhyme</li><li>Onomatopoeia</li><li>Alliteration</li></ul>`
    },
    {
      title: "References",
      content: `<h2>References</h2><ul class="lesson-list"><li>Department of Education. Lesson Exemplar for English Grade 7, Quarter 1: Lesson 4 of 8, SY 2024-2025.</li><li>Sound Devices - Examples and Definition of Sound Devices - Literary Devices.</li></ul>`
    }
  ],
  module3: [
    {
      title: "Module 3",
      content: `<h2>Sensory Devices</h2><p>Sensory devices in poetry engage the reader's senses to create vivid imagery and evoke strong emotions.</p>`
    },
    {
      title: "Module 3",
      content: `<h2>Kinds of Sensory Devices</h2><ul class="lesson-list"><li>Imagery</li><li>Tone</li><li>Mood</li></ul>`
    },
    {
      title: "Imagery",
      content: `<h2>Imagery</h2><p>Imagery uses descriptive language that appeals to the senses and creates vivid mental pictures for the reader.</p><ul class="lesson-list"><li>Sight</li><li>Smell</li><li>Hearing or Sound</li><li>Taste</li><li>Touch</li></ul>`
    },
    {
      title: "Sight",
      content: `<h2>Sight</h2><p>Sight imagery uses colors, shapes, patterns, and sizes.</p><div class="lesson-example">&quot;The car gleamed a vibrant cherry red under the afternoon sun.&quot;<br>This is visual imagery because it describes colors and appearance.</div>${notice("The phrase helps the reader clearly imagine how the car looks, especially its bright cherry red color shining under the sun.")}`
    },
    {
      title: "Smell",
      content: `<h2>Smell</h2><p>Smell imagery uses fragrances and odors.</p><div class="lesson-example">&quot;The kitchen filled with the warm, comforting aroma of cinnamon and freshly baked bread.&quot;<br>This is olfactory imagery because it describes fragrance.</div>${notice("The words <strong>warm</strong>, <strong>comforting</strong>, and <strong>aroma</strong> help the reader imagine the pleasant smell of baked food.")}`
    },
    {
      title: "Sound",
      content: `<h2>Hearing or Sound</h2><p>Sound imagery uses music, silence, and noise.</p><div class="lesson-example">&quot;The bass throbbed in my chest, a pulsating rhythm that shook the floor.&quot;<br>This is auditory imagery because it describes music and loud vibration.</div>${notice("The sentence helps the reader hear and feel the strong beat of the music.")}`
    },
    {
      title: "Taste",
      content: `<h2>Taste</h2><p>Taste imagery uses sour, sweet, acidic, bitter, and salty details.</p><div class="lesson-example">&quot;The lemon's juice exploded on my tongue, a tart burst of citrus.&quot;<br>This is gustatory imagery because it describes flavor.</div>${notice("The words <strong>tart burst</strong> help the reader imagine the sour and strong taste of lemon.")}`
    },
    {
      title: "Touch",
      content: `<h2>Touch</h2><p>Touch imagery uses texture, temperature, and movement.</p><div class="lesson-example">&quot;The rock's surface was gritty and cool beneath my fingertips.&quot;<br>This is tactile imagery because it describes texture and physical feeling.</div>${notice("The words <strong>gritty</strong> and <strong>cool</strong> help the reader imagine how the rock feels when touched.")}`
    },
    {
      title: "Tone",
      content: `<h2>Tone</h2><p>Tone is the author's overall attitude or emotional stance toward the subject, audience, or narrative.</p><p>It can be conveyed through word choice, imagery, syntax, and style.</p>`
    },
    {
      title: "Tone",
      content: `<h2>Example</h2><div class="lesson-example">&quot;I still remember the way the sunlight spilled across my grandmother's garden, soft and golden, as if the world had slowed down just for us.&quot;</div><p>This shows a nostalgic and reflective tone.</p>${notice("Word choices like <strong>still remember</strong> and <strong>soft and golden</strong> create a feeling of looking back with fondness and reflection.")}`
    },
    {
      title: "Tone",
      content: `<h2>Example</h2><div class="lesson-example">&quot;I can't believe we finally made it! After all the hard work and sleepless nights, this moment feels like a dream come true.&quot;</div><p>This shows a hopeful and joyful tone.</p>${notice("Words like <strong>finally</strong>, <strong>hard work</strong>, and <strong>dream come true</strong> create a positive and uplifting feeling.")}`
    },
    {
      title: "Mood",
      content: `<h2>Mood</h2><p>Mood is the emotional atmosphere or feeling evoked in the reader. It can be joyful, celebratory, dark, ominous, tense, or hopeful.</p>`
    },
    {
      title: "Mood",
      content: `<h2>Example</h2><div class="lesson-example">&quot;The sky turned dark as heavy rain poured down, and the empty street echoed with the sound of thunder.&quot;</div><p>This creates a dark and ominous mood.</p>${notice("Words like <strong>dark</strong>, <strong>heavy rain</strong>, and <strong>thunder</strong> help the reader feel fear or unease.")}`
    },
    {
      title: "Activity 1",
      content: `<h2>Picture the Feeling</h2><p>Direction: Identify whether each sentence expresses Imagery, Tone, or Mood.</p><ul class="lesson-list"><li>The aroma of freshly baked bread filled the warm kitchen.</li><li>The speaker's words sounded angry and demanding.</li><li>Dark clouds covered the sky, creating a frightening atmosphere.</li><li>The soft waves gently touched the sandy shore.</li><li>The poem created a joyful and hopeful feeling.</li></ul>`
    },
    {
      title: "Activity 2",
      content: `<h2>Choose the Correct Answer</h2><p>Read each situation and identify whether it mainly shows Imagery, Tone, or Mood.</p><ul class="lesson-list lesson-qa-list"><li>Maria could smell the salty sea breeze and hear the crashing waves.<span class="lesson-options">A. Tone | B. Mood | C. Imagery | D. Symbolism</span></li><li>The speaker used harsh and critical words about corruption.<span class="lesson-options">A. Imagery | B. Tone | C. Mood | D. Hyperbole</span></li><li>The dark forest and flickering lights made readers feel nervous.<span class="lesson-options">A. Tone | B. Imagery | C. Mood | D. Metaphor</span></li></ul>`
    },
    {
      title: "Activity 2",
      content: `<h2>More Situations</h2><p>Continue identifying whether each situation mainly shows Imagery, Tone, or Mood.</p><ul class="lesson-list lesson-qa-list"><li>Soft petals, sweet fragrance, and colorful garden details are described.<span class="lesson-options">A. Imagery | B. Mood | C. Tone | D. Irony</span></li><li>An inspirational speech made the audience feel hopeful.<span class="lesson-options">A. Tone | B. Mood | C. Imagery | D. Personification</span></li></ul>`
    },
    {
      title: "Answer Key",
      content: `<h2>Answers</h2><div class="lesson-answer-columns"><div><p><strong>Activity 1</strong></p><ul class="lesson-list lesson-answer-list"><li>Imagery</li><li>Tone</li><li>Mood</li><li>Imagery</li><li>Mood</li></ul></div><div><p><strong>Activity 2</strong></p><ul class="lesson-list lesson-answer-list"><li>C. Imagery</li><li>B. Tone</li><li>C. Mood</li><li>A. Imagery</li><li>B. Mood</li></ul></div></div>`
    },
    {
      title: "References",
      content: `<h2>References</h2><ul class="lesson-list"><li>Department of Education. Lesson Exemplar for English Grade 7, Quarter 1: Lesson 4 of 8, SY 2024-2025.</li><li>Department of Education. English 7 Learner's Material: Tone and Mood. Philippines, 2017.</li></ul>`
    }
  ]
}

const gameTitles = {
  1: "Sentence Sleuths",
  2: "Text Detectives",
  3: "Expression Lab"
}

const lessonGuideMessages = {
  1: [
    "Before we begin, check the rules for Sentence Sleuths. This tells you how to earn points and unlock the next level.",
    "This is where we learn what figures of speech do. Read the scroll first, then I will help you practice.",
    "Watch for like or as. If they are missing, it may be a direct comparison.",
    "These three are easy to mix up. Look for human action, exaggeration, or a phrase with a hidden meaning."
  ],
  2: [
    "Before Text Detectives starts, read how this game works. The text and clues matter here.",
    "In Game 2, we slow down and explain what the figurative words mean.",
    "Listen to the first sounds and sound words. They are clues for this game.",
    "Irony happens when the result is different from what you expect."
  ],
  3: [
    "Before Expression Lab starts, check the creation rules. Your answer must match the figure of speech.",
    "In Game 3, you will create your own figurative sentences.",
    "Use the rule on the scroll as your guide before typing your answer.",
    "You are ready. Make your sentence clear, creative, and matched to the figure of speech."
  ]
}

const learnGuideMessages = {
  overview: [
    "Start here. Literary devices help writing feel alive and meaningful.",
    "These are the main reasons writers use literary devices.",
    "Remember the two big groups: elements and techniques.",
    "Elements are the building blocks of stories.",
    "Techniques are special language moves writers choose.",
    "Great. You are ready to explore each module."
  ],
  module1: [
    "Figurative language says more than the literal meaning.",
    "These five types will appear often in poems and stories.",
    "For simile, watch for like or as.",
    "Similes compare to make an idea clearer.",
    "For metaphor, the comparison is direct.",
    "Metaphors are powerful because they make one idea stand for another.",
    "Personification makes non-human things act human.",
    "Look for objects, ideas, or nature doing human actions.",
    "Hyperbole makes meaning stronger through exaggeration.",
    "If it is clearly too much to be literal, it may be hyperbole.",
    "A symbol carries a bigger meaning than itself.",
    "Try spotting the figure before checking the answer.",
    "Nice work. You can now create your own examples."
  ],
  module2: [
    "Sound devices make writing enjoyable to hear.",
    "These goals show what you should be able to do after learning.",
    "Alliteration, rhyme, and onomatopoeia are the focus here.",
    "Alliteration repeats beginning sounds.",
    "Read alliteration aloud. The pattern becomes easier to hear.",
    "Rhyme matches sounds, often at the ends of lines.",
    "AABB means lines rhyme in pairs.",
    "ABAB means the rhyme alternates.",
    "Onomatopoeia sounds like the thing it names.",
    "Excellent. Sound can make writing vivid and memorable."
  ],
  module3: [
    "Sensory devices help readers see, hear, smell, taste, and feel.",
    "This module focuses on imagery, tone, and mood.",
    "Imagery paints pictures using sensory details.",
    "Sight imagery uses color, shape, and appearance.",
    "Smell imagery uses scents and aromas.",
    "Sound imagery lets the reader hear the scene.",
    "Taste and touch make descriptions feel physical.",
    "Tone belongs to the writer's attitude.",
    "Word choice also shapes tone.",
    "Mood is what the reader feels from the scene.",
    "You got it. Tone and mood are connected, but not the same."
  ]
}

const questionBank = {
  game1: [
    { sentence: "The stars danced playfully in the moonlit sky.", question: "What figurative language is this?", choices: ["Metaphor", "Personification", "Hyperbole"], answer: "Personification", hint: "A non-human object is given a human action." },
    { sentence: "He was so tired, he could have slept for a thousand years.", question: "What figure of speech is this?", choices: ["Simile", "Symbolism", "Hyperbole"], answer: "Hyperbole", hint: "This uses exaggeration to emphasize an idea." },
    { sentence: "The fresh, juicy oranges were cold and sweet.", question: "What sensory device is this?", choices: ["Imagery", "Tone", "Mood"], answer: "Imagery", hint: "This appeals to the senses such as taste and touch." },
    { sentence: "Blippy sells seashells by the seashore.", question: "What sound device is used?", choices: ["Alliteration", "Onomatopoeia", "Rhyme"], answer: "Alliteration", hint: "The beginning consonant sound is repeated several times." },
    { sentence: "The thunder grumbled like an old man.", question: "What figurative language is this?", choices: ["Metaphor", "Hyperbole", "Simile"], answer: "Simile", hint: "This compares two things using the word like." },
    { sentence: "The car engine roared to life.", question: "What sound device is this?", choices: ["Rhyme", "Onomatopoeia", "Alliteration"], answer: "Onomatopoeia", hint: "The word imitates a real sound." },
    { sentence: "The dark clouds and silent streets made everyone feel nervous.", question: "What sensory device is this?", choices: ["Tone", "Mood", "Simile"], answer: "Mood", hint: "This refers to the feeling created for the reader." },
    { sentence: "The warm aroma of freshly baked bread filled the air.", question: "What sensory device is this?", choices: ["Imagery", "Rhyme", "Metaphor"], answer: "Imagery", hint: "This appeals to the senses." },
    { sentence: "Peter picked plenty of purple plums.", question: "What sound device is this?", choices: ["Mood", "Alliteration", "Hyperbole"], answer: "Alliteration", hint: "The beginning consonant sound is repeated." },
    { sentence: "Boom! The thunder shook the house.", question: "What sound device is this?", choices: ["Tone", "Onomatopoeia", "Symbolism"], answer: "Onomatopoeia", hint: "The word imitates a real sound." },
    { sentence: "I saw a cat wearing a hat.", question: "What sound device is this?", choices: ["Alliteration", "Rhyme", "Imagery"], answer: "Rhyme", hint: "Words have similar ending sounds." },
    { sentence: "The red rose on the table represented love.", question: "What figurative language is this?", choices: ["Symbolism", "Onomatopoeia", "Mood"], answer: "Symbolism", hint: "An object represents a deeper meaning." },
    { sentence: "I've told you a thousand times to clean your room.", question: "What figure of speech is this?", choices: ["Hyperbole", "Tone", "Simile"], answer: "Hyperbole", hint: "This uses exaggeration for emphasis." },
    { sentence: "The flowers danced in the wind.", question: "What figurative language is this?", choices: ["Hyperbole", "Personification", "Rhyme"], answer: "Personification", hint: "A non-human thing is given a human action." },
    { sentence: "The world is a stage.", question: "What figurative language is this?", choices: ["Metaphor", "Symbolism", "Imagery"], answer: "Metaphor", hint: "This directly compares two things without using like or as." },
    { sentence: "After failing the test, Marco carried a storm cloud over his head all day.", question: "What figurative language is this?", choices: ["Simile", "Metaphor", "Mood"], answer: "Metaphor", hint: "The storm cloud directly represents sadness or trouble." },
    { sentence: "The angry waves slammed against the shore during the storm.", question: "What figurative language is this?", choices: ["Hyperbole", "Personification", "Symbolism"], answer: "Personification", hint: "The waves are described with human emotion and action." },
    { sentence: "My backpack weighs a ton after carrying all these books.", question: "What figure of speech is this?", choices: ["Hyperbole", "Simile", "Imagery"], answer: "Hyperbole", hint: "This uses exaggeration to show heaviness." },
    { sentence: "The baby's laughter was like music filling the quiet room.", question: "What figurative language is this?", choices: ["Metaphor", "Simile", "Tone"], answer: "Simile", hint: "This compares using the word like." },
    { sentence: "The broken clock on the wall symbolized the end of their friendship.", question: "What figurative language is this?", choices: ["Symbolism", "Onomatopoeia", "Mood"], answer: "Symbolism", hint: "An object stands for a deeper idea." },
    { sentence: "Careful Carla carried colorful candles into the crowded church.", question: "What sound device is this?", choices: ["Rhyme", "Onomatopoeia", "Alliteration"], answer: "Alliteration", hint: "Several words repeat the beginning consonant sound." },
    { sentence: "The bacon sizzled loudly in the hot frying pan.", question: "What sound device is this?", choices: ["Mood", "Onomatopoeia", "Rhyme"], answer: "Onomatopoeia", hint: "The word imitates a sound." },
    { sentence: "The tiny mouse ran inside the house.", question: "What sound device is this?", choices: ["Alliteration", "Imagery", "Rhyme"], answer: "Rhyme", hint: "Mouse and house have similar ending sounds." },
    { sentence: "The smell of freshly brewed coffee drifted through the chilly morning air.", question: "What sensory device is this?", choices: ["Tone", "Mood", "Imagery"], answer: "Imagery", hint: "The sentence uses sensory details." },
    { sentence: "The abandoned house, creaking doors, and flickering lights created a feeling of fear.", question: "What sensory device is this?", choices: ["Tone", "Mood", "Simile"], answer: "Mood", hint: "This is the feeling the scene creates for readers." },
    { sentence: "Even after the argument ended, the cracked mirror remained hanging in their living room.", question: "What figurative language is this?", choices: ["Symbolism", "Hyperbole", "Simile"], answer: "Symbolism", hint: "The cracked mirror represents a deeper broken relationship." },
    { sentence: "During the debate, Sofia became a blazing fire no one could silence.", question: "What figurative language is this?", choices: ["Mood", "Metaphor", "Personification"], answer: "Metaphor", hint: "Sofia is directly compared to fire." },
    { sentence: "The author described the careless actions of the leader with disappointment and criticism.", question: "What sensory device is this?", choices: ["Tone", "Mood", "Imagery"], answer: "Tone", hint: "Tone is the writer's attitude." },
    { sentence: "The dim hallway, distant whispers, and cold wind made the children uneasy.", question: "What sensory device is this?", choices: ["Simile", "Mood", "Tone"], answer: "Mood", hint: "This creates a feeling for the reader." },
    { sentence: "After practice, Jake was so hungry he could eat an entire restaurant.", question: "What figure of speech is this?", choices: ["Hyperbole", "Imagery", "Symbolism"], answer: "Hyperbole", hint: "This is an extreme exaggeration." },
    { sentence: "Wild winds whipped wildly across the water.", question: "What sound device is this?", choices: ["Rhyme", "Alliteration", "Onomatopoeia"], answer: "Alliteration", hint: "The beginning w sound repeats." },
    { sentence: "The fireworks crackled and popped throughout the celebration.", question: "What sound device is this?", choices: ["Mood", "Onomatopoeia", "Tone"], answer: "Onomatopoeia", hint: "Crackled and popped imitate sounds." },
    { sentence: "The exhausted swimmer moved through the water like a sinking stone.", question: "What figurative language is this?", choices: ["Metaphor", "Simile", "Hyperbole"], answer: "Simile", hint: "This compares using like." },
    { sentence: "The crispy chicken crackled while the spicy aroma filled the crowded kitchen.", question: "What sensory device is this?", choices: ["Tone", "Mood", "Imagery"], answer: "Imagery", hint: "The sentence uses sound, smell, and taste details." },
    { sentence: "The stubborn old truck groaned as it climbed the steep hill.", question: "What figurative language is this?", choices: ["Personification", "Symbolism", "Rhyme"], answer: "Personification", hint: "The truck is given a human-like action." }
  ],

  game2: [
    { text: "Why does the sea laugh, Mother, as it glints beneath the sun?", question: "Which figure of speech is used in the sentence?", choices: ["Personification", "Hyperbole", "Simile"], answer: "Personification", hint: "A non-human object is given a human action or emotion." },
    { text: "As it glints beneath the sun?", question: "Which sensory device is used in the sentence?", choices: ["Tone", "Imagery", "Mood"], answer: "Imagery", hint: "The line creates a vivid picture in the reader's mind." },
    { text: "Why does the sea sob so, Mother, as it breaks on the rocky shore?", question: "Which figurative language is used in the sentence?", choices: ["Metaphor", "Personification", "Symbolism"], answer: "Personification", hint: "The sea is described as if it can sob." },
    { text: "It recalls the sorrows of the world, and weeps forevermore.", question: "Which sensory device is shown in the sentence?", choices: ["Mood", "Tone", "Rhyme"], answer: "Mood", hint: "The words create a sad feeling for the reader." },
    { text: "The comfort of the deep.", question: "Which figure of speech is used in the sentence?", choices: ["Symbolism", "Hyperbole", "Onomatopoeia"], answer: "Symbolism", hint: "The deep sea represents safety or comfort." },
    { text: "Sweet the hours in the native country,", question: "What sensory device is used in the line?", choices: ["Mood", "Tone", "Hyperbole"], answer: "Mood", hint: "The line creates a peaceful, loving feeling." },
    { text: "Where friendly shines the sun above!", question: "Which figure of speech is used in the line?", choices: ["Personification", "Simile", "Symbolism"], answer: "Personification", hint: "The sun is described as friendly." },
    { text: "Life is the breeze that sweeps the meadows;", question: "Which figure of speech is used in the line?", choices: ["Simile", "Metaphor", "Mood"], answer: "Metaphor", hint: "Life is directly compared to the breeze." },
    { text: "The eyes are smiling as they gaze.", question: "Which figurative language is used in the line?", choices: ["Hyperbole", "Personification", "Rhyme"], answer: "Personification", hint: "Eyes are given the human action of smiling." },
    { text: "How sweet to die for the native country,", question: "What sensory device is shown in the line?", choices: ["Tone", "Mood", "Imagery"], answer: "Tone", hint: "Tone shows the speaker's attitude toward sacrifice." },
    { text: "I shall haunt you, O my lost one, as the twilight haunts a grieving bamboo trail,", question: "Which figure of speech is used in the line?", choices: ["Simile", "Hyperbole", "Symbolism"], answer: "Simile", hint: "The line compares using the word as." },
    { text: "And your dreams will linger strangely with the music of a phantom lover's tale", question: "Which sensory device is shown in the line?", choices: ["Mood", "Tone", "Rhyme"], answer: "Mood", hint: "The line creates a mysterious feeling." },
    { text: "With the starlight, and the scent of wild champakas, and the melody of rain.", question: "Which sensory device is used in the line?", choices: ["Imagery", "Hyperbole", "Symbolism"], answer: "Imagery", hint: "The line appeals to sight, smell, and sound." },
    { text: "You shall not forget, for I am past forgetting", question: "Which figure of speech is used in the line?", choices: ["Hyperbole", "Personification", "Simile"], answer: "Hyperbole", hint: "The statement is exaggerated for emphasis." },
    { text: "Dusk will peer into your window, tragic-eyed and still,", question: "Which figurative language is used in the line?", choices: ["Metaphor", "Personification", "Onomatopoeia"], answer: "Personification", hint: "Dusk is given human-like eyes and action." },
    { text: "God said, \"I made a man out of clay-\"", question: "Which figure of speech is used in the line?", choices: ["Symbolism", "Simile", "Rhyme"], answer: "Symbolism", hint: "Clay represents human creation and origin." },
    { text: "But so bright he, he spun himself to brightest Day", question: "Which figure of speech is used in the line?", choices: ["Hyperbole", "Mood", "Onomatopoeia"], answer: "Hyperbole", hint: "The brightness is exaggerated." },
    { text: "Till he was all shining gold, and oh, he was lovely to behold!", question: "Which sensory device is used in the line?", choices: ["Tone", "Imagery", "Mood"], answer: "Imagery", hint: "The line creates a clear visual image." },
    { text: "Aimed at me who created him.", question: "Which sensory device is shown in the line?", choices: ["Mood", "Rhyme", "Simile"], answer: "Mood", hint: "The line creates tension and conflict." },
    { text: "\"Give thy name!\" - \"Sir! Genius.\"", question: "Which sensory device is shown in the line?", choices: ["Tone", "Hyperbole", "Alliteration"], answer: "Tone", hint: "The line shows confidence and pride." },
    { text: "Pliant is the bamboo, I am a man of earth.", question: "Which figure of speech is used in the line?", choices: ["Metaphor", "Simile", "Hyperbole"], answer: "Metaphor", hint: "The speaker directly identifies himself with earth." },
    { text: "They say that from the bamboo, we had our first birth.", question: "Which figure of speech is used in the line?", choices: ["Symbolism", "Onomatopoeia", "Mood"], answer: "Symbolism", hint: "Bamboo represents origin, identity, and resilience." },
    { text: "If the wind passes by, must I stop and try to measure fully my flexibility?", question: "Which sensory device is shown in the line?", choices: ["Tone", "Rhyme", "Imagery"], answer: "Tone", hint: "The speaker's questioning attitude is important." },
    { text: "I might have been the bamboo, but I will be a man!", question: "Which sensory device is shown in the line?", choices: ["Mood", "Hyperbole", "Alliteration"], answer: "Mood", hint: "The line creates a determined feeling." },
    { text: "Bend me then, O Lord, bend me if you can!", question: "Which figure of speech is used in the line?", choices: ["Hyperbole", "Simile", "Onomatopoeia"], answer: "Hyperbole", hint: "The line uses an exaggerated challenge." }
  ],

  game3: [
    { literal: "The sea is calm tonight.", figure: "Simile", hint: "Simile compares two things using like or as." },
    { literal: "The farmer is strong.", figure: "Metaphor", hint: "Metaphor directly compares two things without like or as." },
    { literal: "The wind moved through the forest.", figure: "Personification", hint: "Personification gives human actions or traits to non-human things." },
    { literal: "The child smiled happily.", figure: "Simile", hint: "Use like or as to compare two unlike things." },
    { literal: "The rain fell on the roof.", figure: "Personification", hint: "Give human actions to non-human things." },
    { literal: "She waited for her beloved for many years.", figure: "Hyperbole", hint: "Hyperbole uses exaggeration for emphasis." },
    { literal: "The classroom was noisy.", figure: "Metaphor", hint: "A metaphor is a direct comparison without like or as." },
    { literal: "The river flowed smoothly.", figure: "Simile", hint: "Use like or as in comparing." },
    { literal: "He carried a heavy basket.", figure: "Hyperbole", hint: "Use exaggeration to emphasize heaviness." },
    { literal: "The fire burned brightly in the night.", figure: "Alliteration", hint: "Repeated consonant sounds." },
    { literal: "The storm raged outside.", figure: "Hyperbole", hint: "Exaggerate the storm to an impossible or extreme scale." },
    { literal: "The fisherman was very tired after sailing.", figure: "Hyperbole", hint: "Hyperbole uses strong exaggeration for emphasis." },
    { literal: "The girl's voice was soft while singing.", figure: "Simile", hint: "Use like or as to compare two unlike things." },
    { literal: "The mother gave comfort to her child.", figure: "Metaphor", hint: "A metaphor directly compares two things without like or as." },
    { literal: "The leaves moved during the storm.", figure: "Personification", hint: "Personification gives human emotions or actions to non-human things." }
  ]
}

const game2LiteraryTexts = [
  {
    title: "The Sea",
    author: "Natividad Marquez",
    text: "Why does the sea laugh, Mother, as it glints beneath the sun?\nWhy does the sea sob so, Mother, as it breaks on the rocky shore?\nIt recalls the sorrows of the world, and weeps forevermore.\nThe comfort of the deep.",
    questions: questionBank.game2.slice(0, 5)
  },
  {
    title: "Song of Maria Clara",
    author: "Jose Rizal",
    text: "Sweet the hours in the native country,\nWhere friendly shines the sun above!\nLife is the breeze that sweeps the meadows;\nThe eyes are smiling as they gaze.\nHow sweet to die for the native country,",
    questions: questionBank.game2.slice(5, 10)
  },
  {
    title: "To a Lost One",
    author: "Angela Manalang Gloria",
    text: "I shall haunt you, O my lost one, as the twilight\nHaunts a grieving bamboo trail,\nAnd your dreams will linger strangely with the music\nOf a phantom lover's tale.\nYou shall not forget, for I am past forgetting.\nDusk will peer into your window, tragic-eyed and still.",
    questions: questionBank.game2.slice(10, 15)
  },
  {
    title: "God Said \"I Made a Man\"",
    author: "Jose Garcia Villa",
    text: "God said, \"I made a man out of clay-\"\nBut so bright he, he spun himself to brightest Day\nTill he was all shining gold,\nAnd oh, he was lovely to behold!\nBut in his hands held he a bow aimed at me who created him.\n\"Give thy name!\" - \"Sir! Genius.\"",
    questions: questionBank.game2.slice(15, 20)
  },
  {
    title: "Man of Earth",
    author: "Amador T. Daguio",
    text: "Pliant is the bamboo,\nI am a man of earth.\nThey say that from the bamboo,\nWe had our first birth.\nIf the wind passes by,\nMust I stop and try to measure fully my flexibility?\nI might have been the bamboo,\nbut I will be a man!\nBend me then, O Lord,\nBend me if you can!",
    questions: questionBank.game2.slice(20, 25)
  }
]

const sentenceSleuthFeedback = [
  ["The stars are given the human ability to dance.", "This is personification because the stars are acting like humans."],
  ["Sleeping for a thousand years is an exaggerated statement.", "This is hyperbole because the sentence uses extreme exaggeration."],
  ["The sentence creates sensory details that help readers imagine the oranges.", "The sentence describes taste and texture, making it imagery."],
  ["The repeated s sound creates alliteration.", "This is alliteration because the sentence repeats the beginning s sound."],
  ["A simile compares two things using like or as.", "The sentence uses like to compare thunder to an old man."],
  ["Roared imitates the loud sound of the engine.", "This is onomatopoeia because roared sounds like the actual noise made by the engine."],
  ["The sentence creates a nervous and uneasy feeling.", "The description creates an emotional feeling for the reader, which is mood."],
  ["The sentence creates a vivid sensory image using smell.", "The description appeals to the sense of smell, making it imagery."],
  ["The repeated p sound creates alliteration.", "The sentence repeats the beginning p sound, making it alliteration."],
  ["Boom is a sound word.", "Boom copies the actual sound of thunder, making it onomatopoeia."],
  ["Cat and hat rhyme because they end with the same sound.", "The words cat and hat share the same ending sound, which makes it rhyme."],
  ["The rose symbolizes love.", "The rose stands for love, making it symbolism."],
  ["Hyperbole uses exaggeration to make a point.", "The speaker exaggerated by saying a thousand times."],
  ["Flowers are given the human ability to dance.", "The sentence gives flowers human actions, making it personification."],
  ["A metaphor directly compares two different things.", "This is a metaphor because the world is directly compared to a stage."],
  ["The storm cloud represents Marco's sadness and worries.", "The sentence directly compares Marco's emotions to a storm cloud, making it a metaphor."],
  ["The waves are described as angry, which is a human emotion.", "This is personification because the waves are given human characteristics."],
  ["The backpack does not literally weigh a ton; it is exaggerated.", "The sentence uses exaggeration to show how heavy the backpack feels."],
  ["A simile compares two things using like or as.", "The sentence compares laughter to music using the word like, making it a simile."],
  ["The broken clock represents the end of something important.", "The clock stands for the ending of the friendship, which is symbolism."],
  ["The repeated c sound creates alliteration.", "This is alliteration because several words begin with the same consonant sound."],
  ["Sizzled imitates the sound of cooking food.", "Sizzled is a sound word, making it onomatopoeia."],
  ["Mouse and house have similar ending sounds.", "The sentence uses words with matching ending sounds, which creates rhyme."],
  ["The sentence creates vivid sensory details using smell and touch.", "The detailed description appeals to the senses, making it imagery."],
  ["The description creates a scary and suspenseful feeling.", "The details create an emotional atmosphere for the reader, which is mood."],
  ["The cracked mirror symbolizes a broken relationship or conflict.", "The mirror represents emotional damage, making it symbolism."],
  ["Sofia is directly compared to a blazing fire.", "Sofia is described as fire to show passion and intensity."],
  ["The writer's attitude is critical and disappointed.", "Tone refers to the author's feelings or attitude toward the topic."],
  ["The sentence creates a fearful and suspenseful atmosphere.", "The details create an emotional feeling for the reader, making it mood."],
  ["Eating an entire restaurant is an exaggerated statement.", "The sentence exaggerates Jake's hunger, making it hyperbole."],
  ["The repeated w sound creates alliteration.", "This is alliteration because many words begin with the same sound."],
  ["Crackled and popped imitate real sounds.", "The words copy the sounds made by fireworks, making them onomatopoeia."],
  ["The swimmer is compared to a sinking stone using like.", "This is a simile because it uses like to compare two things."],
  ["The sentence uses sound and smell details to create vivid imagery.", "The detailed sensory descriptions make this imagery."],
  ["The truck is described as stubborn and able to groan.", "The truck is given human qualities, making it personification."]
]

questionBank.game1.forEach((question, index) => {
  const feedback = sentenceSleuthFeedback[index]
  if (!feedback) return

  question.correctFeedback = feedback[0]
  question.incorrectFeedback = feedback[1]
})

const sentenceSleuthLevels = [
  { level: 1, name: "Level 1", questions: questionBank.game1.slice(0, 15) },
  { level: 2, name: "Level 2", questions: questionBank.game1.slice(15, 25) },
  { level: 3, name: "Level 3", questions: questionBank.game1.slice(25, 35) }
]

function hideAllScreens() {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.add("hidden"))
  setGameIdVisibility(false)
}

function normalizePlayerName(name) {
  return (name || "").replace(/\s+/g, " ").trim().slice(0, 16)
}

function normalizeRoomCode(value) {
  const clean = String(value || "CLASS")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16)

  return clean || "CLASS"
}

function getInitialMultiplayerRoomCode() {
  const urlCode = normalizeRoomCode(new URLSearchParams(window.location.search).get("room") || "")

  if (urlCode !== "CLASS" || new URLSearchParams(window.location.search).has("room")) {
    try {
      localStorage.setItem(classroomRoomStorageKey, urlCode)
    } catch {
      // Ignore storage limits. The URL room still works.
    }
    return urlCode
  }

  try {
    return normalizeRoomCode(localStorage.getItem(classroomRoomStorageKey) || "CLASS")
  } catch {
    return "CLASS"
  }
}

function createClassroomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "ROOM"

  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }

  return code
}

function normalizeClassroomApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "")
}

function getInitialClassroomApiBase() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = normalizeClassroomApiBase(params.get("api") || "")

  if (fromUrl) {
    try {
      localStorage.setItem(classroomApiStorageKey, fromUrl)
    } catch {
      // API still works for this page load.
    }
    return fromUrl
  }

  const fromConfig = normalizeClassroomApiBase(window.METAPHORIA_API_BASE || "")
  if (fromConfig) return fromConfig

  try {
    const saved = normalizeClassroomApiBase(localStorage.getItem(classroomApiStorageKey) || "")
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

function getClassroomApiUrl(path, query = "") {
  if (!classroomApiBase) return `${path}${query}`
  if (isNetlifyFunctionApi()) return `${classroomApiBase}${query}`
  return `${classroomApiBase}${path}${query}`
}

function getClassroomRoomApiUrl() {
  return getClassroomApiUrl("/api/room", `?room=${encodeURIComponent(multiplayerRoomCode)}`)
}

function getClassroomScoreApiUrl() {
  return getClassroomApiUrl("/api/score")
}

function getClassroomEventsApiUrl() {
  if (isNetlifyFunctionApi()) return ""
  return getClassroomApiUrl("/api/events", `?room=${encodeURIComponent(multiplayerRoomCode)}&clientId=${encodeURIComponent(getMultiplayerClientId())}`)
}

function shouldShareApiParam() {
  return Boolean(classroomApiBase && !isNetlifyFunctionApi())
}

function appendClassroomParams(url, includeApi = true) {
  url.searchParams.set("room", multiplayerRoomCode)

  if (includeApi && shouldShareApiParam()) {
    url.searchParams.set("api", classroomApiBase)
  }

  return url
}

function getStudentClassroomUrl() {
  return appendClassroomParams(new URL("/index.html", window.location.origin)).href
}

function getTeacherScoreboardUrl() {
  return appendClassroomParams(new URL("/teacher-scoreboard.html", window.location.origin)).href
}

function resetMultiplayerConnection() {
  if (multiplayerEventSource) {
    multiplayerEventSource.close()
    multiplayerEventSource = null
  }

  clearInterval(multiplayerPollTimer)
  clearInterval(multiplayerHeartbeatTimer)
  clearTimeout(multiplayerScoreTimer)
  multiplayerPollTimer = null
  multiplayerHeartbeatTimer = null
  multiplayerScoreTimer = null
  multiplayerConnected = false
}

function setClassroomRoomCode(code, syncNow = true) {
  multiplayerRoomCode = normalizeRoomCode(code)

  try {
    localStorage.setItem(classroomRoomStorageKey, multiplayerRoomCode)
  } catch {
    // Room still works from the current URL.
  }

  if (window.history?.replaceState) {
    const url = new URL(window.location.href)
    url.searchParams.set("room", multiplayerRoomCode)
    window.history.replaceState(null, "", url)
  }

  updateClassroomLobby()

  if (syncNow) {
    resetMultiplayerConnection()
    initMultiplayer()
    syncMultiplayerScore("room")
  }
}

function updateClassroomLobby() {
  const roomCode = document.getElementById("classroomRoomCode")
  const roomInput = document.getElementById("classroomRoomInput")
  const studentLink = document.getElementById("classroomStudentLink")

  if (roomCode) roomCode.innerText = multiplayerRoomCode
  if (roomInput) roomInput.value = multiplayerRoomCode
  if (studentLink) studentLink.innerText = getStudentClassroomUrl()
}

function showClassroomLobby() {
  playMusic()
  hideAllScreens()
  updateClassroomLobby()
  document.getElementById("classroomLobby").classList.remove("hidden")
  setGameIdVisibility(false)
}

function createClassroomRoom() {
  setClassroomRoomCode(createClassroomCode())
  showPopup("Room Created", `Share code ${multiplayerRoomCode} or copy the student link. Open the teacher scoreboard to monitor scores.`)
}

function applyClassroomRoomFromInput() {
  const input = document.getElementById("classroomRoomInput")
  setClassroomRoomCode(input?.value || "CLASS")
  showPopup("Room Ready", `This device is now using room ${multiplayerRoomCode}.`)
}

function openTeacherScoreboard() {
  updateClassroomLobby()
  const opened = window.open(getTeacherScoreboardUrl(), "_blank")

  if (!opened) {
    window.location.href = getTeacherScoreboardUrl()
  }
}

function copyStudentClassroomLink() {
  const link = getStudentClassroomUrl()
  updateClassroomLobby()

  navigator.clipboard?.writeText(link)
    .then(() => showPopup("Student Link Copied", `Room code: ${multiplayerRoomCode}`))
    .catch(() => showPopup("Student Link", link))
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

function createProfileId() {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultGameStartRecords() {
  return {
    "1-1": { score: 0, streak: 0, hintCount: 0 }
  }
}

function resetPlayerProgress() {
  unlockedGame = 1
  completedGames = new Set()
  currentModule = 1
  lessonIndex = 0
  currentGame = 1
  currentSentenceLevel = 1
  unlockedSentenceLevel = 1
  completedSentenceLevels = new Set()
  currentQuestion = 0
  questions = []
  score = 0
  streak = 0
  correctAnswers = 0
  hintCount = 0
  rewardTracker = 0
  carryScore = 0
  carryStreak = 0
  carryHintCount = 0
  gameStartRecords = getDefaultGameStartRecords()
  earnedBadges = new Set()
  badgeProgress = createEmptyBadgeProgress()
  allBadgesBonusAwarded = false
  badgeRunSnapshot = null
}

function createDefaultPlayerProfile(name) {
  return {
    id: createProfileId(),
    name: normalizePlayerName(name) || "Player",
    badges: [],
    badgeProgress: createEmptyBadgeProgress(),
    unlockedGame: 1,
    completedGames: [],
    unlockedSentenceLevel: 1,
    completedSentenceLevels: [],
    currentSentenceLevel: 1,
    carryScore: 0,
    carryStreak: 0,
    carryHintCount: 0,
    gameStartRecords: getDefaultGameStartRecords(),
    topScore: 0,
    lastScore: 0,
    allBadgesBonusAwarded: false
  }
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function sanitizePlayerProfile(profile) {
  const safe = profile && typeof profile === "object" ? profile : {}
  const cleanBadges = Array.isArray(safe.badges)
    ? safe.badges.filter(badgeId => Boolean(badgeDefinitions[badgeId]))
    : []
  const cleanUniqueBadges = [...new Set(cleanBadges)].slice(0, BADGE_CAP)
  const cleanBadgeProgress = createEmptyBadgeProgress()

  if (safe.badgeProgress && typeof safe.badgeProgress === "object") {
    Object.keys(cleanBadgeProgress).forEach(badgeId => {
      const storedCount = Number(safe.badgeProgress[badgeId]) || 0
      cleanBadgeProgress[badgeId] = Math.min(BADGE_REQUIRED_CORRECT, Math.max(0, storedCount))
    })
  }

  cleanUniqueBadges.forEach(badgeId => {
    cleanBadgeProgress[badgeId] = BADGE_REQUIRED_CORRECT
  })

  const cleanCompletedGames = Array.isArray(safe.completedGames)
    ? safe.completedGames.map(Number).filter(game => game >= 1 && game <= 3)
    : []
  const cleanCompletedLevels = Array.isArray(safe.completedSentenceLevels)
    ? safe.completedSentenceLevels.map(Number).filter(level => level >= 1 && level <= 3)
    : []

  return {
    id: typeof safe.id === "string" && safe.id ? safe.id : createProfileId(),
    name: normalizePlayerName(safe.name) || "Player",
    badges: cleanUniqueBadges,
    badgeProgress: cleanBadgeProgress,
    unlockedGame: clampNumber(safe.unlockedGame, 1, 3, 1),
    completedGames: [...new Set(cleanCompletedGames)],
    unlockedSentenceLevel: clampNumber(safe.unlockedSentenceLevel, 1, 3, 1),
    completedSentenceLevels: [...new Set(cleanCompletedLevels)],
    currentSentenceLevel: clampNumber(safe.currentSentenceLevel, 1, 3, 1),
    carryScore: Math.max(0, Number(safe.carryScore) || 0),
    carryStreak: Math.max(0, Number(safe.carryStreak) || 0),
    carryHintCount: Math.max(0, Number(safe.carryHintCount) || 0),
    gameStartRecords: safe.gameStartRecords && typeof safe.gameStartRecords === "object"
      ? safe.gameStartRecords
      : getDefaultGameStartRecords(),
    topScore: Math.max(0, Number(safe.topScore) || 0),
    lastScore: Math.max(0, Number(safe.lastScore) || 0),
    allBadgesBonusAwarded: Boolean(safe.allBadgesBonusAwarded) && cleanUniqueBadges.length >= BADGE_CAP
  }
}

function loadStoredProfiles() {
  try {
    const storedProfiles = JSON.parse(localStorage.getItem(playerProfilesStorageKey) || "[]")
    playerProfiles = Array.isArray(storedProfiles)
      ? storedProfiles.map(sanitizePlayerProfile)
      : []

    if (!playerProfiles.length) {
      const legacyProfile = JSON.parse(localStorage.getItem(playerProfileStorageKey) || "{}")
      if (legacyProfile && legacyProfile.name) {
        playerProfiles = [sanitizePlayerProfile(legacyProfile)]
      }
    }
  } catch {
    playerProfiles = []
  }
}

function writeStoredProfiles() {
  try {
    localStorage.setItem(playerProfilesStorageKey, JSON.stringify(playerProfiles))
    if (activeProfileId) localStorage.setItem(activePlayerStorageKey, activeProfileId)
  } catch {
    // Keep in-memory profiles if browser storage is unavailable.
  }
}

function getMultiplayerClientId() {
  if (multiplayerClientId) return multiplayerClientId

  try {
    multiplayerClientId = localStorage.getItem(multiplayerClientStorageKey) || ""

    if (!multiplayerClientId) {
      multiplayerClientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem(multiplayerClientStorageKey, multiplayerClientId)
    }
  } catch {
    multiplayerClientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  return multiplayerClientId
}

function canUseMultiplayer() {
  return window.location.protocol === "http:" || window.location.protocol === "https:"
}

function setLiveScoreStatus(message) {
  const status = document.getElementById("liveScoreStatus")
  if (status) status.innerText = message
}

function setLiveScoreVisibility(show) {
  const board = document.getElementById("liveScoreBoard")
  if (!board) return

  board.classList.toggle("hidden", !show)

  if (show && board.dataset.opened !== "true") {
    board.classList.remove("collapsed")
    board.dataset.opened = "true"
  }
}

function toggleLiveScoreBoard() {
  const board = document.getElementById("liveScoreBoard")
  if (!board) return

  board.classList.toggle("collapsed")
}

function getPlayerLiveStatus() {
  if (!document.getElementById("playMode")?.classList.contains("hidden")) {
    return currentGame === 1
      ? `Playing Level ${currentSentenceLevel}`
      : "Playing"
  }

  if (!document.getElementById("learnMode")?.classList.contains("hidden")) return "Learning"
  if (!document.getElementById("moduleMap")?.classList.contains("hidden")) return "Choosing game"
  if (!document.getElementById("learnBlank")?.classList.contains("hidden")) return "Choosing lesson"
  if (!document.getElementById("chooseMode")?.classList.contains("hidden")) return "Choosing mode"
  if (!document.getElementById("profileHub")?.classList.contains("hidden")) return "Profile"

  return "Lobby"
}

function getMultiplayerPayload() {
  return {
    roomCode: multiplayerRoomCode,
    clientId: getMultiplayerClientId(),
    name: playerName || "Player",
    score,
    streak,
    hints: hintCount,
    badges: earnedBadges.size,
    game: gameTitles[currentGame] || "Lobby",
    level: currentGame === 1 ? `Level ${currentSentenceLevel}` : "",
    status: getPlayerLiveStatus()
  }
}

function createScoreRows(items = [], emptyText = "Waiting for scores", highlight = () => false) {
  if (!items.length) {
    return `<li><span class="live-score-rank">-</span><span class="live-score-name">${escapeHtml(emptyText)}</span><strong class="live-score-points">0</strong></li>`
  }

  return items.map((player, index) => {
    const isMe = highlight(player) ? " is-me" : ""
    const detail = [player.game, player.level].filter(Boolean).join(" ")
    return `
      <li class="${isMe.trim()}">
        <span class="live-score-rank">${index + 1}</span>
        <span class="live-score-name" title="${escapeHtml(detail || player.status || "")}">${escapeHtml(player.name || "Player")}</span>
        <strong class="live-score-points">${Number(player.score) || 0}</strong>
      </li>
    `
  }).join("")
}

function renderLiveScores(data = {}) {
  const liveList = document.getElementById("liveScoreList")
  const topList = document.getElementById("topScoreList")
  const room = document.getElementById("liveRoomCode")
  if (!liveList || !topList) return

  if (room) room.innerText = `Room ${multiplayerRoomCode}`

  const players = Array.isArray(data)
    ? data
    : Array.isArray(data.players)
      ? data.players
      : []
  const leaders = !Array.isArray(data) && Array.isArray(data.leaders)
    ? data.leaders
    : players
  const safePlayers = players.slice(0, 10)
  const safeLeaders = leaders.slice(0, 10)
  const myName = normalizePlayerName(playerName).toLowerCase()

  liveList.innerHTML = createScoreRows(
    safePlayers,
    "No live players",
    player => player.clientId === multiplayerClientId
  )

  topList.innerHTML = createScoreRows(
    safeLeaders,
    "Earn score first",
    player => normalizePlayerName(player.name).toLowerCase() === myName
  )

  const count = !Array.isArray(data) && Number.isFinite(Number(data.playerCount))
    ? Number(data.playerCount)
    : players.length
  const topScore = safeLeaders[0]?.score || 0
  setLiveScoreStatus(multiplayerConnected
    ? `${count} live | Beat ${topScore}`
    : "Classroom server offline")
}

function fetchRoomSnapshot() {
  return fetch(getClassroomRoomApiUrl(), { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Classroom server is not available.")
      return response.json()
    })
}

function refreshMultiplayerScores() {
  if (!canUseMultiplayer()) return

  fetchRoomSnapshot()
    .then(data => {
      multiplayerConnected = true
      renderLiveScores(data)
      setLiveScoreVisibility(true)
    })
    .catch(() => {
      multiplayerConnected = false
      setLiveScoreVisibility(true)
      setLiveScoreStatus("Open the classroom server link to sync scores.")
    })
}

function startMultiplayerPolling() {
  if (multiplayerPollTimer || !canUseMultiplayer()) return

  multiplayerPollTimer = setInterval(refreshMultiplayerScores, 5000)
}

function startMultiplayerHeartbeat() {
  if (multiplayerHeartbeatTimer || !canUseMultiplayer()) return

  multiplayerHeartbeatTimer = setInterval(() => {
    if (playerName) syncMultiplayerScore("heartbeat")
  }, 3000)
}

function openMultiplayerEvents() {
  const eventsUrl = getClassroomEventsApiUrl()
  if (!window.EventSource || multiplayerEventSource || !eventsUrl) return

  multiplayerEventSource = new EventSource(eventsUrl)

  multiplayerEventSource.addEventListener("scoreboard", event => {
    try {
      const data = JSON.parse(event.data)
      multiplayerConnected = true
      renderLiveScores(data)
      setLiveScoreVisibility(true)
    } catch {
      setLiveScoreStatus("Live scores are reconnecting.")
    }
  })

  multiplayerEventSource.onerror = () => {
    multiplayerConnected = false
    setLiveScoreStatus("Live scores are reconnecting.")
    startMultiplayerPolling()
  }
}

function syncMultiplayerScore(reason = "update") {
  if (!canUseMultiplayer() || !playerName) return

  clearTimeout(multiplayerScoreTimer)
  multiplayerScoreTimer = setTimeout(() => {
    fetch(getClassroomScoreApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getMultiplayerPayload())
    })
      .then(response => {
        if (!response.ok) throw new Error("Score sync failed.")
        return response.json()
      })
      .then(data => {
        multiplayerConnected = true
        renderLiveScores(data)
        setLiveScoreVisibility(true)
      })
      .catch(() => {
        multiplayerConnected = false
        setLiveScoreStatus("Run the classroom server to sync scores.")
      })
  }, reason === "stats" ? 120 : 0)
}

function initMultiplayer() {
  const room = document.getElementById("liveRoomCode")
  if (room) room.innerText = `Room ${multiplayerRoomCode}`

  if (!canUseMultiplayer()) {
    setLiveScoreVisibility(false)
    return
  }

  getMultiplayerClientId()
  setLiveScoreStatus("Connecting to classroom...")

  setLiveScoreVisibility(true)

  fetchRoomSnapshot()
    .then(data => {
      multiplayerConnected = true
      renderLiveScores(data)
      setLiveScoreVisibility(true)
      openMultiplayerEvents()
      startMultiplayerPolling()
      startMultiplayerHeartbeat()
      syncMultiplayerScore("join")
    })
    .catch(() => {
      multiplayerConnected = false
      renderLiveScores({ players: [], leaders: [], playerCount: 0 })
      setLiveScoreVisibility(true)
      setLiveScoreStatus("Open the classroom server link to sync scores.")
      startMultiplayerPolling()
      startMultiplayerHeartbeat()
    })
}

function getHighestStoredScore() {
  const recordScores = Object.values(gameStartRecords || {}).map(record => Number(record?.score) || 0)
  return Math.max(0, score || 0, carryScore || 0, ...recordScores)
}

function serializeCurrentProfile(existingProfile = {}) {
  const topScore = Math.max(Number(existingProfile.topScore) || 0, getHighestStoredScore())

  return sanitizePlayerProfile({
    ...existingProfile,
    id: activeProfileId || existingProfile.id || createProfileId(),
    name: playerName,
    badges: [...earnedBadges],
    badgeProgress,
    unlockedGame,
    completedGames: [...completedGames],
    unlockedSentenceLevel,
    completedSentenceLevels: [...completedSentenceLevels],
    currentSentenceLevel,
    carryScore,
    carryStreak,
    carryHintCount,
    gameStartRecords,
    topScore,
    lastScore: score,
    allBadgesBonusAwarded
  })
}

function applyPlayerProfile(profile) {
  const cleanProfile = sanitizePlayerProfile(profile)

  resetPlayerProgress()
  activeProfileId = cleanProfile.id
  playerName = cleanProfile.name
  earnedBadges = new Set(cleanProfile.badges)
  badgeProgress = { ...createEmptyBadgeProgress(), ...cleanProfile.badgeProgress }
  unlockedGame = cleanProfile.unlockedGame
  completedGames = new Set(cleanProfile.completedGames)
  unlockedSentenceLevel = cleanProfile.unlockedSentenceLevel
  completedSentenceLevels = new Set(cleanProfile.completedSentenceLevels)
  currentSentenceLevel = cleanProfile.currentSentenceLevel
  carryScore = cleanProfile.carryScore
  carryStreak = cleanProfile.carryStreak
  carryHintCount = cleanProfile.carryHintCount
  gameStartRecords = cleanProfile.gameStartRecords || getDefaultGameStartRecords()
  score = cleanProfile.lastScore || 0
  allBadgesBonusAwarded = cleanProfile.allBadgesBonusAwarded

  updateGameIdCard()
  syncMultiplayerScore("profile")
}

function savePlayerProfile() {
  if (!playerName) return

  const existingIndex = playerProfiles.findIndex(profile => profile.id === activeProfileId)
  const existingProfile = existingIndex >= 0 ? playerProfiles[existingIndex] : {}
  const savedProfile = serializeCurrentProfile(existingProfile)

  activeProfileId = savedProfile.id

  if (existingIndex >= 0) {
    playerProfiles[existingIndex] = savedProfile
  } else {
    playerProfiles.push(savedProfile)
  }

  writeStoredProfiles()
  syncMultiplayerScore("profile")
}

function loadPlayerProfile() {
  loadStoredProfiles()

  try {
    activeProfileId = localStorage.getItem(activePlayerStorageKey) || ""
  } catch {
    activeProfileId = ""
  }

  const activeProfile = playerProfiles.find(profile => profile.id === activeProfileId)
  if (activeProfile) {
    applyPlayerProfile(activeProfile)
  } else {
    activeProfileId = ""
    playerName = ""
    resetPlayerProgress()
  }
}

function updateGameIdCard() {
  const nameEl = document.getElementById("gameIdName")
  if (nameEl) nameEl.innerText = playerName || "Player"

  const card = document.getElementById("gameIdCard")
  if (card) card.classList.toggle("all-badges-active", earnedBadges.size >= BADGE_CAP)

  const earnedBadgeIds = [...earnedBadges].filter(badgeId => badgeDefinitions[badgeId]).slice(0, BADGE_CAP)

  document.querySelectorAll(".game-id-badge-slot img").forEach((img, index) => {
    const badge = badgeDefinitions[earnedBadgeIds[index]]

    if (badge) {
      img.src = badge.id
      img.alt = `${badge.label} badge`
      img.classList.add("earned")
    } else {
      img.removeAttribute("src")
      img.alt = ""
      img.classList.remove("earned")
    }
  })
}

function setGameIdVisibility(show) {
  const card = document.getElementById("gameIdCard")
  if (!card) return

  updateGameIdCard()
  card.classList.toggle("hidden", !show || !playerName)
}

function showWelcome() {
  hideAllScreens()
  document.getElementById("welcomeScreen").classList.remove("hidden")
}

function showProfileHub() {
  playMusic()
  if (playerName) savePlayerProfile()
  loadStoredProfiles()
  hideAllScreens()
  renderProfileHub()
  document.getElementById("profileHub").classList.remove("hidden")
}

function renderProfileHub() {
  const profileList = document.getElementById("profileList")
  const leaderboardList = document.getElementById("leaderboardList")
  if (!profileList || !leaderboardList) return

  if (!playerProfiles.length) {
    profileList.innerHTML = `<p class="profile-empty">No saved players yet.</p>`
  } else {
    profileList.innerHTML = playerProfiles.map(profile => {
      const badgeCount = profile.badges.length
      const activeClass = profile.id === activeProfileId ? " active" : ""
      return `
        <button type="button" class="profile-save-card${activeClass}" onclick="continuePlayer('${profile.id}')">
          <span class="profile-save-name">${escapeHtml(profile.name)}</span>
          <span class="profile-save-meta">Best ${profile.topScore} | Badges ${badgeCount}/5</span>
        </button>
      `
    }).join("")
  }

  const leaders = [...playerProfiles]
    .sort((a, b) => (b.topScore || 0) - (a.topScore || 0))
    .slice(0, 10)

  leaderboardList.innerHTML = leaders.length
    ? leaders.map(profile => `
        <li>
          <span>${escapeHtml(profile.name)}</span>
          <strong>${profile.topScore || 0}</strong>
        </li>
      `).join("")
    : `<li class="leaderboard-empty">Scores appear after a game.</li>`
}

function continuePlayer(profileId) {
  const profile = playerProfiles.find(savedProfile => savedProfile.id === profileId)
  if (!profile) return

  applyPlayerProfile(profile)
  writeStoredProfiles()
  showChooseMode()
  syncMultiplayerScore("profile")
}

function showPlayerSetup(newPlayer = false) {
  playMusic()
  creatingNewPlayer = Boolean(newPlayer)
  hideAllScreens()
  const input = document.getElementById("playerNameInput")
  document.getElementById("playerSetup").classList.remove("hidden")

  if (input) {
    input.value = creatingNewPlayer ? "" : playerName
    input.focus()
  }
}

function submitPlayerName() {
  const input = document.getElementById("playerNameInput")
  const name = normalizePlayerName(input?.value || "")

  if (!name) {
    showPopup("Name Required", "Please enter your player name before choosing a mode.")
    return
  }

  if (!creatingNewPlayer) {
    const existingProfile = playerProfiles.find(profile => profile.name.toLowerCase() === name.toLowerCase())
    if (existingProfile) {
      continuePlayer(existingProfile.id)
      return
    }
  }

  resetPlayerProgress()
  activeProfileId = createProfileId()
  playerName = name
  creatingNewPlayer = false
  savePlayerProfile()
  updateGameIdCard()
  showChooseMode()
  syncMultiplayerScore("profile")
}

function showChooseMode() {
  if (!playerName) {
    showPlayerSetup()
    return
  }

  playMusic()
  hideAllScreens()
  document.getElementById("chooseMode").classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")
}

function showLearnBlank() {
  clearInterval(lessonTimerInterval)
  hideAllScreens()
  document.getElementById("learnBlank").classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")
}

function showModuleMap() {
  playMusic()
  hideAllScreens()
  document.getElementById("moduleMap").classList.remove("hidden")
  setGameIdVisibility(true)
  updateModuleLocks()
  syncMultiplayerScore("screen")
}

function startModule(moduleNumber, skipReadTimer = false, resetGameStats = false) {
  if (moduleNumber > unlockedGame) {
    lockedMessage(moduleNumber)
    return
  }

  currentModule = moduleNumber
  lessonIndex = 0
  activeLessons = modules[moduleNumber]
  activeGuideMessages = lessonGuideMessages[moduleNumber] || []
  lessonStartsGame = true
  skipLessonReadTimer = skipReadTimer || completedGames.has(moduleNumber)
  resetStatsOnNextGameStart = resetGameStats

  hideAllScreens()
  setLearnTopicClass("game")
  document.getElementById("learnMode").classList.remove("hidden")
  showLesson()
}

function startLearnTopic(topicKey) {
  const lessons = learnModules[topicKey]
  if (!lessons) return

  playMusic()
  activeLessons = lessons
  activeGuideMessages = learnGuideMessages[topicKey] || []
  lessonStartsGame = false
  lessonIndex = 0
  skipLessonReadTimer = false
  resetStatsOnNextGameStart = false

  hideAllScreens()
  setLearnTopicClass(topicKey)
  document.getElementById("learnMode").classList.remove("hidden")
  showLesson()
}

function setLearnTopicClass(topicKey) {
  const learnMode = document.getElementById("learnMode")
  if (!learnMode) return

  learnMode.classList.remove(...learnTopicClasses)
  learnMode.classList.add(`learn-topic-${topicKey}`)
}

function getActiveLessons() {
  return activeLessons || modules[currentModule] || []
}

function showLesson() {
  const lessons = getActiveLessons()
  const lesson = lessons[lessonIndex]
  if (!lesson) return

  document.getElementById("lessonTitle").innerText = lesson.title
  document.getElementById("lessonPage").innerText = `${lessonIndex + 1}/${lessons.length}`
  document.getElementById("lessonContent").innerHTML = lesson.content
  updateLessonLayoutClass(lesson)
  updateLessonGuide()
  requestAnimationFrame(fitLessonToScroll)

  startReadTimer()
}

function updateLessonLayoutClass(lesson) {
  const learnMode = document.getElementById("learnMode")
  if (!learnMode || !lesson) return

  const content = lesson.content || ""
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const listCount = (content.match(/<li\b/g) || []).length
  const blockCount = (content.match(/<(p|li|div|h2)\b/g) || []).length
  const isBulleted = listCount > 0
  const isLong = plainText.length > 285 || listCount >= 5 || blockCount >= 8
  const isDense = plainText.length > 210 || listCount >= 4 || blockCount >= 6
  const isShort = !isBulleted && plainText.length < 170 && blockCount <= 4

  learnMode.classList.toggle("lesson-long", isLong)
  learnMode.classList.toggle("lesson-dense", isDense)
  learnMode.classList.toggle("lesson-bulleted", isBulleted)
  learnMode.classList.toggle("lesson-short", !isLong && isShort)
  learnMode.classList.remove("lesson-overflow-fit", "lesson-overflow-extra")
}

function fitLessonToScroll() {
  const learnMode = document.getElementById("learnMode")
  const content = document.getElementById("lessonContent")
  if (!learnMode || !content || learnMode.classList.contains("hidden")) return

  const hasOverflow = content.scrollHeight > content.clientHeight + 2
  learnMode.classList.toggle("lesson-overflow-fit", hasOverflow)

  if (hasOverflow) {
    requestAnimationFrame(() => {
      const stillOverflowing = content.scrollHeight > content.clientHeight + 2
      learnMode.classList.toggle("lesson-overflow-extra", stillOverflowing)
    })
  } else {
    learnMode.classList.remove("lesson-overflow-extra")
  }
}

function updateLessonGuide() {
  const guide = document.getElementById("lessonGuide")
  const bubble = document.getElementById("lessonGuideBubble")
  const lessons = getActiveLessons()
  const messages = activeGuideMessages || lessonGuideMessages[currentModule] || []

  if (guide) {
    const isHappy = lessonIndex === lessons.length - 1
    guide.src = isHappy
      ? "assets/images/guide-happy.png"
      : "assets/images/guide-default.png"
    guide.classList.toggle("guide-happy-facing", isHappy)
  }

  if (bubble) {
    bubble.innerText = messages[lessonIndex] || "Read this tutorial, then I will guide you in the game."
  }
}

function startReadTimer() {
  clearInterval(lessonTimerInterval)
  document.getElementById("readTimer").innerText = ""
  document.getElementById("nextLessonBtn").disabled = false
}

function nextLesson() {
  lessonIndex++

  const lessons = getActiveLessons()
  if (lessonIndex >= lessons.length) {
    skipLessonReadTimer = false
    if (lessonStartsGame) {
      startGame(currentModule, resetStatsOnNextGameStart)
    } else {
      activeLessons = null
      activeGuideMessages = null
      showLearnBlank()
    }
    resetStatsOnNextGameStart = false
    return
  }

  showLesson()
}

function backLesson() {
  if (lessonIndex > 0) {
    lessonIndex--
    showLesson()
  } else {
    skipLessonReadTimer = false
    if (lessonStartsGame) {
      activeLessons = null
      activeGuideMessages = null
      showModuleMap()
    } else {
      activeLessons = null
      activeGuideMessages = null
      showLearnBlank()
    }
  }
}

function resetCarryStats() {
  carryScore = 0
  carryStreak = 0
  carryHintCount = 0
}

function getGameStartKey(gameNumber, sentenceLevel = currentSentenceLevel) {
  return gameNumber === 1 ? `1-${sentenceLevel}` : `${gameNumber}`
}

function getGameStartRecord(gameNumber, resetCarriedStats = false) {
  const startKey = getGameStartKey(gameNumber)

  if (resetCarriedStats) {
    gameStartRecords[startKey] = { score: 0, streak: 0, hintCount: 0 }
  }

  if (!gameStartRecords[startKey]) {
    gameStartRecords[startKey] = {
      score: carryScore,
      streak: carryStreak,
      hintCount: carryHintCount
    }
  }

  return gameStartRecords[startKey]
}

function getSentenceSleuthLevel(levelNumber = currentSentenceLevel) {
  return sentenceSleuthLevels.find(level => level.level === levelNumber) || sentenceSleuthLevels[0]
}

function startGame(gameNumber, resetCarriedStats = false, sentenceLevel = 1) {
  if (resetCarriedStats) resetCarryStats()
  if (gameNumber === 1) currentSentenceLevel = sentenceLevel
  const startRecord = getGameStartRecord(gameNumber, resetCarriedStats)

  currentGame = gameNumber
  currentQuestion = 0
  score = startRecord.score
  correctAnswers = 0
  streak = startRecord.streak
  hintCount = startRecord.hintCount
  rewardTracker = 0
  alreadyAnswered = false

  const playMode = document.getElementById("playMode")
  playMode.classList.remove("game1-bg", "game2-bg", "game3-bg", "practice-replay")
  playMode.classList.remove("reading-text-mode")
  activeGame2Text = null

  if (completedGames.has(gameNumber)) {
    playMode.classList.add("practice-replay")
  }

  if (currentGame === 1) {
    const activeSentenceLevel = getSentenceSleuthLevel()
    questions = shuffle(activeSentenceLevel.questions).slice(0, QUESTIONS_PER_RUN)
    questionDuration = 15
    playMode.classList.add("game1-bg")
  } else if (currentGame === 2) {
    activeGame2Text = shuffle(game2LiteraryTexts)[0]
    questions = shuffle(activeGame2Text.questions).slice(0, QUESTIONS_PER_RUN)
    questionDuration = 15
    playMode.classList.add("game2-bg")
  } else {
    questions = shuffle(questionBank.game3).slice(0, QUESTIONS_PER_RUN)
    questionDuration = 60
    playMode.classList.add("game3-bg")
  }

  updateStats()
  captureBadgeRunStart()

  hideAllScreens()
  playMode.classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")

  if (currentGame === 2) {
    showGame2ReadingPage()
  } else {
    loadQuestion()
  }
}

function setGuideState(image, message) {
  const guide = document.getElementById("gameGuide")
  const bubble = document.getElementById("guideBubble")

  if (guide && image) {
    guide.src = image
    guide.classList.toggle("guide-happy-facing", image.includes("guide-happy"))
  }
  if (bubble && message) bubble.innerText = message
}

function setFeedback(type = "", word = "", detail = "", showNext = false) {
  const feedback = document.getElementById("feedback")
  if (!feedback) return

  feedback.className = showNext ? `${type} feedback-has-next` : type
  feedback.innerHTML = ""

  if (!word) return

  const wordEl = document.createElement("strong")
  wordEl.className = "feedback-word"
  wordEl.innerText = word
  feedback.appendChild(wordEl)

  if (detail) {
    const detailEl = document.createElement("span")
    detailEl.className = "feedback-detail"
    detailEl.innerText = detail
    feedback.appendChild(detailEl)
  }

  if (showNext) {
    const nextButton = document.createElement("button")
    nextButton.type = "button"
    nextButton.className = "image-btn next-image-btn feedback-next-btn"
    nextButton.setAttribute("aria-label", "Next question")
    nextButton.title = "Next"
    nextButton.addEventListener("click", () => {
      sparkButton(nextButton)
      nextButton.disabled = true
      nextQuestion()
    })
    feedback.appendChild(nextButton)
  }
}

function getGuidePrompt(question) {
  if (currentGame === 1) {
    return `${getSentenceSleuthLevel().name}: Read the sentence on the board. Choose the figure of speech it shows.`
  }

  if (currentGame === 2) {
    return "Read the text carefully. I will help you spot the figure of speech or sound device."
  }

  return `Create your own ${question.figure}. Type an answer that follows the clue.`
}

function formatLiteraryText(text) {
  return escapeHtml(text)
    .split(/\n+/)
    .map(line => `<span>${line}</span>`)
    .join("")
}

function showGame2ReadingPage() {
  const playMode = document.getElementById("playMode")
  const text = activeGame2Text || game2LiteraryTexts[0]

  alreadyAnswered = true
  clearInterval(questionTimerInterval)
  questionTimeLeft = questionDuration
  updateTimerBar(false)
  playMode.classList.add("reading-text-mode")
  setFeedback()
  document.getElementById("hintText").innerText = ""
  document.getElementById("gameTitle").innerText = gameTitles[2]
  document.getElementById("questionText").innerHTML = `
    <div class="literary-reading">
      <strong>${escapeHtml(text.title)}</strong>
      <em>${escapeHtml(text.author)}</em>
      <p>${formatLiteraryText(text.text)}</p>
    </div>
  `
  document.getElementById("choices").innerHTML = `
    <button class="start-text-questions-btn" onclick="sparkButton(this); beginGame2Questions()">Start Questions</button>
  `
  setGuideState("assets/images/guide-default.png", "Read the literary text first. The next questions will all come from this text.")
}

function beginGame2Questions() {
  document.getElementById("playMode").classList.remove("reading-text-mode")
  currentQuestion = 0
  loadQuestion()
}

function loadQuestion() {
  alreadyAnswered = false
  clearInterval(questionTimerInterval)
  document.getElementById("playMode").classList.remove("reading-text-mode")
  const fiftyButton = document.querySelector(".fifty-image-btn")
  if (fiftyButton) {
    delete fiftyButton.dataset.used
  }
  updateFiftyButtonAvailability()

  const q = questions[currentQuestion]
  setGuideState("assets/images/guide-default.png", getGuidePrompt(q))

  document.getElementById("hintText").innerText = ""
  setFeedback()
  document.getElementById("gameTitle").innerText = currentGame === 1
    ? `${gameTitles[currentGame]}\u00A0Level\u00A0${currentSentenceLevel}`
    : gameTitles[currentGame]

  if (currentGame === 3) {
    document.getElementById("questionText").innerHTML =
      `<span class="rewrite-title">Rewrite using <b>${q.figure}</b></span><span class="literal-line">Sentence: ${q.literal}</span>`

    document.getElementById("choices").innerHTML = `
      <input id="playerAnswer" class="answer-input" placeholder="Type your answer here">
      <button onclick="sparkButton(this); checkCreative()">Submit</button>
    `
  } else {
    if (q.text) {
      document.getElementById("questionText").innerHTML =
        `<b>Text:</b><br>${q.text}<br><br>${q.question}`
    } else {
      document.getElementById("questionText").innerText = q.sentence
    }

    let html = ""
    q.choices.forEach(choice => {
      html += `<button onclick="sparkButton(this); checkAnswer('${choice.replace(/'/g, "\\'")}')">${choice}</button>`
    })
    document.getElementById("choices").innerHTML = html
  }

  startQuestionTimer()
}

function checkAnswer(choice) {
  if (alreadyAnswered) return
  alreadyAnswered = true
  clearInterval(questionTimerInterval)

  const q = questions[currentQuestion]
  const correct = q.answer

  if (choice === correct) {
    score += 10
    streak++
    correctAnswers++
    rewardHint()
    const awardDelay = awardBadgeForAnswer(correct)
    setFeedback("correct", "Correct!", q.correctFeedback || "Nice work.")
    setGuideState("assets/images/guide-happy.png", q.correctFeedback || "Correct! Nice work. Get ready for the next question.")
    updateStats()
    disableChoices()
    setTimeout(nextQuestion, awardDelay || 1500)
  } else {
    streak = 0
    const correction = q.incorrectFeedback || `Correct answer: ${correct}`
    setFeedback("wrong", "Wrong!", correction, true)
    setGuideState("assets/images/guide-default.png", correction)
    updateStats()
    disableChoices()
  }
}

function checkCreative() {
  if (alreadyAnswered) return
  alreadyAnswered = true
  clearInterval(questionTimerInterval)

  const q = questions[currentQuestion]
  const answer = document.getElementById("playerAnswer").value.toLowerCase()
  const usesLikeOrAs = /\b(like|as)\b/.test(answer)
  const cleanedWords = answer
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  let correct = false

  if (q.figure === "Simile") correct = usesLikeOrAs
  if (q.figure === "Metaphor") {
    correct = answer.trim().length > 0 && !usesLikeOrAs && /\b(is|are|am|was|were|becomes?|became|turns? into)\b/.test(answer)
  }
  if (q.figure === "Personification") {
    const humanActionWords = [
      "whisper", "whispers", "whispered", "dance", "dances", "danced", "sing", "sings", "sang",
      "talk", "talks", "talked", "cry", "cries", "cried", "laugh", "laughs", "laughed",
      "smile", "smiles", "smiled", "hug", "hugs", "hugged", "call", "calls", "called",
      "scream", "screams", "screamed", "sleep", "sleeps", "slept", "sob", "sobs", "sobbed",
      "weep", "weeps", "wept", "welcome", "welcomes", "welcomed", "angry", "happy", "sad",
      "lonely", "friendly", "tired", "stubborn", "grumble", "grumbles", "grumbled",
      "run", "runs", "ran", "walk", "walks", "walked", "chase", "chases", "chased",
      "creep", "creeps", "crept", "shout", "shouts", "shouted"
    ]
    correct = humanActionWords.some(w => cleanedWords.includes(w))
  }
  if (q.figure === "Hyperbole") {
    const exaggerationWords = [
      "million", "billion", "trillion", "thousand", "hundred", "forever", "tons", "always",
      "never", "years", "year", "entire", "whole", "endless", "infinite", "mountain",
      "ocean", "world", "planet", "universe", "moon", "starving", "dying", "exploded",
      "biggest", "smallest", "heaviest"
    ]
    correct = exaggerationWords.some(w => cleanedWords.includes(w))
  }

  if (q.figure === "Alliteration") {
    correct = cleanedWords.some((word, i) => cleanedWords[i + 1] && word[0] === cleanedWords[i + 1][0])
  }

  if (correct) {
    score += 15
    correctAnswers++
    rewardHint()
    const awardDelay = awardBadgeForAnswer(q.figure)
    setFeedback("correct", "Correct!", "Good creative answer!")
    setGuideState("assets/images/guide-happy.png", "Great creative answer! You followed the figure of speech.")
    updateStats()
    disableChoices()
    setTimeout(nextQuestion, awardDelay || 1500)
    return
  } else {
    setFeedback("wrong", "Wrong!", "No points earned.", true)
    setGuideState("assets/images/guide-default.png", `Try again next time. Remember: ${q.hint}`)
  }

  updateStats()
  disableChoices()
}

function nextQuestion() {
  clearInterval(questionTimerInterval)
  currentQuestion++

  if (currentQuestion >= questions.length) {
    finishGame()
    return
  }

  loadQuestion()
}

function finishGame() {
  clearInterval(questionTimerInterval)

  setGuideState("assets/images/guide-cheer.png", "You finished the game. Let's see your result!")

  if (correctAnswers >= PASSING_ANSWERS) {
    carryScore = score
    carryStreak = streak
    carryHintCount = hintCount

    if (currentGame === 1 && currentSentenceLevel < sentenceSleuthLevels.length) {
      completedSentenceLevels.add(currentSentenceLevel)
      unlockedSentenceLevel = Math.max(unlockedSentenceLevel, currentSentenceLevel + 1)
      savePlayerProfile()
      showSentenceLevelSuccessBoard(currentSentenceLevel, currentSentenceLevel + 1)
      return
    }

    if (currentGame === 1) {
      completedSentenceLevels.add(currentSentenceLevel)
      unlockedSentenceLevel = sentenceSleuthLevels.length
    }

    completedGames.add(currentGame)

    if (currentGame < 3) {
      unlockedGame = Math.max(unlockedGame, currentGame + 1)
      savePlayerProfile()
      showSuccessBoard(currentGame, currentGame + 1)
    } else {
      savePlayerProfile()
      showSuccessBoard(currentGame)
    }
  } else {
    rollbackCurrentRunProgress()
    showPopup("Try Again", `You got ${correctAnswers}/${questions.length}. You need ${PASSING_ANSWERS}/${questions.length} to proceed. Please review this game again.`)
    if (currentGame === 1) {
      startGame(1, false, currentSentenceLevel)
    } else {
      startModule(currentGame, true)
    }
  }
}

function rewardHint() {
  rewardTracker++

  if (rewardTracker >= 2) {
    hintCount++
    rewardTracker = 0
  }
}

function showHint() {
  const q = questions[currentQuestion]

  if (hintCount <= 0) {
    document.getElementById("hintText").innerText = "No hints available. Earn hints by answering correctly."
    setGuideState("assets/images/guide-default.png", "No hints yet. Answer correctly to earn more help from me.")
    return
  }

  hintCount--
  document.getElementById("hintText").innerText = "Hint: " + q.hint
  setGuideState("assets/images/guide-default.png", "Hint: " + q.hint)
  updateStats()
}

function fiftyFifty() {
  if (currentGame === 3 || alreadyAnswered) return
  const fiftyButton = document.querySelector(".fifty-image-btn")
  if (fiftyButton?.dataset.used === "true") return

  if (hintCount <= 0) {
    document.getElementById("hintText").innerText = "No hints available. Earn hints by answering correctly."
    setGuideState("assets/images/guide-default.png", "No hints left. The 50/50 tool uses one hint too.")
    return
  }

  const q = questions[currentQuestion]
  const removeCount = Math.max(0, q.choices.length - 2)
  const wrong = q.choices.filter(c => c !== q.answer).slice(0, removeCount)
  const choiceWord = wrong.length === 1 ? "choice" : "choices"
  hintCount--
  if (fiftyButton) {
    fiftyButton.dataset.used = "true"
    fiftyButton.disabled = true
  }
  setGuideState("assets/images/guide-default.png", `I removed ${wrong.length} wrong ${choiceWord}. Compare the remaining answers.`)

  document.querySelectorAll("#choices button").forEach(btn => {
    if (wrong.includes(btn.innerText)) btn.style.display = "none"
  })
  updateStats()
}

function updateStats() {
  document.getElementById("score").innerText = score
  document.getElementById("streak").innerText = streak
  document.getElementById("hintCount").innerText = hintCount
  updateFiftyButtonAvailability()
  syncMultiplayerScore("stats")
}

function updateFiftyButtonAvailability() {
  const fiftyButton = document.querySelector(".fifty-image-btn")
  if (!fiftyButton) return

  fiftyButton.disabled = currentGame === 3
    || alreadyAnswered
    || hintCount <= 0
    || fiftyButton.dataset.used === "true"
}

function updateTimerBar(animate = true) {
  const timerBar = document.getElementById("timerBar")
  if (!timerBar) return

  const ratio = questionDuration > 0 ? Math.max(0, questionTimeLeft) / questionDuration : 0

  if (!animate) {
    timerBar.classList.add("resetting")
  }

  timerBar.style.width = `${ratio * 100}%`

  if (!animate) {
    timerBar.offsetWidth
    timerBar.classList.remove("resetting")
  }
}

function startQuestionTimer(resetTime = true) {
  clearInterval(questionTimerInterval)

  if (resetTime) {
    questionTimeLeft = questionDuration
  }

  updateTimerBar(false)

  questionTimerInterval = setInterval(() => {
    questionTimeLeft--
    updateTimerBar()

    if (questionTimeLeft <= 0 && !alreadyAnswered) {
      alreadyAnswered = true
      clearInterval(questionTimerInterval)
      questionTimeLeft = 0
      updateTimerBar()
      streak = 0
      updateStats()
      setFeedback("timeout", "Time's up!", "No points earned.", true)
      setGuideState("assets/images/guide-default.png", "Time is up. Stay with me and try the next question.")
      disableChoices()
    }
  }, 1000)
}

function disableChoices() {
  document.querySelectorAll("#choices button").forEach(btn => btn.disabled = true)

  const input = document.getElementById("playerAnswer")
  if (input) input.disabled = true
}

function updateModuleLocks() {
  const module2 = document.getElementById("module2")
  if (module2) {
    if (unlockedGame >= 2) {
      module2.className = "module-card module-card-image text-detectives-card unlocked"
      module2.onclick = () => startModule(2)
      module2.querySelector("span").innerText = "Unlocked"
    } else {
      module2.className = "module-card module-card-image text-detectives-card locked"
      module2.onclick = () => lockedMessage(2)
      module2.querySelector("span").innerText = "Locked"
    }
  }

  const module3 = document.getElementById("module3")
  if (module3) {
    if (unlockedGame >= 3) {
      module3.className = "module-card module-card-image expression-lab-card unlocked"
      module3.onclick = () => startModule(3)
      module3.querySelector("span").innerText = "Unlocked"
    } else {
      module3.className = "module-card module-card-image expression-lab-card locked"
      module3.onclick = () => lockedMessage(3)
      module3.querySelector("span").innerText = "Locked"
    }
  }
}

function lockedMessage(moduleNumber) {
  if (moduleNumber === 2 && !completedGames.has(1)) {
    showPopup("NOTE", "Please finish Sentence Sleuths Levels 1, 2, and 3 before proceeding.")
    return
  }

  showPopup("NOTE", `Please finish Game ${moduleNumber - 1} first before proceeding.`)
}

function getBadgeKeyFromAnswer(answer) {
  const normalizedAnswer = String(answer || "").trim().toLowerCase()
  return Object.keys(badgeDefinitions).find(key => badgeDefinitions[key].label.toLowerCase() === normalizedAnswer) || null
}

function awardBadgeForAnswer(answer) {
  const badgeKey = getBadgeKeyFromAnswer(answer)
  if (!badgeKey || earnedBadges.has(badgeKey)) return 0
  if (earnedBadges.size >= BADGE_CAP) return 0

  const currentCount = badgeProgress[badgeKey] || 0
  badgeProgress[badgeKey] = Math.min(BADGE_REQUIRED_CORRECT, currentCount + 1)

  if (badgeProgress[badgeKey] < BADGE_REQUIRED_CORRECT) {
    return 0
  }

  earnedBadges.add(badgeKey)
  badgeProgress[badgeKey] = BADGE_REQUIRED_CORRECT
  const completedAllBadges = earnedBadges.size >= BADGE_CAP && !allBadgesBonusAwarded

  if (completedAllBadges) {
    score += ALL_BADGES_BONUS
    allBadgesBonusAwarded = true
  }

  updateGameIdCard()
  showBadgeAward(badgeKey, completedAllBadges)
  return completedAllBadges ? 3700 : 2600
}

function showBadgeAward(badgeKey, completedAllBadges = false) {
  const badge = badgeDefinitions[badgeKey]
  if (!badge) return

  const panel = document.getElementById("badgePanel")
  const title = panel.querySelector("h2")
  const image = document.getElementById("badgeAwardImage")
  const message = document.getElementById("badgeAwardMessage")

  panel.classList.toggle("all-badges-bonus", completedAllBadges)
  if (title) title.innerText = completedAllBadges ? "All Badges Activated!" : "Badge Earned!"
  image.src = badge.display
  image.alt = `${badge.label} badge`
  message.innerText = completedAllBadges
    ? `${playerName || "Player"}, you collected all five badges! Bonus +${ALL_BADGES_BONUS} points activated.`
    : `${playerName || "Player"}, you answered 3 ${badge.label} items correctly and earned the badge!`
  panel.classList.remove("hidden")
  createCompletionFireworks()

  clearTimeout(showBadgeAward.hideTimer)
  showBadgeAward.hideTimer = setTimeout(() => {
    panel.classList.add("hidden")
    panel.classList.remove("all-badges-bonus")
  }, completedAllBadges ? 3400 : 2300)
}

function showPopup(title, message) {
  document.getElementById("popupBox").classList.remove("mechanics-popup")
  document.getElementById("popupTitle").innerText = title
  document.getElementById("popupMessage").innerText = message
  document.getElementById("popupPanel").classList.remove("hidden")
}

function closePopup() {
  document.getElementById("popupBox").classList.remove("mechanics-popup")
  document.getElementById("popupPanel").classList.add("hidden")
}

function showSuccessBoard(gameNumber, nextGame = null) {
  const title = document.getElementById("successTitle")
  const message = document.getElementById("successMessage")
  const actions = document.getElementById("successActions")

  title.innerText = "Complete!"

  const summary = `Score: ${score} | Hints: ${hintCount} | Streak: ${streak}`

  if (nextGame) {
    message.innerText = `${gameTitles[gameNumber]} complete!\n${summary}\n${gameTitles[nextGame]} is unlocked.`
    actions.innerHTML = `
      <button onclick="goToNextGame(${nextGame})" class="image-btn next-image-btn" aria-label="Go to Game ${nextGame}" title="Go to Game ${nextGame}"></button>
      <button onclick="restartCompletedGame(${gameNumber})" class="image-btn restart-image-btn" aria-label="Restart Game ${gameNumber}" title="Restart Game ${gameNumber}"></button>
    `
  } else {
    message.innerText = `All games complete!\n${summary}\nGreat job using figurative language with confidence.`
    actions.innerHTML = `
      <button onclick="restartCompletedGame(${gameNumber})" class="image-btn restart-image-btn" aria-label="Restart Game ${gameNumber}" title="Restart Game ${gameNumber}"></button>
      <button onclick="exitSuccessBoard()" class="image-btn exit-image-btn" aria-label="Exit" title="Exit"></button>
    `
  }

  document.getElementById("successPanel").classList.remove("hidden")
  createCompletionFireworks()
}

function showSentenceLevelSuccessBoard(levelNumber, nextLevel) {
  const title = document.getElementById("successTitle")
  const message = document.getElementById("successMessage")
  const actions = document.getElementById("successActions")
  const summary = `Score: ${score} | Hints: ${hintCount} | Streak: ${streak}`

  title.innerText = "Complete!"
  message.innerText = `Sentence Sleuths Level ${levelNumber} complete!\n${summary}\nLevel ${nextLevel} is unlocked.`
  actions.innerHTML = `
    <button onclick="goToSentenceLevel(${nextLevel})" class="image-btn next-image-btn" aria-label="Go to Sentence Sleuths Level ${nextLevel}" title="Go to Sentence Sleuths Level ${nextLevel}"></button>
    <button onclick="restartSentenceLevel(${levelNumber})" class="image-btn restart-image-btn" aria-label="Restart Sentence Sleuths Level ${levelNumber}" title="Restart Sentence Sleuths Level ${levelNumber}"></button>
  `

  document.getElementById("successPanel").classList.remove("hidden")
  createCompletionFireworks()
}

function closeSuccessBoard() {
  document.getElementById("successPanel").classList.add("hidden")
}

function goToNextGame(gameNumber) {
  closeSuccessBoard()
  startModule(gameNumber)
}

function goToSentenceLevel(levelNumber) {
  closeSuccessBoard()
  startGame(1, false, levelNumber)
}

function restartSentenceLevel(levelNumber) {
  closeSuccessBoard()
  startGame(1, false, levelNumber)
}

function restartCompletedGame(gameNumber) {
  closeSuccessBoard()
  startGame(gameNumber, false, 1)
}

function exitSuccessBoard() {
  closeSuccessBoard()
  showModuleMap()
}

function showInstructions() {
  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")

  popupBox.classList.add("mechanics-popup")
  document.getElementById("popupTitle").innerText = "Game Mechanics"
  popupMessage.innerHTML = `
    <div class="mechanics-guide">
      <div class="mechanics-flow" aria-label="Game flow">
        <div class="mechanics-step">
          <span class="mechanics-number">1</span>
          <strong>Learn First</strong>
          <p>Read the short tutorial before each game.</p>
        </div>
        <div class="mechanics-step">
          <span class="mechanics-number">2</span>
          <strong>Answer</strong>
          <p>Choose the best answer or type your own sentence.</p>
        </div>
        <div class="mechanics-step">
          <span class="mechanics-number">3</span>
          <strong>Get Feedback</strong>
          <p>See correct or wrong feedback after every item.</p>
        </div>
        <div class="mechanics-step">
          <span class="mechanics-number">4</span>
          <strong>Unlock</strong>
          <p>Pass with 4 out of 5 to open the next level or game.</p>
        </div>
      </div>

      <div class="mechanics-games" aria-label="Game modes">
        <div class="mechanics-game-card">
          <span class="mechanics-game-badge">Game 1</span>
          <strong>Sentence Sleuths</strong>
          <p>Clear Levels 1, 2, and 3 before Text Detectives unlocks.</p>
        </div>
        <div class="mechanics-game-card">
          <span class="mechanics-game-badge">Game 2</span>
          <strong>Text Detectives</strong>
          <p>Analyze lines and clues from longer text.</p>
        </div>
        <div class="mechanics-game-card">
          <span class="mechanics-game-badge">Game 3</span>
          <strong>Expression Lab</strong>
          <p>Create your own figurative language from a given clue.</p>
        </div>
      </div>

      <div class="mechanics-rules" aria-label="Rules and tools">
        <div class="mechanics-rule">
          <span>Score</span>
          <strong>+10 / +15</strong>
          <p>Choice answers earn 10. Creative answers earn 15.</p>
        </div>
        <div class="mechanics-rule">
          <span>Timer</span>
          <strong>15 sec</strong>
          <p>The green bar shows time left for each question.</p>
        </div>
        <div class="mechanics-rule">
          <span>Hints</span>
          <strong>Earned</strong>
          <p>Answer correctly to earn guide help for later items.</p>
        </div>
        <div class="mechanics-rule">
          <span>50/50</span>
          <strong>Games 1-2</strong>
          <p>Remove wrong choices when you need support.</p>
        </div>
      </div>
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null
}

function updateFullscreenButton() {
  const button = document.getElementById("fullscreenBtn")
  if (!button) return

  const isFullscreen = Boolean(getFullscreenElement())
  button.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen")
  button.title = isFullscreen ? "Exit fullscreen" : "Fullscreen"
  document.body.classList.toggle("is-fullscreen", isFullscreen)
  updateFixedLayout()
}

function toggleFullscreen() {
  const activeElement = getFullscreenElement()

  if (activeElement) {
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
    if (exitFullscreen) exitFullscreen.call(document)
    return
  }

  const target = document.documentElement
  const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen

  if (!requestFullscreen) {
    return
  }

  const request = requestFullscreen.call(target, { navigationUI: "hide" })
  if (request && request.catch) {
    request.catch(() => {})
  }
}

document.addEventListener("fullscreenchange", updateFullscreenButton)
document.addEventListener("webkitfullscreenchange", updateFullscreenButton)
document.addEventListener("MSFullscreenChange", updateFullscreenButton)

function openSettings() {
  clearInterval(questionTimerInterval)
  document.getElementById("settingsPanel").classList.remove("hidden")
}

function closeSettings() {
  document.getElementById("settingsPanel").classList.add("hidden")

  if (!alreadyAnswered && !document.getElementById("playMode").classList.contains("hidden")) {
    startQuestionTimer(false)
  }
}

function restartGame() {
  document.getElementById("settingsPanel").classList.add("hidden")
  rollbackCurrentRunProgress()
  startGame(currentGame, false, currentGame === 1 ? currentSentenceLevel : 1)
}

function endGame() {
  clearInterval(questionTimerInterval)
  document.getElementById("settingsPanel").classList.add("hidden")
  rollbackCurrentRunProgress()
  showModuleMap()
}

function toggleMusic() {
  const music = document.getElementById("bgMusic")

  musicMuted = !musicMuted

  if (!musicMuted) {
    music.volume = 0.25
    music.play().catch(() => {})
  } else {
    music.pause()
  }

  updateMuteButton()
}

function playMusic() {
  const music = document.getElementById("bgMusic")
  if (musicMuted) return
  music.volume = 0.25
  music.play().catch(() => {})
}

function updateMuteButton() {
  const button = document.getElementById("muteBtn")
  if (!button) return

  button.classList.toggle("is-muted", musicMuted)
  button.setAttribute("aria-label", musicMuted ? "Unmute music" : "Mute music")
  button.title = musicMuted ? "Unmute music" : "Mute music"
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

function createGlitterBurst(x, y) {
  const burst = document.createElement("span")
  burst.className = "glitter-burst"
  burst.style.transform = `translate(${x}px, ${y}px)`

  for (let i = 0; i < 20; i++) {
    const spark = document.createElement("span")
    const angle = (Math.PI * 2 * i) / 20
    const distance = 42 + Math.random() * 36
    spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`)
    spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`)
    spark.style.animationDelay = `${Math.random() * 70}ms`
    burst.appendChild(spark)
  }

  document.body.appendChild(burst)
  setTimeout(() => burst.remove(), 980)
}

function createCompletionFireworks() {
  const show = document.createElement("span")
  show.className = "fireworks-show"
  document.body.appendChild(show)

  const bursts = [
    [22, 24],
    [50, 18],
    [78, 25],
    [34, 42],
    [66, 43]
  ]

  bursts.forEach(([x, y], burstIndex) => {
    for (let i = 0; i < 20; i++) {
      const spark = document.createElement("span")
      const angle = (Math.PI * 2 * i) / 20
      const distance = 62 + Math.random() * 58
      spark.style.left = `${x}vw`
      spark.style.top = `${y}vh`
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`)
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`)
      spark.style.animationDelay = `${burstIndex * 180 + Math.random() * 80}ms`
      show.appendChild(spark)
    }
  })

  setTimeout(() => show.remove(), 3600)
}

function sparkButton(button) {
  if (!button || button.disabled) return

  const rect = button.getBoundingClientRect()
  createGlitterBurst(rect.left + rect.width / 2, rect.top + rect.height / 2)
}

loadPlayerProfile()
updateGameIdCard()
initMultiplayer()

const playerNameInput = document.getElementById("playerNameInput")
if (playerNameInput) {
  playerNameInput.value = playerName
  playerNameInput.addEventListener("input", () => {
    playerNameInput.value = playerNameInput.value.slice(0, 16)
  })
  playerNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") submitPlayerName()
  })
}

document.addEventListener("click", event => {
  const target = event.target.closest("button")
  if (!target || target.disabled) return

  createGlitterBurst(event.clientX, event.clientY)
})
