const items = [
  { id: 'ruler', file: 'ruler.png', label: 'Ruler', target: [3, 1] },
  { id: 'pencilcase', file: 'pencilcase.png', label: 'Pencil case', target: [2, 10] },
  { id: 'erase', file: 'erase.png', label: 'Eraser', target: [8, 7] },
  { id: 'sharpener', file: 'sharpener.png', label: 'Sharpener', target: [4, 7] },
  { id: 'stapler', file: 'stapler.png', label: 'Stapler', target: [3, 3] },
  { id: 'notebook', file: 'notebook.png', label: 'Notebook', target: [5, 5] },
  { id: 'scissors', file: 'scissors.png', label: 'Scissors', target: [8, 2] },
  { id: 'pen', file: 'pen.png', label: 'Pen', target: [7, 9] }
];

const board = document.getElementById('board');
const legend = document.getElementById('legend');
const globalStatus = document.getElementById('globalStatus');
const checkBtn = document.getElementById('checkBtn');
const resetBtn = document.getElementById('resetBtn');
const gamePage = document.getElementById('gamePage');
const successScreen = document.getElementById('successScreen');
const teacherScreen = document.getElementById('teacherScreen');
const teacherOnlyBtn = document.getElementById('teacherOnlyBtn');
const groupModal = document.getElementById('groupModal');
const groupInput = document.getElementById('groupInput');
const groupConfirmBtn = document.getElementById('groupConfirmBtn');
const groupCancelBtn = document.getElementById('groupCancelBtn');
const groupNameDisplay = document.getElementById('groupNameDisplay');
const codeInput = document.getElementById('codeInput');
const openBtn = document.getElementById('openBtn');
const treasureStatus = document.getElementById('treasureStatus');
const confettiCanvas = document.getElementById('confettiCanvas');

const axisMin = -10;
const axisMax = 10;
const span = axisMax - axisMin;
const tokenSize = 58;
const state = {};
const teacherCode = 'RGH';
const confettiPieces = [];
let confettiAnimationId = null;

function boardSize() {
  return board.clientWidth;
}

function step() {
  return boardSize() / (span + 2);
}

function coordToPixel(x, y) {
  const s = step();
  return {
    x: (x - axisMin + 1) * s,
    y: (axisMax - y + 1) * s
  };
}

function pixelToCoord(left, top) {
  const s = step();
  const cx = left + tokenSize / 2;
  const cy = top + tokenSize / 2;
  const x = Math.max(axisMin, Math.min(axisMax, Math.round(cx / s) + axisMin - 1));
  const y = Math.max(axisMin, Math.min(axisMax, axisMax - Math.round(cy / s) + 1));
  return { x, y };
}

function coordToTokenPosition(x, y) {
  const p = coordToPixel(x, y);
  return { left: p.x - tokenSize / 2, top: p.y - tokenSize / 2 };
}

function drawGrid() {
  board.innerHTML = '';
  const size = boardSize();

  for (let i = axisMin; i <= axisMax; i++) {
    const vx = coordToPixel(i, 0).x;
    const hy = coordToPixel(0, i).y;

    const vLine = document.createElement('div');
    vLine.className = `grid-line ${i === 0 ? 'axis' : ''}`;
    vLine.style.width = i === 0 ? '2px' : '1px';
    vLine.style.height = `${size}px`;
    vLine.style.left = `${vx}px`;
    vLine.style.top = '0px';
    board.appendChild(vLine);

    const hLine = document.createElement('div');
    hLine.className = `grid-line ${i === 0 ? 'axis' : ''}`;
    hLine.style.height = i === 0 ? '2px' : '1px';
    hLine.style.width = `${size}px`;
    hLine.style.left = '0px';
    hLine.style.top = `${hy}px`;
    board.appendChild(hLine);

    if (i !== 0) {
      const xLabel = document.createElement('div');
      xLabel.className = 'axis-label';
      xLabel.textContent = i;
      xLabel.style.left = `${vx - 8}px`;
      xLabel.style.top = `${coordToPixel(0, 0).y + 8}px`;
      board.appendChild(xLabel);

      const yLabel = document.createElement('div');
      yLabel.className = 'axis-label';
      yLabel.textContent = i;
      yLabel.style.left = `${coordToPixel(0, 0).x + 8}px`;
      yLabel.style.top = `${hy - 8}px`;
      board.appendChild(yLabel);
    }
  }

  const origin = document.createElement('div');
  origin.className = 'origin-label';
  origin.textContent = '(0,0)';
  origin.style.left = `${coordToPixel(0, 0).x + 8}px`;
  origin.style.top = `${coordToPixel(0, 0).y + 8}px`;
  board.appendChild(origin);
}

