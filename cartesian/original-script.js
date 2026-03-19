const items = [
  { id: 'ruler', file: 'ruler.png', target: [3, 1] },
  { id: 'pencilcase', file: 'pencilcase.png', target: [2, 10] },
  { id: 'erase', file: 'erase.png', target: [8, 7] },
  { id: 'sharpener', file: 'sharpener.png', target: [4, 7] },
  { id: 'stapler', file: 'stapler.png', target: [3, 3] },
  { id: 'notebook', file: 'notebook.png', target: [5, 5] },
  { id: 'scissors', file: 'scissors.png', target: [8, 2] },
  { id: 'pen', file: 'pen.png', target: [7, 9] }
];

const board = document.getElementById('board');
const legend = document.getElementById('legend');
const globalStatus = document.getElementById('globalStatus');
const checkBtn = document.getElementById('checkBtn');
const resetBtn = document.getElementById('resetBtn');

const axisMin = -10;
const axisMax = 10;
const span = axisMax - axisMin;
const tokenSize = 58;
const state = {};

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

function startCoord(index) {
  const positions = [
    [-9, -9], [-6, -9], [-3, -9], [0, -9],
    [3, -9], [6, -9], [9, -9], [-9, -6]
  ];
  return { x: positions[index][0], y: positions[index][1] };
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
      <div class="legend-name">${item.file}</div>
      <div class="legend-coord">Coordenada: (${item.target[0]}, ${item.target[1]})</div>
    `;

    const status = document.createElement('div');
    status.className = 'item-status neutral';
    status.dataset.status = item.id;
    status.textContent = 'Ainda não verificado.';

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

function createToken(item, index) {
  const img = document.createElement('img');
  img.className = 'token';
  img.alt = item.file;
  img.dataset.id = item.id;

  const path = `assets/${item.file}`;
  img.src = path;

  img.onerror = () => {
    img.src = makePlaceholderSvg(item.file.replace('.png', ''));
    img.classList.add('placeholder');
  };

  img.onload = () => {
    const thumb = document.querySelector(`[data-thumb="${item.id}"]`);
    if (thumb && thumb.children.length === 0) {
      thumb.innerHTML = '';
      const mini = document.createElement('img');
      mini.src = img.src;
      mini.alt = item.file;
      thumb.appendChild(mini);
    }
  };

  board.appendChild(img);
  state[item.id] = { el: img, coord: { x: 0, y: 0 } };
  enableDrag(img, item.id);
  const start = startCoord(index);
  placeToken(item.id, start.x, start.y);
}

function resetBoard() {
  items.forEach((item, index) => {
    const start = startCoord(index);
    placeToken(item.id, start.x, start.y);
    updateLegendStatus(item.id, 'Ainda não verificado.', 'neutral');
  });
  globalStatus.textContent = 'Posições resetadas.';
  globalStatus.className = 'global-status neutral';
}

function checkAnswers() {
  let allCorrect = true;

  items.forEach((item) => {
    const current = state[item.id].coord;
    const ok = current.x === item.target[0] && current.y === item.target[1];

    if (ok) {
      updateLegendStatus(item.id, `Certo em (${current.x}, ${current.y})`, 'correct');
    } else {
      updateLegendStatus(item.id, `Errado em (${current.x}, ${current.y})`, 'wrong');
      allCorrect = false;
    }
  });

  if (allCorrect) {
    globalStatus.textContent = 'Tudo certo. O aluno posicionou todas as imagens corretamente.';
    globalStatus.className = 'global-status correct';
  } else {
    globalStatus.textContent = 'Há itens em posições erradas.';
    globalStatus.className = 'global-status wrong';
  }
}

function init() {
  buildLegend();
  drawGrid();
  items.forEach(createToken);

  checkBtn.addEventListener('click', checkAnswers);
  resetBtn.addEventListener('click', resetBoard);

  window.addEventListener('resize', () => {
    drawGrid();
    items.forEach((item) => {
      board.appendChild(state[item.id].el);
      placeToken(item.id, state[item.id].coord.x, state[item.id].coord.y);
    });
  });
}

init();
