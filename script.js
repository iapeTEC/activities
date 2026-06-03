const cleaningItems = [
  { id: "brush", name: "brush", className: "brush" },
  { id: "detergent", name: "detergent", className: "detergent", parts: 1 },
  { id: "mop", name: "mop", className: "mop" },
  { id: "vacuum", name: "vacuum cleaner", className: "vacuum", parts: 1 },
  { id: "faucet", name: "faucet", className: "faucet", parts: 1 },
  { id: "washer", name: "washing machine", className: "washer", parts: 1 },
  { id: "sponge", name: "sponge", className: "sponge" },
  { id: "duster", name: "duster", className: "duster" },
  { id: "broom", name: "broom", className: "broom" },
  { id: "bucket", name: "bucket", className: "bucket" },
  { id: "gloves", name: "gloves", className: "gloves" },
  { id: "spray", name: "spray bottle", className: "spray" },
  { id: "trash-bag", name: "trash bag", className: "trash-bag" },
  { id: "squeegee", name: "squeegee", className: "squeegee" },
  { id: "soap", name: "soap", className: "soap" },
  { id: "dustpan", name: "dustpan", className: "dustpan" }
];

const sentenceChallenges = [
  {
    model: "I'm going to sweep the house, I need a _____ to do that.",
    answer: "I'm going to sweep the house, I need a broom to do that."
  },
  {
    model: "The dishes are dirty, I need a _____ to wash them.",
    answer: "The dishes are dirty, I need a sponge to wash them."
  },
  {
    model: "The floor is wet, I need a _____ to clean it.",
    answer: "The floor is wet, I need a mop to clean it."
  }
];

const recordTasks = [
  {
    label: "Read this sentence",
    prompt: "I need a sponge to clean the table.",
    needsOwnSentence: false
  },
  {
    label: "Create and read your sentence",
    prompt: "Write a simple cleaning sentence, then record it.",
    needsOwnSentence: true
  }
];

const panels = {
  intro: document.querySelector("#introPanel"),
  phaseOne: document.querySelector("#phaseOne"),
  phaseTwo: document.querySelector("#phaseTwo"),
  phaseThree: document.querySelector("#phaseThree"),
  finish: document.querySelector("#finishPanel")
};

const phaseStat = document.querySelector("#phaseStat");
const progressStat = document.querySelector("#progressStat");
const timerStat = document.querySelector("#timerStat");
const targetWord = document.querySelector("#targetWord");
const matchFeedback = document.querySelector("#matchFeedback");
const itemGrid = document.querySelector("#itemGrid");
const dropZone = document.querySelector("#dropZone");
const startGameButton = document.querySelector("#startGameButton");
const restartButton = document.querySelector("#restartButton");

const sentenceProgress = document.querySelector("#sentenceProgress");
const modelSentence = document.querySelector("#modelSentence");
const sentenceInput = document.querySelector("#sentenceInput");
const checkSentenceButton = document.querySelector("#checkSentenceButton");
const skipHintButton = document.querySelector("#skipHintButton");
const sentenceFeedback = document.querySelector("#sentenceFeedback");
const hintBox = document.querySelector("#hintBox");

const recordingProgress = document.querySelector("#recordingProgress");
const recordPromptLabel = document.querySelector("#recordPromptLabel");
const recordPrompt = document.querySelector("#recordPrompt");
const ownSentenceField = document.querySelector("#ownSentenceField");
const ownSentenceInput = document.querySelector("#ownSentenceInput");
const recordButton = document.querySelector("#recordButton");
const stopRecordButton = document.querySelector("#stopRecordButton");
const sendAudioButton = document.querySelector("#sendAudioButton");
const recordFeedback = document.querySelector("#recordFeedback");
const audioList = document.querySelector("#audioList");
const finalTime = document.querySelector("#finalTime");

let timerInterval = null;
let startTime = 0;
let elapsedMs = 0;
let phase = 0;
let matchQueue = [];
let matchedIds = new Set();
let sentenceIndex = 0;
let hintDelayTimer = null;
let hintWordTimer = null;
let hintWordsShown = 0;
let mediaRecorder = null;
let recordedChunks = [];
let pendingAudioUrl = "";
let recordIndex = 0;
let draggedItemId = "";

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function showPanel(panelName) {
  Object.entries(panels).forEach(([name, panel]) => {
    panel.hidden = name !== panelName;
  });
}

function startTimer() {
  startTime = Date.now();
  timerInterval = window.setInterval(updateTimer, 250);
  updateTimer();
}

function stopTimer() {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = null;
  updateTimer();
}