function getRandomStartCoords() {
  const pool = [];
  for (let y = -9; y <= -3; y += 2) {
    for (let x = -9; x <= 9; x += 3) {
      pool.push({ x, y });
    }
  }
  shuffle(pool);
  return pool.slice(0, items.length);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function updateLegendStatus(id, text, cls) {
  const el = document.querySelector(`[data-status="${id}"]`);
  if (!el) return;
  el.textContent = text;
  el.className = `item-status ${cls}`;
}

function buildLegend() {
  legend.innerHTML = '';

  items.forEach((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'legend-item';

    const top = document.createElement('div');
    top.className = 'legend-top';

    const thumb = document.createElement('div');
    thumb.className = 'legend-thumb';
    thumb.dataset.thumb = item.id;
    thumb.textContent = 'PNG';

    const meta = document.createElement('div');
    meta.innerHTML = `
      <div class="legend-name">${item.label}</div>
      <div class="legend-coord">Point: (${item.target[0]}, ${item.target[1]})</div>
    `;

    const status = document.createElement('div');
    status.className = 'item-status neutral';
    status.dataset.status = item.id;
    status.textContent = 'Not checked yet.';

    top.appendChild(thumb);
    top.appendChild(meta);
    wrapper.appendChild(top);
    wrapper.appendChild(status);
    legend.appendChild(wrapper);
  });
}

function makePlaceholderSvg(label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect x="4" y="4" width="92" height="92" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="5 4"/>
      <text x="50" y="46" text-anchor="middle" font-family="Arial" font-size="12" fill="#64748b">${label}</text>
      <text x="50" y="63" text-anchor="middle" font-family="Arial" font-size="12" fill="#64748b">PNG</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function placeToken(id, x, y) {
  const token = state[id]?.el;
  if (!token) return;
  const pos = coordToTokenPosition(x, y);
  token.style.left = `${pos.left}px`;
  token.style.top = `${pos.top}px`;
  state[id].coord = { x, y };
}

function enableDrag(token, id) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function start(clientX, clientY) {
    const rect = token.getBoundingClientRect();
    dragging = true;
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
  }

  function move(clientX, clientY) {
    if (!dragging) return;
    const rect = board.getBoundingClientRect();
    let left = clientX - rect.left - offsetX;
    let top = clientY - rect.top - offsetY;

    left = Math.max(0, Math.min(board.clientWidth - tokenSize, left));
    top = Math.max(0, Math.min(board.clientHeight - tokenSize, top));

    token.style.left = `${left}px`;
    token.style.top = `${top}px`;
  }

  function end() {
    if (!dragging) return;
    dragging = false;
    const left = parseFloat(token.style.left || '0');
    const top = parseFloat(token.style.top || '0');
    const snapped = pixelToCoord(left, top);
    placeToken(id, snapped.x, snapped.y);
  }

  token.addEventListener('mousedown', (e) => {
    e.preventDefault();
    start(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
  window.addEventListener('mouseup', end);

  token.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchend', end);
}

function createToken(item) {
  const img = document.createElement('img');
  img.className = 'token';
  img.alt = item.label;
  img.dataset.id = item.id;

  const path = `assets/${item.file}`;
  img.src = path;

  img.onerror = () => {
    img.src = makePlaceholderSvg(item.label);
    img.classList.add('placeholder');
  };

  img.onload = () => {
    const thumb = document.querySelector(`[data-thumb="${item.id}"]`);
    if (thumb && thumb.children.length === 0) {
      thumb.innerHTML = '';
      const mini = document.createElement('img');
      mini.src = img.src;
      mini.alt = item.label;
      thumb.appendChild(mini);
    }
  };

  board.appendChild(img);
  state[item.id] = { el: img, coord: { x: 0, y: 0 } };
  enableDrag(img, item.id);
}

function applyRandomStartPositions() {
  const starts = getRandomStartCoords();
  items.forEach((item, index) => {
    placeToken(item.id, starts[index].x, starts[index].y);
    updateLegendStatus(item.id, 'Not checked yet.', 'neutral');
  });
}

function resetBoard() {
  applyRandomStartPositions();
  globalStatus.textContent = 'New random positions ready.';
  globalStatus.className = 'global-status neutral';
}

function checkAnswers() {
  let allCorrect = true;

  items.forEach((item) => {
    const current = state[item.id].coord;
    const ok = current.x === item.target[0] && current.y === item.target[1];

    if (ok) {
      updateLegendStatus(item.id, `Correct at (${current.x}, ${current.y})`, 'correct');
    } else {
      updateLegendStatus(item.id, `Wrong at (${current.x}, ${current.y})`, 'wrong');
      allCorrect = false;
    }
  });

  if (allCorrect) {
    globalStatus.textContent = 'Correct. Everything is in the right place.';
    globalStatus.className = 'global-status correct';
    showSuccessScreen();
  } else {
    globalStatus.textContent = 'Some objects are in the wrong place.';
    globalStatus.className = 'global-status wrong';
  }
}

function showSuccessScreen() {
  gamePage.classList.add('hidden');
  teacherScreen.classList.add('hidden');
  successScreen.classList.remove('hidden');
}

function openGroupModal() {
  groupModal.classList.remove('hidden');
  groupModal.setAttribute('aria-hidden', 'false');
  groupInput.value = '';
  setTimeout(() => groupInput.focus(), 50);
}

function closeGroupModal() {
  groupModal.classList.add('hidden');
  groupModal.setAttribute('aria-hidden', 'true');
}

function confirmGroupName() {
  const value = groupInput.value.trim();
  if (!value) {
    groupInput.focus();
    return;
  }
  groupNameDisplay.textContent = value;
  successScreen.classList.add('hidden');
  teacherScreen.classList.remove('hidden');
  treasureStatus.textContent = 'Waiting for the code.';
  treasureStatus.className = 'global-status neutral';
  codeInput.value = '';
  closeGroupModal();
  setTimeout(() => codeInput.focus(), 50);
}

function openTreasure() {
  const typed = codeInput.value.trim().toUpperCase();
  if (typed === teacherCode) {
    treasureStatus.textContent = 'You found the treasure.';
    treasureStatus.className = 'global-status correct';
    startConfetti();
  } else {
    treasureStatus.textContent = 'Wrong code. Try again.';
    treasureStatus.className = 'global-status wrong';
  }
}

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function startConfetti() {
  resizeConfettiCanvas();
  confettiCanvas.classList.remove('hidden');
  confettiPieces.length = 0;

  for (let i = 0; i < 180; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      vy: 2 + Math.random() * 4,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      color: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed'][Math.floor(Math.random() * 5)]
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();

  setTimeout(() => {
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
    confettiCanvas.classList.add('hidden');
  }, 7000);
}

function animateConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiPieces.forEach((piece) => {
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.rot += piece.vr;

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rot);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
    ctx.restore();

    if (piece.y > confettiCanvas.height + 20) {
      piece.y = -20;
      piece.x = Math.random() * confettiCanvas.width;
    }
  });

  confettiAnimationId = requestAnimationFrame(animateConfetti);
}

function init() {
  buildLegend();
  drawGrid();
  items.forEach(createToken);
  applyRandomStartPositions();

  checkBtn.addEventListener('click', checkAnswers);
  resetBtn.addEventListener('click', resetBoard);
  teacherOnlyBtn.addEventListener('click', openGroupModal);
  groupConfirmBtn.addEventListener('click', confirmGroupName);
  groupCancelBtn.addEventListener('click', closeGroupModal);
  openBtn.addEventListener('click', openTreasure);

  groupInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmGroupName();
  });

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
  });

  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openTreasure();
  });

  window.addEventListener('resize', () => {
    drawGrid();
    items.forEach((item) => {
      board.appendChild(state[item.id].el);
      placeToken(item.id, state[item.id].coord.x, state[item.id].coord.y);
    });
    resizeConfettiCanvas();
  });
}

init();
