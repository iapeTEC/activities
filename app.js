// 1) Cole aqui a URL /exec do seu Apps Script Web App
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxcf8a5bn0jXvLPZVmi4eSpK7ItI6lxSIfAwJzw1bk1mScKwxm8jkUA9dh_MN7OWPTuiA/exec";

// 2) (Opcional) Um segredo simples (igual no Apps Script). Deixe "" se não usar.
const SHARED_KEY = "MzAk9do3@.@";

const editor = document.getElementById("editor");
const toolbar = document.getElementById("toolbar");
const sendBtn = document.getElementById("sendBtn");

const studentName = document.getElementById("studentName");
const studentClass = document.getElementById("studentClass");

const modal = document.getElementById("modal");
const modalMsg = document.getElementById("modalMsg");
const modalOk = document.getElementById("modalOk");

// Theme toggle
const themeToggle = document.getElementById("themeToggle");
const THEME_KEY = "submission_theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  if (themeToggle) themeToggle.checked = (theme === "dark");
}

(function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    applyTheme("light"); // default claro
  }
})();

if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });
}

function openModal(msg) {
  modalMsg.textContent = msg;
  modal.hidden = false;
}
function closeModal() {
  modal.hidden = true;
}
modalOk.addEventListener("click", closeModal);
modal.addEventListener("mousedown", (e) => { if (e.target === modal) closeModal(); });

function showToolbar() { toolbar.hidden = false; }
function hideToolbarIfNeeded(e) {
  const within = e && (toolbar.contains(e.target) || editor.contains(e.target));
  if (!within) toolbar.hidden = true;
}

document.addEventListener("mousedown", (e) => hideToolbarIfNeeded(e));
editor.addEventListener("focus", showToolbar);
editor.addEventListener("click", showToolbar);

toolbar.addEventListener("mousedown", (e) => {
  e.preventDefault();
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
  const name = (studentName.value || "").trim();
  const turma = (studentClass.value || "").trim();
  return { html, text, name, turma };
}

function validate(payload) {
  if (!payload.name) return "Informe seu nome.";
  if (!payload.turma) return "Selecione sua turma.";
  if (!payload.text) return "Digite seu texto antes de enviar.";
  return "";
}

async function sendToTeacher() {
  const payload = getPayload();
  const err = validate(payload);
  if (err) { openModal(err); return; }

  sendBtn.disabled = true;

  const body = new URLSearchParams();
  body.set("name", payload.name);
  body.set("class", payload.turma);
  body.set("html", payload.html);
  body.set("text", payload.text);
  if (SHARED_KEY) body.set("key", SHARED_KEY);

  try {
    await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body
    });

    editor.innerHTML = "";
    toolbar.hidden = true;

    openModal("Enviado com sucesso. Obrigado!");
  } catch (_) {
    openModal("Não foi possível enviar agora. Tente novamente.");
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", () => {
  sendToTeacher();
});