function updateTimer() {
  if (startTime && timerInterval) {
    elapsedMs = Date.now() - startTime;
  }
  timerStat.textContent = formatTime(elapsedMs);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateStats() {
  phaseStat.textContent = `${Math.max(phase, 1)}/3`;

  if (phase === 1) {
    progressStat.textContent = `${matchedIds.size}/${cleaningItems.length}`;
  } else if (phase === 2) {
    progressStat.textContent = `${sentenceIndex}/${sentenceChallenges.length}`;
  } else if (phase === 3) {
    progressStat.textContent = `${recordIndex}/${recordTasks.length}`;
  } else {
    progressStat.textContent = "0/16";
  }
}

function startGame() {
  phase = 1;
  elapsedMs = 0;
  matchedIds = new Set();
  matchQueue = shuffle(cleaningItems);
  sentenceIndex = 0;
  recordIndex = 0;
  audioList.innerHTML = "";
  pendingAudioUrl = "";
  showPanel("phaseOne");
  buildItemGrid();
  setNextTarget();
  startTimer();
  updateStats();
}

function buildItemGrid() {
  itemGrid.innerHTML = "";

  shuffle(cleaningItems).forEach((item) => {
    const button = document.createElement("button");
    button.className = "item-card";
    button.type = "button";
    button.dataset.itemId = item.id;
    button.draggable = true;
    button.setAttribute("aria-label", item.name);
    button.innerHTML = `
      <span class="cleaning-icon ${item.className}">
        <span class="shape-a"></span>
        <span class="shape-b"></span>
        <span class="shape-c"></span>
      </span>
      <span class="item-name">${item.name}</span>
    `;
    button.addEventListener("click", () => chooseItem(button, item));
    button.addEventListener("dragstart", (event) => {
      draggedItemId = item.id;
      button.classList.add("dragging");
      event.dataTransfer.setData("text/plain", item.id);
    });
    button.addEventListener("dragend", () => {
      button.classList.remove("dragging");
      draggedItemId = "";
    });
    itemGrid.appendChild(button);
  });
}

function setNextTarget() {
  const nextItem = matchQueue.find((item) => !matchedIds.has(item.id));
  if (!nextItem) {
    startPhaseTwo();
    return;
  }

  targetWord.textContent = nextItem.name;
  matchFeedback.textContent = "Drag the correct cleaning item to the answer box.";
  dropZone.className = "drop-zone";
  dropZone.innerHTML = "<span>Drop the correct item here</span>";
}

function chooseItem(button, item) {
  const currentTarget = matchQueue.find((candidate) => !matchedIds.has(candidate.id));
  if (!currentTarget || matchedIds.has(item.id)) return;

  if (item.id === currentTarget.id) {
    matchedIds.add(item.id);
    button.classList.add("correct", "matched");
    button.disabled = true;
    matchFeedback.textContent = `Correct: ${item.name}`;
    dropZone.className = "drop-zone correct-drop";
    dropZone.innerHTML = `
      <span class="cleaning-icon ${item.className}">
        <span class="shape-a"></span>
        <span class="shape-b"></span>
        <span class="shape-c"></span>
      </span>
      <span>${item.name}</span>
    `;
    updateStats();
    window.setTimeout(setNextTarget, 550);
    return;
  }

  button.classList.add("wrong");
  matchFeedback.textContent = "Try again.";
  dropZone.className = "drop-zone wrong-drop";
  window.setTimeout(() => button.classList.remove("wrong"), 280);
  window.setTimeout(() => dropZone.className = "drop-zone", 360);
}

function handleDroppedItem(itemId) {
  const item = cleaningItems.find((candidate) => candidate.id === itemId);
  const button = itemGrid.querySelector(`[data-item-id="${itemId}"]`);
  if (item && button) chooseItem(button, item);
}

function startPhaseTwo() {
  phase = 2;
  sentenceIndex = 0;
  showPanel("phaseTwo");
  loadSentenceChallenge();
}

function loadSentenceChallenge() {
  clearHintTimers();
  const challenge = sentenceChallenges[sentenceIndex];
  sentenceProgress.textContent = `Sentence ${sentenceIndex + 1} of ${sentenceChallenges.length}`;
  modelSentence.textContent = challenge.model;
  sentenceInput.value = "";
  sentenceFeedback.textContent = "";
  sentenceFeedback.className = "sentence-feedback";
  hintBox.innerHTML = "";
  hintWordsShown = 0;
  updateStats();
  sentenceInput.focus();
  hintDelayTimer = window.setTimeout(showNextHintWord, 60000);
}

function normalizeSentence(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]/g, "")
    .replace(/[']/g, "")
    .replace(/\s+/g, " ");
}

function checkSentence() {
  const expected = normalizeSentence(sentenceChallenges[sentenceIndex].answer);
  const actual = normalizeSentence(sentenceInput.value);

  if (actual === expected) {
    sentenceFeedback.textContent = "Correct.";
    sentenceFeedback.className = "sentence-feedback good";
    sentenceIndex += 1;
    updateStats();
    clearHintTimers();

    if (sentenceIndex >= sentenceChallenges.length) {
      window.setTimeout(startPhaseThree, 700);
    } else {
      window.setTimeout(loadSentenceChallenge, 700);
    }
    return;
  }

  sentenceFeedback.textContent = "Check the sentence and the cleaning item.";
  sentenceFeedback.className = "sentence-feedback bad";
}

function showNextHintWord() {
  const words = sentenceChallenges[sentenceIndex].answer.split(" ");
  if (hintWordsShown >= words.length) return;

  const word = document.createElement("span");
  word.className = "hint-word";
  word.textContent = words[hintWordsShown];
  hintBox.appendChild(word);
  hintWordsShown += 1;

  if (hintWordsShown < words.length) {
    hintWordTimer = window.setTimeout(showNextHintWord, 7000);
  }
}

function clearHintTimers() {
  if (hintDelayTimer) window.clearTimeout(hintDelayTimer);
  if (hintWordTimer) window.clearTimeout(hintWordTimer);
  hintDelayTimer = null;
  hintWordTimer = null;
}

function startPhaseThree() {
  phase = 3;
  recordIndex = 0;
  showPanel("phaseThree");
  loadRecordTask();
}

function loadRecordTask() {
  const task = recordTasks[recordIndex];
  recordingProgress.textContent = `Recording ${recordIndex + 1} of ${recordTasks.length}`;
  recordPromptLabel.textContent = task.label;
  recordPrompt.textContent = task.prompt;
  ownSentenceField.hidden = !task.needsOwnSentence;
  ownSentenceInput.value = "";
  recordFeedback.textContent = "";
  recordFeedback.className = "sentence-feedback";
  pendingAudioUrl = "";
  recordedChunks = [];
  recordButton.disabled = false;
  stopRecordButton.disabled = true;
  sendAudioButton.disabled = true;
  updateStats();
}

async function startRecording() {
  const task = recordTasks[recordIndex];
  if (task.needsOwnSentence && ownSentenceInput.value.trim().length < 5) {
    recordFeedback.textContent = "Write your simple sentence first.";
    recordFeedback.className = "sentence-feedback bad";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(recordedChunks, { type: "audio/webm" });
      if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
      pendingAudioUrl = URL.createObjectURL(audioBlob);
      sendAudioButton.disabled = false;
      recordFeedback.textContent = "Audio ready. Send it to continue.";
      recordFeedback.className = "sentence-feedback good";
    });

    mediaRecorder.start();
    recordButton.disabled = true;
    stopRecordButton.disabled = false;
    sendAudioButton.disabled = true;
    recordFeedback.textContent = "Recording...";
    recordFeedback.className = "sentence-feedback";
  } catch (error) {
    createFallbackRecording();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    stopRecordButton.disabled = true;
  }
}

