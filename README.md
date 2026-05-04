[evaluations.js](https://github.com/user-attachments/files/27327037/evaluations.js)[vercel.json](https://github.com/user-attachments/files/27327035/vercel.json)[index.html](https://github.com/user-attachments/files/27327029/index.html)
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>CloserAI — Plataforma de Avaliação de Reuniões</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f0;min-height:100vh;display:flex;flex-direction:column}
.topbar{background:#fff;border-bottom:1px solid #e5e4e0;padding:0 1.5rem;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;color:#1a1a1a;display:flex;align-items:center;gap:8px}
.logo-dot{width:8px;height:8px;border-radius:50%;background:#534AB7}
.layout{display:flex;height:calc(100vh - 52px)}
.sidebar{width:210px;background:#fff;border-right:1px solid #e5e4e0;padding:1rem 0;flex-shrink:0;overflow-y:auto}
.nav-section{padding:0 0.75rem 0.5rem;font-size:10px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-top:1rem}
.nav-item{padding:8px 1rem;font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:10px;border-left:2px solid transparent;transition:all 0.12s}
.nav-item:hover{background:#f5f4f0;color:#1a1a1a}
.nav-item.active{background:#f0effe;color:#3C3489;border-left:2px solid #534AB7;font-weight:500}
.main{flex:1;overflow-y:auto;padding:2rem}
.page{display:none}.page.active{display:block}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem}
.page-title{font-size:20px;font-weight:600;color:#1a1a1a}
.page-subtitle{font-size:13px;color:#888;margin-top:2px}
.btn{padding:8px 16px;font-size:13px;border-radius:8px;cursor:pointer;border:1px solid #ddd;background:#fff;color:#1a1a1a;font-family:inherit;transition:all 0.12s;display:inline-flex;align-items:center;gap:6px}
.btn:hover{background:#f5f4f0}.btn:disabled{opacity:0.5;cursor:not-allowed}
.btn-primary{background:#534AB7;color:#fff;border-color:#3C3489}.btn-primary:hover{background:#3C3489}
.btn-sm{padding:5px 12px;font-size:12px;border-radius:6px}
.btn-danger{color:#A32D2D;border-color:#F7C1C1;background:#FCEBEB}.btn-danger:hover{background:#F7C1C1}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:1.5rem}
.metric-card{background:#fff;border-radius:10px;padding:1.25rem;border:1px solid #e5e4e0}
.metric-label{font-size:12px;color:#888;margin-bottom:6px;font-weight:500}
.metric-val{font-size:26px;font-weight:600;color:#1a1a1a}
.metric-sub{font-size:11px;color:#aaa;margin-top:2px}
.card{background:#fff;border-radius:12px;border:1px solid #e5e4e0;overflow:hidden;margin-bottom:1rem}
.card-header{padding:1rem 1.25rem;border-bottom:1px solid #f0efeb;display:flex;align-items:center;justify-content:space-between}
.card-title{font-size:11px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.05em}
.table{width:100%;border-collapse:collapse;font-size:13px}
.table th{text-align:left;font-weight:600;font-size:11px;color:#aaa;padding:10px 16px;border-bottom:1px solid #f0efeb;text-transform:uppercase;letter-spacing:0.05em;background:#fafaf8}
.table td{padding:12px 16px;border-bottom:1px solid #f7f6f2;color:#1a1a1a;vertical-align:middle}
.table tr:last-child td{border-bottom:none}.table tr:hover td{background:#fafaf8}
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500}
.badge-purple{background:#EEEDFE;color:#3C3489}.badge-green{background:#EAF3DE;color:#27500A}
.badge-amber{background:#FAEEDA;color:#633806}.badge-red{background:#FCEBEB;color:#791F1F}
.badge-gray{background:#f0efeb;color:#666;border:1px solid #e5e4e0}.badge-blue{background:#E6F1FB;color:#0C447C}
.avatar{width:32px;height:32px;border-radius:50%;background:#EEEDFE;color:#3C3489;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0}
.closer-row{display:flex;align-items:center;gap:10px}
.overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(2px)}
.modal{background:#fff;border-radius:14px;border:1px solid #e5e4e0;padding:1.5rem;width:440px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15)}
.modal-title{font-size:16px;font-weight:600;margin-bottom:1.25rem;color:#1a1a1a}
.modal-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f0efeb}
.form-group{margin-bottom:1rem}
.form-label{font-size:12px;color:#666;margin-bottom:5px;display:block;font-weight:500}
.form-hint{font-size:11px;color:#aaa;margin-top:3px}
input[type=text],input[type=datetime-local],textarea,select{width:100%;font-family:inherit;font-size:13px;padding:9px 12px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#1a1a1a;outline:none;transition:border 0.12s}
input:focus,textarea:focus,select:focus{border-color:#534AB7;box-shadow:0 0 0 3px rgba(83,74,183,0.1)}
textarea{resize:vertical;min-height:90px;line-height:1.6}
.form-row{display:flex;gap:10px}.form-row .form-group{flex:1}
.input-group{display:flex;gap:6px}.input-group input{flex:1}
.meet-link{font-size:11px;color:#534AB7;font-family:monospace;background:#EEEDFE;padding:4px 8px;border-radius:6px;display:inline-block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.info-box{border-radius:8px;padding:12px;font-size:12px;line-height:1.6;display:flex;gap:8px;align-items:flex-start;margin-bottom:1rem}
.info-box-purple{background:#f0effe;border:1px solid #AFA9EC;color:#3C3489}
.info-box-green{background:#EAF3DE;border:1px solid #C0DD97;color:#27500A}
.info-box-red{background:#FCEBEB;border:1px solid #F7C1C1;color:#791F1F}
.score-bar-container{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.score-label{font-size:12px;color:#888;width:160px;flex-shrink:0}
.score-track{flex:1;height:6px;border-radius:3px;background:#f0efeb;overflow:hidden}
.score-fill{height:100%;border-radius:3px}
.score-num{font-size:12px;font-weight:500;color:#1a1a1a;width:32px;text-align:right}
.eval-card{background:#fff;border:1px solid #e5e4e0;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
.feedback-box{background:#fafaf8;border-radius:8px;padding:12px;font-size:12px;color:#555;line-height:1.7;margin-top:12px;border-left:3px solid #534AB7}
.script-card{background:#fff;border:1px solid #e5e4e0;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
.script-steps{font-size:12px;color:#666;white-space:pre-line;line-height:1.9;margin-top:10px;padding-top:10px;border-top:1px solid #f0efeb}
.status-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px}
.dot-green{background:#639922}.dot-amber{background:#BA7517}.dot-gray{background:#bbb}.dot-blue{background:#185FA5}.dot-purple{background:#534AB7}
.empty{text-align:center;padding:3rem;color:#aaa;font-size:13px}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid #ccc;border-top-color:#534AB7;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;right:24px;background:#1a1a1a;color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.3s;max-width:320px;line-height:1.5}
.toast.show{opacity:1}
</style>
</head>
<body>

<div class="topbar">
  <div class="logo"><div class="logo-dot"></div>CloserAI</div>
  <div style="display:flex;align-items:center;gap:10px">
    <span style="font-size:12px;color:#aaa" id="sync-status"></span>
    <button class="btn btn-primary btn-sm" onclick="navigate('reunioes');openNewMeeting()">+ Nova Reunião</button>
  </div>
</div>

<div class="layout">
  <div class="sidebar">
    <div style="padding:0 1rem 1rem;border-bottom:1px solid #f0efeb;margin-bottom:0.5rem">
      <div style="font-size:12px;color:#aaa">Workspace</div>
      <div style="font-size:13px;font-weight:600;color:#1a1a1a">Minha Empresa</div>
    </div>
    <div class="nav-section">Principal</div>
    <div class="nav-item active" onclick="navigate('dashboard')">▦ Dashboard</div>
    <div class="nav-item" onclick="navigate('closers')">◉ Closers</div>
    <div class="nav-section">Configuração</div>
    <div class="nav-item" onclick="navigate('scripts')">☰ Scripts</div>
    <div class="nav-section">Reuniões</div>
    <div class="nav-item" onclick="navigate('reunioes')">◈ Reuniões</div>
    <div class="nav-item" onclick="navigate('avaliacoes')">★ Avaliações da IA</div>
  </div>

  <div class="main">
    <!-- DASHBOARD -->
    <div class="page active" id="page-dashboard">
      <div class="page-header">
        <div><div class="page-title">Dashboard</div><div class="page-subtitle">Visão geral da sua equipe de closers</div></div>
      </div>
      <div class="cards-grid">
        <div class="metric-card"><div class="metric-label">Closers ativos</div><div class="metric-val" id="dash-closers">—</div></div>
        <div class="metric-card"><div class="metric-label">Reuniões</div><div class="metric-val" id="dash-meetings">—</div></div>
        <div class="metric-card"><div class="metric-label">Avaliadas pela IA</div><div class="metric-val" id="dash-evals">—</div></div>
        <div class="metric-card"><div class="metric-label">Score médio</div><div class="metric-val" id="dash-score">—</div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Últimas avaliações</span><button class="btn btn-sm" onclick="navigate('avaliacoes')">Ver todas →</button></div>
        <table class="table">
          <thead><tr><th>Closer</th><th>Script</th><th>Score IA</th><th>Data</th><th>Resultado</th></tr></thead>
          <tbody id="dash-evals-table"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- CLOSERS -->
    <div class="page" id="page-closers">
      <div class="page-header">
        <div><div class="page-title">Closers</div><div class="page-subtitle">Gerencie sua equipe de vendas</div></div>
        <button class="btn btn-primary" onclick="openCloserModal()">+ Novo closer</button>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>Closer</th><th>Script padrão</th><th>Reuniões</th><th>Score médio</th><th>Ações</th></tr></thead>
          <tbody id="closers-table"><tr><td colspan="5" class="empty">Nenhum closer cadastrado</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- SCRIPTS -->
    <div class="page" id="page-scripts">
      <div class="page-header">
        <div><div class="page-title">Scripts de Reunião</div><div class="page-subtitle">Defina as etapas e critérios de avaliação da IA</div></div>
        <button class="btn btn-primary" onclick="openScriptModal()">+ Novo script</button>
      </div>
      <div id="scripts-list"><div class="empty">Nenhum script criado</div></div>
    </div>

    <!-- REUNIÕES -->
    <div class="page" id="page-reunioes">
      <div class="page-header">
        <div><div class="page-title">Reuniões</div><div class="page-subtitle">O bot CloserAI entra automaticamente no Google Meet</div></div>
        <button class="btn btn-primary" onclick="openNewMeeting()">+ Agendar reunião</button>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>Closer</th><th>Script</th><th>Google Meet</th><th>Bot IA</th><th>Data</th></tr></thead>
          <tbody id="reunioes-table"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- AVALIAÇÕES -->
    <div class="page" id="page-avaliacoes">
      <div class="page-header">
        <div><div class="page-title">Avaliações da IA</div><div class="page-subtitle">Análise detalhada de cada reunião pelo Claude</div></div>
      </div>
      <div id="avaliacoes-list"><div class="empty">Carregando...</div></div>
    </div>
  </div>
</div>

<!-- MODAL CLOSER -->
<div class="overlay" id="modal-closer" style="display:none" onclick="if(event.target===this)closeModal('modal-closer')">
  <div class="modal">
    <div class="modal-title">Adicionar closer</div>
    <div class="form-group"><label class="form-label">Nome completo</label><input type="text" id="closer-name" placeholder="Ex: Marcos Alves"/></div>
    <div class="form-group"><label class="form-label">Script padrão</label><select id="closer-script"><option value="">Selecione um script</option></select></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal('modal-closer')">Cancelar</button>
      <button class="btn btn-primary" onclick="addCloser()">Salvar closer</button>
    </div>
  </div>
</div>

<!-- MODAL SCRIPT -->
<div class="overlay" id="modal-script" style="display:none" onclick="if(event.target===this)closeModal('modal-script')">
  <div class="modal">
    <div class="modal-title">Criar script de reunião</div>
    <div class="form-group"><label class="form-label">Nome do script</label><input type="text" id="script-name" placeholder="Ex: Vendas SaaS — Discovery"/></div>
    <div class="form-group"><label class="form-label">Etapas do script</label>
      <textarea id="script-content" rows="6" placeholder="1. Apresentação (2 min)&#10;2. Diagnóstico do cliente (10 min)&#10;3. Apresentação da solução (15 min)&#10;4. Quebra de objeções (10 min)&#10;5. Proposta e fechamento (5 min)"></textarea>
      <div class="form-hint">A IA verificará se cada etapa foi seguida pelo closer</div>
    </div>
    <div class="form-group"><label class="form-label">Critérios de avaliação da IA</label>
      <textarea id="script-criteria" rows="4" placeholder="- Closer fez perguntas de diagnóstico?&#10;- Apresentou proposta de valor clara?&#10;- Conduziu ativamente o fechamento?&#10;- Tratou todas as objeções levantadas?"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal('modal-script')">Cancelar</button>
      <button class="btn btn-primary" onclick="addScript()">Salvar script</button>
    </div>
  </div>
</div>

<!-- MODAL REUNIÃO -->
<div class="overlay" id="modal-meeting" style="display:none" onclick="if(event.target===this)closeModal('modal-meeting')">
  <div class="modal">
    <div class="modal-title">Agendar nova reunião</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Closer</label><select id="meet-closer"><option value="">Selecione</option></select></div>
      <div class="form-group"><label class="form-label">Script</label><select id="meet-script"><option value="">Selecione</option></select></div>
    </div>
    <div class="form-group">
      <label class="form-label">Link do Google Meet</label>
      <div class="input-group">
        <input type="text" id="meet-link" placeholder="https://meet.google.com/abc-defg-hij"/>
        <button class="btn btn-sm" onclick="generateMeetLink()">Gerar</button>
      </div>
      <div class="form-hint">Cole o link real da sua reunião — o bot entrará automaticamente</div>
    </div>
    <div class="form-group"><label class="form-label">Data e hora</label><input type="datetime-local" id="meet-datetime"/></div>
    <div class="info-box info-box-purple">
      <span style="font-size:16px;flex-shrink:0">🤖</span>
      <span><strong>IA participante automática:</strong> ao salvar, o bot CloserAI tentará entrar no Google Meet, escutará toda a conversa e gerará uma avaliação com base no script selecionado assim que a reunião terminar.</span>
    </div>
    <div id="meeting-result" style="display:none"></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal('modal-meeting')">Cancelar</button>
      <button class="btn btn-primary" id="btn-create-meeting" onclick="addMeeting()">Criar reunião + enviar bot</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ── Estado local (closers e scripts ficam em localStorage) ──────────────────
let closers = JSON.parse(localStorage.getItem('closers') || '[]');
let scripts = JSON.parse(localStorage.getItem('scripts') || '[]');

function saveLocal() {
  localStorage.setItem('closers', JSON.stringify(closers));
  localStorage.setItem('scripts', JSON.stringify(scripts));
}

// ── Toast ───────────────────────────────────────────────────────────────────
function toast(msg, type='info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = type==='error' ? '#A32D2D' : type==='success' ? '#27500A' : '#1a1a1a';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ── Navegação ────────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const labels = {dashboard:'Dashboard',closers:'Closers',scripts:'Scripts',reunioes:'Reuniões',avaliacoes:'Avaliações'};
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.includes(labels[page]?.slice(0,5))) n.classList.add('active');
  });
  if (page==='closers') renderClosers();
  if (page==='scripts') renderScripts();
  if (page==='reunioes') loadMeetings();
  if (page==='avaliacoes') loadAvaliacoes();
  if (page==='dashboard') loadDashboard();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s) { return s>=75?'#27500A':s>=60?'#633806':'#791F1F'; }
function barColor(s)   { return s>=75?'#639922':s>=60?'#BA7517':'#E24B4A'; }
function initials(name){ return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function fmtDate(iso)  {
  try { return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
  catch { return iso; }
}

// ── Closers (localStorage) ───────────────────────────────────────────────────
function renderClosers() {
  const tb = document.getElementById('closers-table');
  if (!closers.length) { tb.innerHTML='<tr><td colspan="5" class="empty">Nenhum closer cadastrado</td></tr>'; return; }
  tb.innerHTML = closers.map(c => `<tr>
    <td><div class="closer-row"><div class="avatar">${initials(c.name)}</div>${c.name}</div></td>
    <td>${c.script ? `<span class="badge badge-purple">${c.script}</span>` : '—'}</td>
    <td>—</td><td>—</td>
    <td><button class="btn btn-sm btn-danger" onclick="removeCloser('${c.id}')">Remover</button></td>
  </tr>`).join('');
}

function openCloserModal() {
  const sel = document.getElementById('closer-script');
  sel.innerHTML = '<option value="">Selecione um script</option>' + scripts.map(s=>`<option>${s.name}</option>`).join('');
  document.getElementById('closer-name').value = '';
  document.getElementById('modal-closer').style.display = 'flex';
}
function addCloser() {
  const name = document.getElementById('closer-name').value.trim();
  if (!name) return toast('Informe o nome do closer', 'error');
  const script = document.getElementById('closer-script').value;
  closers.push({ id: Date.now().toString(), name, script: script||'' });
  saveLocal();
  closeModal('modal-closer');
  renderClosers();
  toast('Closer adicionado!', 'success');
}
function removeCloser(id) {
  closers = closers.filter(c => c.id !== id);
  saveLocal();
  renderClosers();
}

// ── Scripts (localStorage) ───────────────────────────────────────────────────
function renderScripts() {
  const el = document.getElementById('scripts-list');
  if (!scripts.length) { el.innerHTML='<div class="empty">Nenhum script criado</div>'; return; }
  el.innerHTML = scripts.map(s => `<div class="script-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:15px;font-weight:600;color:#1a1a1a;margin-bottom:6px">${s.name}</div>
        <span class="badge badge-purple">${s.steps.split('\n').length} etapas</span>
        <span class="badge badge-blue" style="margin-left:4px">${(s.criteria||'').split('\n').filter(Boolean).length} critérios</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeScript('${s.id}')">Remover</button>
    </div>
    <div class="script-steps">${s.steps}</div>
  </div>`).join('');
}

function openScriptModal() {
  ['script-name','script-content','script-criteria'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modal-script').style.display = 'flex';
}
function addScript() {
  const name = document.getElementById('script-name').value.trim();
  const steps = document.getElementById('script-content').value.trim();
  if (!name || !steps) return toast('Preencha nome e etapas', 'error');
  const criteria = document.getElementById('script-criteria').value.trim();
  scripts.push({ id: Date.now().toString(), name, steps, criteria });
  saveLocal();
  closeModal('modal-script');
  renderScripts();
  toast('Script salvo!', 'success');
}
function removeScript(id) {
  scripts = scripts.filter(s => s.id !== id);
  saveLocal();
  renderScripts();
}

// ── Reuniões (API) ───────────────────────────────────────────────────────────
async function loadMeetings() {
  const tb = document.getElementById('reunioes-table');
  tb.innerHTML = '<tr><td colspan="5" class="empty"><span class="spinner"></span> Carregando...</td></tr>';
  try {
    const res = await fetch('/api/meetings');
    const { meetings } = await res.json();
    if (!meetings || !meetings.length) {
      tb.innerHTML = '<tr><td colspan="5" class="empty">Nenhuma reunião ainda</td></tr>';
      return;
    }
    tb.innerHTML = meetings.map(m => {
      const s = m.status;
      const badge = s==='evaluated'?'badge-green':s==='bot_joined'?'badge-amber':s==='scheduled'?'badge-blue':'badge-gray';
      const dot   = s==='evaluated'?'dot-green':s==='bot_joined'?'dot-purple':s==='scheduled'?'dot-blue':'dot-gray';
      const label = s==='evaluated'?'Avaliado':s==='bot_joined'?'Bot na call':s==='scheduled'?'Agendado':'—';
      return `<tr>
        <td><div class="closer-row"><div class="avatar">${initials(m.closer||'?')}</div>${m.closer||'—'}</div></td>
        <td>${m.scriptName||'—'}</td>
        <td><span class="meet-link">${(m.meetLink||'').replace('https://','')}</span></td>
        <td><span class="badge ${badge}"><span class="status-dot ${dot}"></span>${label}</span></td>
        <td style="color:#888;font-size:12px">${fmtDate(m.scheduledAt)}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    tb.innerHTML = '<tr><td colspan="5" class="empty">Erro ao carregar reuniões</td></tr>';
  }
}

function openNewMeeting() {
  const cs = document.getElementById('meet-closer');
  const ss = document.getElementById('meet-script');
  cs.innerHTML = '<option value="">Selecione um closer</option>' + closers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  ss.innerHTML = '<option value="">Selecione um script</option>' + scripts.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('meet-link').value = '';
  document.getElementById('meet-datetime').value = '';
  document.getElementById('meeting-result').style.display = 'none';
  document.getElementById('btn-create-meeting').disabled = false;
  document.getElementById('btn-create-meeting').textContent = 'Criar reunião + enviar bot';
  document.getElementById('modal-meeting').style.display = 'flex';
}

function generateMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const seg = n => Array.from({length:n}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  document.getElementById('meet-link').value = `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
}

async function addMeeting() {
  const closerId = document.getElementById('meet-closer').value;
  const scriptId = document.getElementById('meet-script').value;
  const meetLink = document.getElementById('meet-link').value.trim();
  const dt = document.getElementById('meet-datetime').value;
  if (!closerId || !scriptId || !meetLink) return toast('Preencha closer, script e link', 'error');

  const closer = closers.find(c => c.id === closerId);
  const script = scripts.find(s => s.id === scriptId);
  if (!closer || !script) return toast('Closer ou script inválido', 'error');

  const btn = document.getElementById('btn-create-meeting');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Enviando bot...';

  try {
    const res = await fetch('/api/join-meeting', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        closer: closer.name,
        closerId: closer.id,
        scriptId: script.id,
        scriptName: script.name,
        scriptSteps: script.steps,
        scriptCriteria: script.criteria,
        meetLink,
        scheduledAt: dt ? new Date(dt).toISOString() : new Date().toISOString()
      })
    });
    const data = await res.json();
    const resultEl = document.getElementById('meeting-result');

    if (data.success && data.meeting?.recallBotId) {
      resultEl.innerHTML = `<div class="info-box info-box-green">✅ <strong>Bot entrou na reunião!</strong> ID: ${data.meeting.recallBotId.slice(0,16)}... A avaliação será gerada automaticamente ao final.</div>`;
      toast('Bot CloserAI entrou na reunião!', 'success');
    } else {
      const errMsg = data.meeting?.recallError || 'Configure RECALL_API_KEY nas variáveis de ambiente da Vercel';
      resultEl.innerHTML = `<div class="info-box info-box-red">⚠️ Reunião salva, mas o bot não entrou: ${errMsg}</div>`;
    }
    resultEl.style.display = 'block';
    btn.textContent = 'Fechar';
    btn.disabled = false;
    btn.onclick = () => { closeModal('modal-meeting'); loadMeetings(); };
  } catch(e) {
    toast('Erro ao criar reunião', 'error');
    btn.disabled = false;
    btn.textContent = 'Criar reunião + enviar bot';
  }
}

// ── Avaliações (API) ─────────────────────────────────────────────────────────
async function loadAvaliacoes() {
  const el = document.getElementById('avaliacoes-list');
  el.innerHTML = '<div class="empty"><span class="spinner"></span> Carregando avaliações...</div>';
  try {
    const res = await fetch('/api/evaluations');
    const { evaluations } = await res.json();
    if (!evaluations || !evaluations.length) {
      el.innerHTML = '<div class="empty">Nenhuma avaliação gerada ainda.<br>As avaliações aparecem automaticamente após as reuniões.</div>';
      return;
    }
    el.innerHTML = evaluations.map(a => {
      const ev = a.evaluation || {};
      const score = ev.score || 0;
      const criteriaScores = ev.criteria_scores || {};
      const highlights = ev.highlights || [];
      const improvements = ev.improvements || [];
      return `<div class="eval-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="closer-row">
            <div class="avatar" style="width:40px;height:40px;font-size:13px">${initials(a.closer||'?')}</div>
            <div>
              <div style="font-size:14px;font-weight:600;color:#1a1a1a">${a.closer}</div>
              <div style="font-size:12px;color:#aaa">${a.scriptName} · ${fmtDate(a.createdAt)}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:700;color:${scoreColor(score)}">${score}%</div>
            <div style="font-size:10px;color:#aaa">score geral</div>
          </div>
        </div>
        <div style="border-top:1px solid #f0efeb;padding-top:12px">
          ${Object.entries(criteriaScores).map(([label,val])=>`
            <div class="score-bar-container">
              <div class="score-label">${label}</div>
              <div class="score-track"><div class="score-fill" style="width:${val}%;background:${barColor(val)}"></div></div>
              <div class="score-num">${val}%</div>
            </div>`).join('')}
        </div>
        ${ev.feedback ? `<div class="feedback-box"><strong>Feedback da IA:</strong> ${ev.feedback}</div>` : ''}
        ${highlights.length ? `<div style="margin-top:10px;font-size:12px;color:#27500A"><strong>Destaques positivos:</strong> ${highlights.join(' · ')}</div>` : ''}
        ${improvements.length ? `<div style="margin-top:6px;font-size:12px;color:#633806"><strong>Pontos de melhoria:</strong> ${improvements.join(' · ')}</div>` : ''}
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div class="empty">Erro ao carregar avaliações</div>';
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  document.getElementById('dash-closers').textContent = closers.length;
  try {
    const [mRes, eRes] = await Promise.all([fetch('/api/meetings'), fetch('/api/evaluations')]);
    const { meetings } = await mRes.json();
    const { evaluations } = await eRes.json();
    document.getElementById('dash-meetings').textContent = meetings?.length || 0;
    document.getElementById('dash-evals').textContent = evaluations?.length || 0;
    const scores = (evaluations || []).map(e => e.evaluation?.score).filter(Boolean);
    document.getElementById('dash-score').textContent = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) + '%' : '—';
    const tb = document.getElementById('dash-evals-table');
    if (!evaluations?.length) { tb.innerHTML='<tr><td colspan="5" class="empty">Nenhuma avaliação ainda</td></tr>'; return; }
    tb.innerHTML = evaluations.slice(0,5).map(a => {
      const score = a.evaluation?.score||0;
      const badge = score>=75?'badge-green':score>=60?'badge-amber':'badge-red';
      const label = score>=75?'Aprovado':score>=60?'Precisa melhorar':'Crítico';
      return `<tr>
        <td><div class="closer-row"><div class="avatar">${initials(a.closer||'?')}</div>${a.closer}</div></td>
        <td>${a.scriptName}</td>
        <td><span style="font-weight:600;color:${scoreColor(score)}">${score}%</span></td>
        <td style="font-size:12px;color:#aaa">${fmtDate(a.createdAt)}</td>
        <td><span class="badge ${badge}">${label}</span></td>
      </tr>`;
    }).join('');
  } catch(e) {
    document.getElementById('dash-meetings').textContent = '—';
  }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Init
loadDashboard();
setInterval(loadDashboard, 30000);
</script>
</body>
</html>

[package.json](https://github.com/user-attachments/files/27327033/package.json)
{
  "name": "closer-ai",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "@vercel/kv": "^2.0.0"
  }
}


[Uploading{
  "version": 2,
  "builds": [
    { "src": "api/*.js", "use": "@vercel/node" },
    { "src": "index.html", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1.js" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
 vercel.json…]()

[Uploading evaluatimport { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET") {
    try {
      const ids = await kv.lrange("meetings_list", 0, 49);
      const evals = [];

      for (const id of ids) {
        const evalRaw = await kv.get(`eval_${id}`);
        if (evalRaw) {
          evals.push(typeof evalRaw === "string" ? JSON.parse(evalRaw) : evalRaw);
        }
      }

      return res.status(200).json({ evaluations: evals.reverse() });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao buscar avaliações", detail: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
ions.js…]()

[join-meeting.js](https://github.com/user-attachments/files/27327038/join-meeting.js)

import { kv } from "@vercel/kv";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function firefliesRequest(query, variables = {}) {
  const res = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}`
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { closer, closerId, scriptId, scriptName, scriptSteps, scriptCriteria, meetLink, scheduledAt } = req.body;

  if (!meetLink || !scriptSteps) {
    return res.status(400).json({ error: "meetLink e script são obrigatórios" });
  }

  const meetingId = `meeting_${Date.now()}`;
  const fullLink = meetLink.startsWith("http") ? meetLink : `https://${meetLink}`;

  let firefliesMeetingId = null;
  let botError = null;

  try {
    // Tenta entrar em reunião ao vivo primeiro
    const liveMutation = `
      mutation AddToLiveMeeting($url: String!, $title: String!) {
        addToLiveMeeting(url: $url, title: $title) {
          id
          title
        }
      }
    `;
    const liveData = await firefliesRequest(liveMutation, {
      url: fullLink,
      title: `CloserAI - ${closer} - ${scriptName}`
    });

    if (liveData?.data?.addToLiveMeeting?.id) {
      firefliesMeetingId = liveData.data.addToLiveMeeting.id;
    } else {
      // Agenda o notetaker para reunião futura
      const schedMutation = `
        mutation ScheduleNotetaker($url: String!, $title: String!, $startTime: Long!) {
          scheduleNotetaker(url: $url, title: $title, start_time: $startTime) {
            id
            title
          }
        }
      `;
      const schedTime = scheduledAt ? new Date(scheduledAt).getTime() : (Date.now() + 60000);
      const schedData = await firefliesRequest(schedMutation, {
        url: fullLink,
        title: `CloserAI - ${closer} - ${scriptName}`,
        startTime: schedTime
      });
      firefliesMeetingId = schedData?.data?.scheduleNotetaker?.id || null;
      if (!firefliesMeetingId) {
        botError = liveData?.errors?.[0]?.message || schedData?.errors?.[0]?.message || "Erro ao enviar bot";
      }
    }
  } catch (e) {
    botError = `Erro de conexão: ${e.message}`;
  }

  const meeting = {
    id: meetingId,
    closer,
    closerId,
    scriptId,
    scriptName,
    scriptSteps,
    scriptCriteria,
    meetLink: fullLink,
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: firefliesMeetingId ? "bot_joined" : "scheduled",
    firefliesMeetingId,
    botError,
    createdAt: new Date().toISOString()
  };

  await kv.set(meetingId, JSON.stringify(meeting));
  await kv.lpush("meetings_list", meetingId);

  return res.status(200).json({ success: true, meeting });
}

[meetings.js](https://github.com/user-attachments/files/27327040/meetings.js)
import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET") {
    try {
      const ids = await kv.lrange("meetings_list", 0, 49);
      const meetings = await Promise.all(
        ids.map(async id => {
          const raw = await kv.get(id);
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        })
      );
      return res.status(200).json({ meetings: meetings.filter(Boolean).reverse() });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao buscar reuniões", detail: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

[webhook.js](https://github.com/user-attachments/files/27327041/webhook.js)
import { kv } from "@vercel/kv";
import Anthropic from "@anthropic-ai/sdk";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function getFirefliesTranscript(transcriptId) {
  const res = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}`
    },
    body: JSON.stringify({
      query: `
        query Transcript($transcriptId: String!) {
          transcript(id: $transcriptId) {
            id
            title
            date
            duration
            sentences {
              text
              speaker_name
              start_time
              end_time
            }
          }
        }
      `,
      variables: { transcriptId }
    })
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body;

  // Fireflies envia: { meetingId, title, ... } quando a transcrição fica pronta
  const { meetingId: firefliesMeetingId } = body;
  if (!firefliesMeetingId) return res.status(200).json({ received: true });

  // 1. Busca a reunião pelo firefliesMeetingId
  const meetingIds = await kv.lrange("meetings_list", 0, -1);
  let meeting = null;
  let meetingKey = null;

  for (const id of meetingIds) {
    const raw = await kv.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m?.firefliesMeetingId === firefliesMeetingId) {
      meeting = m;
      meetingKey = id;
      break;
    }
  }

  if (!meeting) return res.status(200).json({ received: true, note: "reunião não encontrada" });

  // 2. Busca a transcrição completa no Fireflies
  let transcript = "";
  try {
    const data = await getFirefliesTranscript(firefliesMeetingId);
    const sentences = data?.data?.transcript?.sentences || [];
    transcript = sentences
      .map(s => `${s.speaker_name || "Participante"}: ${s.text}`)
      .join("\n");
  } catch (e) {
    transcript = "[Erro ao buscar transcrição do Fireflies]";
  }

  // 3. Avalia com Claude (Anthropic) em português
  let evaluation = null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Você é um avaliador especialista em reuniões de vendas em português brasileiro.

SCRIPT DA REUNIÃO (o que o closer deveria seguir):
${meeting.scriptSteps}

CRITÉRIOS DE AVALIAÇÃO:
${meeting.scriptCriteria}

TRANSCRIÇÃO DA REUNIÃO:
${transcript}

Avalie a reunião com base nos critérios. Retorne APENAS um JSON válido (sem markdown, sem texto extra):
{
  "score": <número de 0 a 100>,
  "feedback": "<análise detalhada em português, 2-3 parágrafos>",
  "criteria_scores": {
    "<critério exatamente como listado>": <score 0-100>
  },
  "highlights": ["<ponto positivo 1>", "<ponto positivo 2>"],
  "improvements": ["<melhoria 1>", "<melhoria 2>"]
}`
      }]
    });

    const raw = msg.content[0].text.replace(/```json|```/g, "").trim();
    evaluation = JSON.parse(raw);
  } catch (e) {
    evaluation = {
      score: 0,
      feedback: "Erro ao processar avaliação com a IA.",
      criteria_scores: {},
      highlights: [],
      improvements: ["Verifique a variável ANTHROPIC_API_KEY"]
    };
  }

  // 4. Salva avaliação e atualiza reunião
  const evalId = `eval_${meetingKey}`;
  await kv.set(evalId, JSON.stringify({
    id: evalId,
    meetingId: meetingKey,
    closer: meeting.closer,
    scriptName: meeting.scriptName,
    transcript,
    evaluation,
    createdAt: new Date().toISOString()
  }));

  meeting.status = "evaluated";
  meeting.evalId = evalId;
  await kv.set(meetingKey, JSON.stringify(meeting));

  return res.status(200).json({ success: true, score: evaluation.score });
}
