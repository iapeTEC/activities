const lessons={
 windows:{name:'PowerShell',prompt:'PS C:\\Alunos\\codex-aula>',steps:[
  ['Verifique o Node.js','O Codex pode ser instalado pelo npm, que vem com o Node.js.','node --version'],
  ['Instale o Codex CLI','Use o gerenciador de pacotes npm. Em casa, pode pedir permissão de administrador.','npm install -g @openai/codex'],
  ['Confirme a instalação','Confira se o comando ficou disponível.','codex --version'],
  ['Abra o Codex','Na primeira vez, escolha entrar com sua conta ChatGPT.','codex']]},
 mac:{name:'Terminal — zsh',prompt:'aluno@mac codex-aula %',steps:[
  ['Abra o Terminal','Use a busca do macOS: ⌘ + Espaço, digite Terminal e pressione Enter.','pwd'],
  ['Instale o Codex CLI','Execute o instalador oficial para macOS e Linux.','curl -fsSL https://chatgpt.com/codex/install.sh | sh'],
  ['Confirme a instalação','Confira se o Codex está disponível.','codex --version'],
  ['Abra o Codex','Na primeira vez, escolha entrar com sua conta ChatGPT.','codex']]},
 linux:{name:'Terminal — bash',prompt:'aluno@linux:~/codex-aula$',steps:[
  ['Abra o Terminal','Use Ctrl + Alt + T na maioria das distribuições Linux.','pwd'],
  ['Instale o Codex CLI','Execute o instalador oficial para macOS e Linux.','curl -fsSL https://chatgpt.com/codex/install.sh | sh'],
  ['Confirme a instalação','Confira se o Codex está disponível.','codex --version'],
  ['Abra o Codex','Na primeira vez, escolha entrar com sua conta ChatGPT.','codex']]}
};
let os='windows',done=new Set(),history=[],historyIndex=0;
const stepsEl=document.querySelector('#steps'), output=document.querySelector('#output'), input=document.querySelector('#command'), terminal=document.querySelector('#terminal');
function renderSteps(){stepsEl.innerHTML=lessons[os].steps.map((s,i)=>`<div class="step ${done.has(i)?'done':''}"><div class="step-num">${i+1}</div><div><h3>${s[0]}</h3><p>${s[1]}</p><button class="command-chip" data-command="${s[2].replaceAll('"','&quot;')}"><code>${s[2]}</code><span>↗</span></button></div></div>`).join('');document.querySelector('#completed-count').textContent=done.size;document.querySelectorAll('.command-chip').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.command;input.focus()}))}
function esc(t){return t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function response(cmd){const c=cmd.trim(),low=c.toLowerCase();let msg='';let step=lessons[os].steps.findIndex(s=>s[2].toLowerCase()===low);
 if(step>=0)done.add(step);
 if(!c)return;
 if(low==='ajuda'||low==='help')msg=`Comandos para experimentar:\n• ${lessons[os].steps.map(s=>s[2]).join('\n• ')}\n• limpar — limpa a tela\n• ajuda — mostra esta lista`;
 else if(low==='limpar'||low==='clear'||low==='cls'){output.innerHTML='';return}
 else if(low==='node --version')msg='v22.14.0\n✓ Node.js encontrado. Você já pode usar o npm.';
 else if(low.includes('npm install')&&low.includes('@openai/codex'))msg='npm info buscando @openai/codex...\nnpm info instalando dependências...\nadded 1 package in 3s\n\n✓ Codex CLI instalado com sucesso (simulação).';
 else if(low.startsWith('curl ')&&low.includes('codex/install.sh'))msg='Baixando instalador oficial... 100%\nVerificando sistema... ok\nInstalando Codex CLI... concluído\n\n✓ Codex CLI instalado com sucesso (simulação).';
 else if(low==='codex --version')msg='codex-cli 0.0.0-aula\n✓ Esta é uma versão fictícia usada somente no treinamento.';
 else if(low==='pwd')msg=os==='mac'?'/Users/aluno/codex-aula':'/home/aluno/codex-aula';
 else if(low==='codex')msg=`<div class="codex-box"><b>&gt;_ OpenAI Codex</b><br><br>modelo: modo de treinamento<br>pasta: codex-aula<br><br>› Descreva uma tarefa ou digite /status<br><br><span class="output-muted">100% de contexto restante · ? para atalhos</span></div>`;
 else if(low.startsWith('/'))msg='Comando do Codex reconhecido. Em uma instalação real, ele seria executado dentro do Codex.';
 else msg='Comando recebido. Neste laboratório, somente os comandos do guia possuem uma resposta simulada.';
 output.insertAdjacentHTML('beforeend',`<div class="command-row"><span class="prompt">${esc(lessons[os].prompt)}</span>${esc(c)}</div><div class="output-block">${msg}<br><span class="test-warning">⚠ Ambiente de teste: nada foi executado ou instalado de verdade.</span></div>`);renderSteps();terminal.scrollTop=terminal.scrollHeight}
document.querySelector('#command-form').addEventListener('submit',e=>{e.preventDefault();const c=input.value;if(c.trim()){history.push(c);historyIndex=history.length}response(c);input.value=''})
input.addEventListener('keydown',e=>{if(e.key==='ArrowUp'){e.preventDefault();historyIndex=Math.max(0,historyIndex-1);input.value=history[historyIndex]||''}if(e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);input.value=history[historyIndex]||''}})
document.querySelectorAll('.os-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelector('.os-tab.active').classList.remove('active');tab.classList.add('active');os=tab.dataset.os;done=new Set();document.querySelector('#terminal-name').textContent=lessons[os].name;document.querySelector('#prompt-label').textContent=lessons[os].prompt;output.innerHTML='';renderSteps();input.focus()}));
document.querySelector('#reset').addEventListener('click',()=>{done=new Set();history=[];output.innerHTML='';renderSteps();input.focus()});renderSteps();