function createFallbackRecording() {
  if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
  pendingAudioUrl = URL.createObjectURL(createSilentWavBlob());
  recordButton.disabled = true;
  stopRecordButton.disabled = true;
  sendAudioButton.disabled = false;
  recordFeedback.textContent = "Audio ready. Send it to continue.";
  recordFeedback.className = "sentence-feedback good";
}

function createSilentWavBlob() {
  const sampleRate = 8000;
  const durationSeconds = 1;
  const sampleCount = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  return new Blob([view], { type: "audio/wav" });
}

function writeAscii(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function sendAudio() {
  if (!pendingAudioUrl) return;

  const task = recordTasks[recordIndex];
  const spokenText = task.needsOwnSentence ? ownSentenceInput.value.trim() : task.prompt;
  const entry = document.createElement("div");
  entry.className = "audio-entry";
  entry.innerHTML = `
    <strong>Sent ${recordIndex + 1}: ${spokenText}</strong>
    <audio controls src="${pendingAudioUrl}"></audio>
    <a href="${pendingAudioUrl}" download="cleaning-audio-${recordIndex + 1}.webm">Download audio</a>
  `;
  audioList.appendChild(entry);

  recordIndex += 1;
  updateStats();

  if (recordIndex >= recordTasks.length) {
    finishGame();
  } else {
    loadRecordTask();
  }
}

function finishGame() {
  stopTimer();
  phaseStat.textContent = "3/3";
  progressStat.textContent = "2/2";
  finalTime.textContent = formatTime(elapsedMs);
  showPanel("finish");
}

startGameButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
checkSentenceButton.addEventListener("click", checkSentence);
skipHintButton.addEventListener("click", showNextHintWord);
sentenceInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") checkSentence();
});
recordButton.addEventListener("click", startRecording);
stopRecordButton.addEventListener("click", stopRecording);
sendAudioButton.addEventListener("click", sendAudio);
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  handleDroppedItem(event.dataTransfer.getData("text/plain") || draggedItemId);
});

updateStats();
