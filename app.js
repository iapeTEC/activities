// 1) Cole aqui a URL /exec do seu Apps Script Web App
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyDgkZcSj4Ix706AIJlMhclLd7b-z-gdAf31vm9a5IrDfi_X2IpP5fbSLmFN2PdVOkaGA/exec";

// 2) (Opcional) Um segredo simples (igual no Apps Script). Deixe "" se não usar.
const SHARED_KEY = "MzAk9do3@.@";

const editor = document.getElementById("editor");
const toolbar = document.getElementById("toolbar");
const sendBtn = document.getElementById("sendBtn");

function showToolbar() { toolbar.hidden = false; }
function hideToolbarIfNeeded(e) {
  const within = e && (toolbar.contains(e.target) || editor.contains(e.target));
  if (!within) toolbar.hidden = true;
}

document.addEventListener("mousedown", (e) => hideToolbarIfNeeded(e));
editor.addEventListener("focus", showToolbar);
editor.addEventListener("click", showToolbar);

toolbar.addEventListener("mousedown", (e) => {
  e.preventDefault(); // mantém o cursor no editor
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.id === "linkBtn") {
    const url = prompt("Cole o link (https://...)");
    if (url) document.execCommand("createLink", false, url.trim());
    return;
  }

  const cmd = btn.getAttribute("data-cmd");
  if (cmd) document.execCommand(cmd, false, null);
});

function getPayload() {
  const html = editor.innerHTML.trim();
  const text = editor.innerText.trim();
  return { html, text };
}

async function sendToTeacher() {
  const { html, text } = getPayload();
  if (!text) return;

  const body = new URLSearchParams();
  body.set("html", html);
  body.set("text", text);
  if (SHARED_KEY) body.set("key", SHARED_KEY);

  // "no-cors" evita depender de CORS (mas não dá pra ler a resposta).
  await fetch(GAS_WEBAPP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body
  });

  editor.innerHTML = "";
  toolbar.hidden = true;
}

sendBtn.addEventListener("click", () => {
  try { sendToTeacher(); } catch (_) {}
});
