import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, onSnapshot,
  doc, updateDoc, addDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ─── CLOSERS ─────────────────────────────────────────────────────────
const CLOSERS = {
  fernanda: { name: 'Fernanda', color: '#CE9221', bg: 'rgba(206,146,33,.12)', calLink: 'https://calendar.app.google/hWWi6tVKAhoXg5cUA' },
  thomaz:   { name: 'Thomaz',   color: '#4db5c8', bg: 'rgba(77,181,200,.12)',  calLink: 'https://calendar.app.google/1heVe3395Tsk9GeM8' }
};

// ─── FIREBASE CONFIG ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyBdcF3cXNmfspkHJfd6MduhVl9s9lU9mDk',
  authDomain:        'faculdade-da-vida.firebaseapp.com',
  projectId:         'faculdade-da-vida',
  storageBucket:     'faculdade-da-vida.firebasestorage.app',
  messagingSenderId: '774662000211',
  appId:             '1:774662000211:web:61adc52edfdd339c0d00a6'
};

// ─── DEMO DATA ───────────────────────────────────────────────────────
const DEMO = [
  { id:'d1',  nome:'Ana Carolina Silva',    celular:'(11) 99876-5432', origem:'Instagram', profissao:'Professora',       renda:'R$ 4.500',  datachegada:'2026-04-01', status:'aguardando', etiquetas:['Bom'] },
  { id:'d2',  nome:'Roberto Mendes',        celular:'(21) 98765-4321', origem:'Indicação', profissao:'Analista de TI',   renda:'R$ 8.200',  datachegada:'2026-04-02', status:'agendado',  dataagendamento:'2026-04-10', horaagendamento:'14:30', closer:'fernanda', agendadopor:'Admin', etiquetas:['Super Lead'] },
  { id:'d3',  nome:'Mariana Fonseca',       celular:'(31) 97654-3210', origem:'Facebook',  profissao:'Enfermeira',       renda:'R$ 5.800',  datachegada:'2026-03-28', status:'realizada', resultado:'interessado', status_closer:'followup', etiquetas:['Neutro'] },
  { id:'d4',  nome:'Carlos Eduardo Lopes',  celular:'(41) 96543-2109', origem:'Google',    profissao:'Empresário',       renda:'R$ 15.000', datachegada:'2026-04-03', status:'aguardando', etiquetas:['Super Lead'] },
  { id:'d5',  nome:'Patrícia Oliveira',     celular:'(51) 95432-1098', origem:'WhatsApp',  profissao:'Nutricionista',    renda:'R$ 6.300',  datachegada:'2026-04-05', status:'aguardando' },
  { id:'d6',  nome:'Marcos Henrique Costa', celular:'(61) 94321-0987', origem:'Instagram', profissao:'Engenheiro Civil', renda:'R$ 12.000', datachegada:'2026-03-20', status:'realizada', venda_realizada:true, valor_venda:'R$ 3.000', produto:'Comunidade', formas_pagamento:['pix'], closer:'thomaz', agendadopor:'Fernanda', etiquetas:['Bom'] },
  { id:'d7',  nome:'Juliana Alves',         celular:'(71) 93210-9876', origem:'Indicação', profissao:'Médica',           renda:'R$ 22.000', datachegada:'2026-04-06', status:'agendado',  dataagendamento:'2026-04-11', horaagendamento:'10:00', closer:'thomaz', agendadopor:'Admin', etiquetas:['Super Lead'] },
  { id:'d8',  nome:'Fernando Ribeiro',      celular:'(81) 92109-8765', origem:'Outros',    profissao:'Advogado',         renda:'R$ 9.500',  datachegada:'2026-03-15', status:'aguardando' },
  { id:'d9',  nome:'Camila Torres',         celular:'(11) 91098-7654', origem:'Instagram', profissao:'Designer',         renda:'R$ 7.200',  datachegada:'2026-04-07', status:'noshow', dataagendamento:'2026-04-08', closer:'fernanda' },
  { id:'d10', nome:'Rodrigo Neves',         celular:'(21) 90987-6543', origem:'Google',    profissao:'Contador',         renda:'R$ 10.800', datachegada:'2026-03-10', status:'realizada', venda_realizada:false, status_closer:'venda_perdida', etiquetas:['Frio'] },
];

// ─── KANBAN CONFIG ───────────────────────────────────────────────────
const KANBAN_LS_KEY = 'fdv_kanban_columns';
const DEFAULT_KANBAN_COLS = [
  { id: 'agendado',       label: 'Agendado' },
  { id: 'call_realizada', label: 'Call Realizada' },
  { id: 'fechamento',     label: 'Fechamento' },
  { id: 'followup',       label: 'Follow Up' },
  { id: 'venda_ganha',    label: 'Venda Ganha' },
  { id: 'venda_perdida',  label: 'Venda Perdida' },
];

function getKanbanCols() {
  try { const s = localStorage.getItem(KANBAN_LS_KEY); if (s) return JSON.parse(s); } catch(e) {}
  return structuredClone(DEFAULT_KANBAN_COLS);
}
function saveKanbanCols(cols) { localStorage.setItem(KANBAN_LS_KEY, JSON.stringify(cols)); }

// ─── STATE ───────────────────────────────────────────────────────────
let allLeads      = [];
let filteredLeads = [];
let currentId     = null;
let modalMode     = 'agendar';
let db            = null;
let isLive        = false;
let selectedIds   = new Set();
let perfilLeadId  = null;
let novoLeadId    = null;
let auth          = null;
let currentUser   = null;
let leadsLoaded   = false;
let activeTab     = 'agendamentos';
let activeSub     = 'leads';
let dragLeadId    = null;
let cal = { step: 1, closer: null, leadSnap: null };

const ETIQUETAS_DEFAULT = ['Super Lead', 'Bom', 'Neutro', 'Frio'];

// ─── AUTH ────────────────────────────────────────────────────────────
function initAuth() {
  isLive = initFirebase();
  if (!isLive) {
    $('login-screen').style.display = 'none';
    $('app-header').style.display   = '';
    $('app-main').style.display     = '';
    loadLeads();
    return;
  }
  auth = getAuth();
  onAuthStateChanged(auth, user => {
    if (user) {
      currentUser = user;
      $('login-screen').style.display = 'none';
      $('app-header').style.display   = '';
      $('app-main').style.display     = '';
      const avatar = $('user-avatar');
      if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = ''; }
      $('user-name').textContent = user.displayName || user.email;
      if (!leadsLoaded) { leadsLoaded = true; loadLeads(); }
    } else {
      currentUser = null;
      $('login-screen').style.display = '';
      $('app-header').style.display   = 'none';
      $('app-main').style.display     = 'none';
      leadsLoaded = false;
    }
  });
}

async function loginWithGoogle() {
  const btn = $('btn-login-google'), err = $('login-error');
  btn.disabled = true; err.style.display = 'none';
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch(e) { err.textContent = 'Erro ao entrar. Tente novamente.'; err.style.display = 'block'; }
  finally { btn.disabled = false; }
}

async function logoutUser() {
  try { leadsLoaded = false; await signOut(auth); } catch(e) { console.error(e); }
}

// ─── FIREBASE ────────────────────────────────────────────────────────
function initFirebase() {
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') return false;
  try { const app = initializeApp(firebaseConfig); db = getFirestore(app); return true; }
  catch(e) { console.error(e); return false; }
}

// ─── LOAD ────────────────────────────────────────────────────────────
function loadLeads() {
  if (!isLive) {
    setTimeout(() => {
      allLeads = structuredClone(DEMO);
      $('loading-layer').style.display = 'none';
      $('demo-banner').style.display = 'block';
      renderAll();
    }, 600);
    return;
  }
  const leadsRef = collection(db, 'leads');
  let first = true;
  onSnapshot(leadsRef, snap => {
    if (first && snap.empty) { first = false; $('loading-layer').style.display = 'none'; renderAll(); return; }
    first = false;
    allLeads = snap.docs.map(d => {
      const data = d.data();
      const lead = { id: d.id, ...data };
      if (!lead.celular && lead.telefone) lead.celular = lead.telefone;
      if (!lead.etiquetas) lead.etiquetas = [];
      return lead;
    });
    $('loading-layer').style.display = 'none';
    renderAll();
  }, err => {
    $('loading-layer').style.display = 'none';
    console.error('[FDV] Firestore error:', err.code);
    showFirestoreError(err.code);
  });
}

function showFirestoreError(code) {
  const msgs = {
    'permission-denied': 'Permissão negada. Verifique as regras do Firestore.',
    'unavailable': 'Firestore indisponível. Verifique sua conexão.',
  };
  $('table-wrap').innerHTML = `<div style="padding:48px 32px;text-align:center">
    <div style="font-size:28px;margin-bottom:16px">⚠️</div>
    <h3 style="font-size:16px;font-weight:700;margin-bottom:10px">Não foi possível carregar os leads</h3>
    <p style="font-size:13px;color:var(--text-muted)">${msgs[code]||'Erro: '+code}</p>
  </div>`;
}

// ─── TAB / SUB SWITCHING ─────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  const panel = $('tab-' + tab);
  if (panel) panel.style.display = '';
  document.querySelectorAll('.nav-link[data-tab]').forEach(l =>
    l.classList.toggle('active', l.dataset.tab === tab)
  );
  populateAllMonths();
  if      (tab === 'agendamentos') renderActiveSub();
  else if (tab === 'closer')       renderKanban();
  else if (tab === 'relatorios')   renderRelatorios();
}

function switchSub(sub) {
  activeSub = sub;
  document.querySelectorAll('.sub-panel').forEach(p => p.style.display = 'none');
  const panel = $('sub-' + sub);
  if (panel) panel.style.display = '';
  document.querySelectorAll('.sub-link[data-sub]').forEach(l =>
    l.classList.toggle('active', l.dataset.sub === sub)
  );
  renderActiveSub();
}

function renderActiveSub() {
  if      (activeSub === 'leads')   { populateMonths(); applyFilters(); }
  else if (activeSub === 'agenda')  renderAgendaSub();
  else if (activeSub === 'briefing') renderBriefingSub();
}

// ─── RENDER ALL ──────────────────────────────────────────────────────
function renderAll() {
  allLeads.sort((a, b) => (b.datachegada || '').localeCompare(a.datachegada || ''));
  populateAllMonths();
  updateStats();
  if      (activeTab === 'agendamentos') renderActiveSub();
  else if (activeTab === 'closer')       renderKanban();
  else if (activeTab === 'relatorios')   renderRelatorios();
}

// ─── LEADS LIST ──────────────────────────────────────────────────────
function applyFilters() {
  const status = $('filter-status').value;
  const origem = $('filter-origem').value;
  const mes    = $('filter-mes').value;
  const busca  = $('filter-busca').value.toLowerCase().trim();

  filteredLeads = allLeads.filter(l => {
    if (status && l.status !== status) return false;
    if (origem && l.origem !== origem) return false;
    if (mes    && !(l.datachegada || '').startsWith(mes)) return false;
    if (busca) {
      const n = (l.nome    || '').toLowerCase();
      const c = (l.celular || '').toLowerCase();
      if (!n.includes(busca) && !c.includes(busca)) return false;
    }
    return true;
  });

  renderTable();
  renderCards();
  updateCount();
  updateStats();
}

// ─── AGENDA SUB ──────────────────────────────────────────────────────
function renderAgendaSub() {
  const mesFilt    = $('agenda-filter-mes').value;
  const closerFilt = $('agenda-filter-closer').value;
  const content    = $('agenda-content');

  let leads = allLeads.filter(l => l.status === 'agendado');
  if (mesFilt)    leads = leads.filter(l => (l.dataagendamento || '').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer || '') === closerFilt);

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty"><div class="empty-ico">📅</div>
      <h3>Nenhuma call encontrada</h3><p>Sem calls para os filtros selecionados.</p></div>`;
    return;
  }

  const groups = {};
  leads.forEach(l => {
    const k = l.closer || '_sem';
    if (!groups[k]) groups[k] = [];
    groups[k].push(l);
  });
  Object.values(groups).forEach(arr =>
    arr.sort((a, b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')))
  );

  const order = ['fernanda','thomaz',...Object.keys(groups).filter(k => k!=='fernanda' && k!=='thomaz')];

  content.innerHTML = order.filter(k => groups[k]?.length).map(key => {
    const c     = CLOSERS[key];
    const name  = c ? c.name : (key === '_sem' ? 'Sem closer' : key);
    const color = c ? c.color : 'var(--text-muted)';
    const bg    = c ? c.bg   : 'var(--bg-elevated)';
    return `<div class="agenda-group">
      <div class="agenda-group-header">
        <div class="agenda-avatar" style="color:${color};background:${bg};border:1.5px solid ${color}">${name[0].toUpperCase()}</div>
        <h3 class="agenda-group-name">${esc(name)}</h3>
        <span class="agenda-group-count">${groups[key].length} call${groups[key].length!==1?'s':''}</span>
      </div>
      <div class="agenda-cards">
        ${groups[key].map(l => `
          <div class="agenda-card">
            <div class="agenda-card-time">${esc(l.horaagendamento||'—')}</div>
            <div class="agenda-card-info">
              <button class="agenda-card-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
              <span class="agenda-card-sub">${[
                fmtDate(l.dataagendamento),
                l.celular, l.origem, l.renda,
                l.agendadopor ? 'via '+l.agendadopor : null
              ].filter(Boolean).map(esc).join(' · ')}</span>
              ${(l.etiquetas||[]).length ? `<div class="card-etiquetas">${(l.etiquetas||[]).map(t=>`<span class="etiqueta-chip etiqueta-chip--sm">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
            <button class="btn-ghost btn-sm btn-briefing" data-id="${l.id}">Copiar Briefing</button>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-briefing').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) gerarBriefingLead(l); })
  );
}

// ─── BRIEFING SUB ────────────────────────────────────────────────────
function renderBriefingSub() {
  const mesFilt    = $('briefing-filter-mes').value;
  const closerFilt = $('briefing-filter-closer').value;
  const content    = $('briefing-content');

  let leads = allLeads.filter(l => l.dataagendamento);
  if (mesFilt)    leads = leads.filter(l => (l.dataagendamento||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);
  leads.sort((a,b) => ((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||'')));

  if (!leads.length) {
    content.innerHTML = `<div class="agenda-empty"><div class="empty-ico">📋</div>
      <h3>Nenhum briefing disponível</h3><p>Sem leads agendados para os filtros selecionados.</p></div>`;
    return;
  }

  content.innerHTML = `<div class="briefing-list">${leads.map(l => {
    const closerName = l.closer ? (CLOSERS[l.closer]?.name||l.closer) : '—';
    const fields = [
      ['Nome', l.nome], ['Celular', l.celular], ['E-mail', l.email],
      ['Instagram', l.instagram], ['Profissão', l.profissao], ['Renda', l.renda],
      ['Origem', l.origem], ['Call', l.dataagendamento ? `${fmtDate(l.dataagendamento)} às ${l.horaagendamento||'—'}` : null],
      ['Closer', closerName], ['Agendado por', l.agendadopor],
      ['Etiquetas', (l.etiquetas||[]).join(', ')],
      ['Observações', l.observacoes],
    ].filter(([,v]) => v);

    return `<div class="briefing-card">
      <div class="briefing-card-head">
        <div>
          <button class="briefing-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <span class="briefing-meta">${fmtDateHora(l.dataagendamento,l.horaagendamento)} · ${esc(closerName)}</span>
        </div>
        <button class="btn-ghost btn-sm btn-briefing" data-id="${l.id}">📋 Copiar</button>
      </div>
      <div class="briefing-fields">
        ${fields.map(([l,v])=>`<div class="briefing-field"><span class="briefing-lbl">${esc(l)}</span><span class="briefing-val">${esc(v||'—')}</span></div>`).join('')}
      </div>
    </div>`;
  }).join('')}</div>`;

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  content.querySelectorAll('.btn-briefing').forEach(b =>
    b.addEventListener('click', () => { const l = allLeads.find(x=>x.id===b.dataset.id); if(l) gerarBriefingLead(l); })
  );
}

function gerarAgendaDoDia() {
  const mesFilt    = $('agenda-filter-mes').value;
  const closerFilt = $('agenda-filter-closer').value;
  let leads = allLeads.filter(l => l.status === 'agendado');
  if (mesFilt)    leads = leads.filter(l => (l.dataagendamento||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);
  if (!leads.length) { toast('Nenhuma call para copiar.', 'err'); return; }

  const groups = {};
  leads.forEach(l => { const k = l.closer||'_sem'; if(!groups[k]) groups[k]=[]; groups[k].push(l); });
  Object.values(groups).forEach(arr => arr.sort((a,b)=>((a.dataagendamento||'')+(a.horaagendamento||'')).localeCompare((b.dataagendamento||'')+(b.horaagendamento||''))));

  let text = `📅 AGENDA\n${'═'.repeat(36)}\n\n`;
  ['fernanda','thomaz',...Object.keys(groups).filter(k=>k!=='fernanda'&&k!=='thomaz')].filter(k=>groups[k]).forEach(key => {
    const name = CLOSERS[key]?.name || (key==='_sem'?'Sem closer':key);
    text += `👤 ${name.toUpperCase()}\n${'─'.repeat(36)}\n`;
    groups[key].forEach(l => {
      text += `${l.horaagendamento||'--:--'} ${fmtDate(l.dataagendamento)} — ${l.nome||'—'} | ${l.celular||'—'}`;
      if (l.origem) text += ` | ${l.origem}`;
      if (l.agendadopor) text += ` | via ${l.agendadopor}`;
      text += '\n';
    });
    text += '\n';
  });

  navigator.clipboard.writeText(text)
    .then(() => toast('Agenda copiada!', 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

function gerarBriefingLead(lead) {
  const closerName = lead.closer ? (CLOSERS[lead.closer]?.name||lead.closer) : null;
  const fields = [
    ['Nome', lead.nome], ['Celular', lead.celular], ['E-mail', lead.email],
    ['Instagram', lead.instagram], ['Profissão', lead.profissao], ['Renda', lead.renda],
    ['Origem', lead.origem], ['Etiquetas', (lead.etiquetas||[]).join(', ')],
    ['Desafio', lead.desafio], ['Motivação', lead.motivacao],
    ['Já participou', lead.jaParticipou], ['Já é aluna', lead.jaEAluna],
    ['Tempo que conhece', lead.tempoConhece], ['De onde conhece', lead.deOnde],
    ['Call', lead.dataagendamento ? `${fmtDate(lead.dataagendamento)} às ${lead.horaagendamento||'—'}` : null],
    ['Closer', closerName], ['Agendado por', lead.agendadopor],
    ['Observações', lead.observacoes],
  ];
  let text = `📋 BRIEFING — ${lead.nome||'—'}\n${'─'.repeat(32)}\n`;
  fields.forEach(([l,v]) => { if(v) text += `${l}: ${v}\n`; });
  navigator.clipboard.writeText(text)
    .then(() => toast(`Briefing de ${lead.nome} copiado!`, 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

// ─── KANBAN ──────────────────────────────────────────────────────────
function getLeadKanbanCol(lead) {
  if (lead.kanban_column) return lead.kanban_column;
  if (lead.status === 'agendado') return 'agendado';
  if (lead.status === 'noshow' || lead.status === 'cancelado') return 'venda_perdida';
  if (lead.status === 'realizada') {
    const sc = lead.status_closer;
    if (sc === 'followup')     return 'followup';
    if (sc === 'fechamento')   return 'fechamento';
    if (sc === 'venda_ganha'  || lead.venda_realizada === true)  return 'venda_ganha';
    if (sc === 'venda_perdida'|| lead.venda_realizada === false) return 'venda_perdida';
    return 'call_realizada';
  }
  return 'agendado';
}

function renderKanban() {
  const board      = $('kanban-board');
  const mesFilt    = $('kanban-filter-mes').value;
  const closerFilt = $('kanban-filter-closer').value;
  const cols       = getKanbanCols();

  let leads = allLeads.filter(l => l.status !== 'aguardando');
  if (mesFilt)    leads = leads.filter(l => (l.dataagendamento||l.datachegada||'').startsWith(mesFilt));
  if (closerFilt) leads = leads.filter(l => (l.closer||'') === closerFilt);

  board.innerHTML = cols.map(col => {
    const colLeads = leads.filter(l => getLeadKanbanCol(l) === col.id);
    return `<div class="kanban-col" data-col="${col.id}">
      <div class="kanban-col-header">
        <span class="kanban-col-title" contenteditable="true" data-col="${col.id}">${esc(col.label)}</span>
        <span class="kanban-col-count">${colLeads.length}</span>
      </div>
      <div class="kanban-col-body" data-col="${col.id}">
        ${colLeads.length ? colLeads.map(l => kanbanCard(l)).join('') : '<div class="kanban-empty">Sem leads</div>'}
      </div>
    </div>`;
  }).join('');

  // Drag events on cards
  board.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragLeadId = card.dataset.id;
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  // Drop targets
  board.querySelectorAll('.kanban-col-body').forEach(body => {
    body.addEventListener('dragover', e => { e.preventDefault(); body.classList.add('drag-over'); });
    body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
    body.addEventListener('drop', async e => {
      e.preventDefault();
      body.classList.remove('drag-over');
      if (dragLeadId && dragLeadId !== '') {
        await moveLeadToCol(dragLeadId, body.dataset.col);
        dragLeadId = null;
      }
    });
  });

  // Editable column titles
  board.querySelectorAll('.kanban-col-title[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => {
      const cols = getKanbanCols();
      const col  = cols.find(c => c.id === el.dataset.col);
      if (col) { col.label = el.textContent.trim() || col.label; saveKanbanCols(cols); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });

  // Card click handlers
  board.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  board.querySelectorAll('.btn-kanban-resultado').forEach(b =>
    b.addEventListener('click', () => { const l=allLeads.find(x=>x.id===b.dataset.id); if(!l) return; currentId=l.id; openResultado(l); })
  );
  board.querySelectorAll('.btn-kanban-noshow').forEach(b =>
    b.addEventListener('click', async () => { currentId=b.dataset.id; await handlePostCall('noshow'); })
  );
}

function kanbanCard(l) {
  const closerName = l.closer ? (CLOSERS[l.closer]?.name||l.closer) : null;
  const etiquetas  = (l.etiquetas||[]).slice(0,2);
  const isAgendado = l.status === 'agendado';

  return `<div class="kanban-card" draggable="true" data-id="${l.id}">
    <div class="kc-head">
      <button class="kc-nome" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
      ${badgeStatus(l.status)}
    </div>
    ${etiquetas.length ? `<div class="kc-etiquetas">${etiquetas.map(t=>`<span class="etiqueta-chip etiqueta-chip--sm">${esc(t)}</span>`).join('')}</div>` : ''}
    ${l.dataagendamento ? `<div class="kc-datetime">📅 ${fmtDateHora(l.dataagendamento,l.horaagendamento)}</div>` : ''}
    <div class="kc-meta">
      ${closerName ? `<span class="kc-closer">${esc(closerName)}</span>` : ''}
      ${l.agendadopor ? `<span class="kc-resp">via ${esc(l.agendadopor)}</span>` : ''}
      ${badgeOrigem(l.origem)}
    </div>
    <div class="kc-foot">
      ${isAgendado ? `<button class="btn-kanban-noshow" data-id="${l.id}">No Show</button>` : ''}
      <button class="btn-kanban-resultado" data-id="${l.id}">${isAgendado?'Resultado →':'Ver →'}</button>
    </div>
  </div>`;
}

async function moveLeadToCol(leadId, colId) {
  try {
    await saveLead(leadId, { kanban_column: colId, atualizadoem: new Date().toISOString() });
    if (!isLive) renderKanban();
  } catch(e) {
    console.error(e);
    toast('Erro ao mover card.', 'err');
  }
}

function addKanbanColumn() {
  const label = prompt('Nome da nova coluna:');
  if (!label || !label.trim()) return;
  const cols = getKanbanCols();
  cols.push({ id: 'col_' + Date.now(), label: label.trim() });
  saveKanbanCols(cols);
  renderKanban();
}

// ─── RELATÓRIOS ──────────────────────────────────────────────────────
function renderRelatorios() {
  const mesFilt    = $('rel-filter-mes').value;
  const origemFilt = $('rel-filter-origem').value;

  let base = [...allLeads];
  if (mesFilt)    base = base.filter(l => (l.datachegada||'').startsWith(mesFilt));
  if (origemFilt) base = base.filter(l => l.origem === origemFilt);

  const agendados  = base.filter(l => l.dataagendamento);
  const realizadas = base.filter(l => l.status === 'realizada');
  const noShows    = base.filter(l => l.status === 'noshow');
  const vendas     = base.filter(l => l.venda_realizada === true);

  const taxaComp = agendados.length  ? pct(realizadas.length, agendados.length)  : 0;
  const taxaConv = realizadas.length ? pct(vendas.length,     realizadas.length) : 0;

  const faturamento = vendas.reduce((s,l) => s + parseValor(l.valor_venda), 0);

  // Por closer
  const closerMap = {};
  realizadas.forEach(l => {
    const k = l.closer||'_sem';
    if (!closerMap[k]) closerMap[k] = { agendados:0, realizadas:0, vendas:0, valor:0 };
    closerMap[k].realizadas++;
    if (l.venda_realizada) { closerMap[k].vendas++; closerMap[k].valor += parseValor(l.valor_venda); }
  });
  agendados.forEach(l => {
    const k = l.closer||'_sem';
    if (!closerMap[k]) closerMap[k] = { agendados:0, realizadas:0, vendas:0, valor:0 };
    closerMap[k].agendados++;
  });

  // Por origem
  const origemMap = {};
  base.forEach(l => {
    const o = l.origem||'Outros';
    if (!origemMap[o]) origemMap[o] = { total:0, agendados:0, realizadas:0, vendas:0 };
    origemMap[o].total++;
    if (l.dataagendamento) origemMap[o].agendados++;
    if (l.status==='realizada') origemMap[o].realizadas++;
    if (l.venda_realizada) origemMap[o].vendas++;
  });

  // Por responsável
  const respMap = {};
  agendados.forEach(l => {
    const r = l.agendadopor||'Desconhecido';
    if (!respMap[r]) respMap[r] = { agendados:0, realizadas:0, vendas:0 };
    respMap[r].agendados++;
    if (l.status==='realizada') respMap[r].realizadas++;
    if (l.venda_realizada) respMap[r].vendas++;
  });

  // Por mês
  const mesMap = {};
  base.forEach(l => {
    if (!l.datachegada) return;
    const m = l.datachegada.slice(0,7);
    if (!mesMap[m]) mesMap[m] = { total:0, realizadas:0, vendas:0, noShows:0, valor:0 };
    mesMap[m].total++;
    if (l.status==='realizada') mesMap[m].realizadas++;
    if (l.venda_realizada) { mesMap[m].vendas++; mesMap[m].valor += parseValor(l.valor_venda); }
    if (l.status==='noshow') mesMap[m].noShows++;
  });

  const relStatCard = (label, val, ico, accent='') => `
    <div class="stat-card ${accent}">
      <div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon">${ico}</span></div>
      <strong class="stat-num">${val}</strong>
    </div>`;

  $('relatorios-content').innerHTML = `
    <div class="stats-grid rel-summary">
      ${relStatCard('Total de Leads', base.length, '◈')}
      ${relStatCard('Comparecimento', taxaComp+'%', '◉', 'accent-petro')}
      ${relStatCard('Conversão', taxaConv+'%', '◆', 'accent-green')}
      ${relStatCard('Faturamento', 'R$\xa0'+fmtValor(faturamento), '◈', 'accent-sand')}
      ${relStatCard('No Shows', noShows.length, '✕', 'accent-marsala')}
      ${relStatCard('Vendas', vendas.length, '✦', 'accent-gold')}
    </div>

    ${relTable('Leads por Mês', ['Mês','Leads','Realizadas','Vendas','No Shows','Faturamento'],
      Object.entries(mesMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,d])=>
        [fmtMes(m), d.total, d.realizadas, d.vendas, d.noShows, d.valor?'R$\xa0'+fmtValor(d.valor):'—'])
    )}

    ${relTable('Resultado por Closer', ['Closer','Agendados','Realizadas','Vendas','Faturamento','Conv.'],
      Object.entries(closerMap).map(([c,d])=>
        [CLOSERS[c]?.name||c, d.agendados, d.realizadas, d.vendas,
         d.valor?'R$\xa0'+fmtValor(d.valor):'—',
         d.realizadas?pct(d.vendas,d.realizadas)+'%':'—'])
    )}

    ${relTable('Resultado por Origem', ['Origem','Leads','Agendados','Realizadas','Vendas','Conv.'],
      Object.entries(origemMap).sort((a,b)=>b[1].total-a[1].total).map(([o,d])=>
        [o, d.total, d.agendados, d.realizadas, d.vendas,
         d.realizadas?pct(d.vendas,d.realizadas)+'%':'—'])
    )}

    ${relTable('Responsável pelo Agendamento', ['Responsável','Agendados','Realizadas','Vendas'],
      Object.entries(respMap).map(([r,d])=>[r, d.agendados, d.realizadas, d.vendas])
    )}

    ${!base.length ? '<div class="agenda-empty"><div class="empty-ico">◈</div><h3>Sem dados</h3><p>Adicione leads ou ajuste os filtros.</p></div>' : ''}
  `;
}

function relTable(title, headers, rows) {
  if (!rows.length) return '';
  return `<div class="rel-section">
    <h3 class="rel-section-title">${esc(title)}</h3>
    <div class="rel-table-wrap">
      <table class="rel-table">
        <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function parseValor(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9,]/g,'').replace(',','.')) || 0;
}
function fmtValor(n) { return n.toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0}); }
function pct(a,b)    { return b ? Math.round(a/b*100) : 0; }
function fmtMes(m)   { if(!m) return '—'; const [y,mo]=m.split('-'); return `${MONTHS[+mo]} ${y}`; }

// ─── TABLE ───────────────────────────────────────────────────────────
function renderTable() {
  const tbody = $('leads-tbody');
  const empty = $('empty-state');
  if (!filteredLeads.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    $('chk-all').checked = false;
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filteredLeads.map(l => {
    const agendInfo = (l.status === 'agendado' && l.dataagendamento)
      ? `<span class="cell-agenda-info">${fmtDateHora(l.dataagendamento,l.horaagendamento)}<br>
          <span style="color:var(--text-dim);font-size:11px">${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</span>
          ${l.agendadopor?`<br><span style="color:var(--text-dim);font-size:11px">via ${esc(l.agendadopor)}</span>`:''}
        </span>`
      : '—';
    const etiq = (l.etiquetas||[]).length
      ? (l.etiquetas||[]).slice(0,2).map(t=>`<span class="etiqueta-chip etiqueta-chip--sm">${esc(t)}</span>`).join('')
      : '—';
    return `<tr data-id="${l.id}" class="${selectedIds.has(l.id)?'row-selected':''}">
      <td class="cell-chk"><input type="checkbox" class="row-chk" data-id="${l.id}" ${selectedIds.has(l.id)?'checked':''}></td>
      <td class="cell-nome"><button class="nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button></td>
      <td class="cell-fone">${esc(l.celular||'—')}</td>
      <td>${badgeOrigem(l.origem)}</td>
      <td class="cell-renda">${esc(l.renda||'—')}</td>
      <td>${etiq}</td>
      <td>${badgeStatus(l.status)}</td>
      <td class="cell-data">${agendInfo}</td>
      <td class="cell-acoes">${btnAcao(l)}</td>
    </tr>`;
  }).join('');

  const allChecked = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));
  $('chk-all').checked = allChecked;
  $('chk-all').indeterminate = !allChecked && filteredLeads.some(l => selectedIds.has(l.id));

  tbody.querySelectorAll('.row-chk').forEach(chk =>
    chk.addEventListener('change', () => {
      if (chk.checked) selectedIds.add(chk.dataset.id);
      else             selectedIds.delete(chk.dataset.id);
      updateBulkBar();
      chk.closest('tr').classList.toggle('row-selected', chk.checked);
      const all = filteredLeads.every(l => selectedIds.has(l.id));
      $('chk-all').checked = all;
      $('chk-all').indeterminate = !all && filteredLeads.some(l => selectedIds.has(l.id));
    })
  );
  tbody.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  tbody.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); handleAction(b.dataset.id, b.dataset.action); })
  );
  tbody.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); currentId=b.dataset.id; closeAllDropdowns(); handlePostCall(b.dataset.postcall); })
  );
}

// ─── MOBILE CARDS ────────────────────────────────────────────────────
function renderCards() {
  const wrap = $('leads-cards');
  if (!filteredLeads.length) {
    wrap.innerHTML = `<div class="cards-empty"><h3>Nenhum lead encontrado</h3><p>Ajuste os filtros ou cadastre um novo lead.</p></div>`;
    return;
  }
  wrap.innerHTML = filteredLeads.map(l => {
    const etiquetas = (l.etiquetas||[]).map(t=>`<span class="etiqueta-chip etiqueta-chip--sm">${esc(t)}</span>`).join('');
    const agendInfo = (l.status==='agendado' && l.dataagendamento)
      ? `<div class="card-agenda-info">📅 ${fmtDateHora(l.dataagendamento,l.horaagendamento)} · ${esc(CLOSERS[l.closer]?.name||l.closer||'—')}</div>` : '';
    return `<div class="lead-card" data-id="${l.id}">
      <div class="card-head">
        <div>
          <button class="card-nome nome-link" data-perfil="${l.id}">${esc(l.nome||'—')}</button>
          <div class="card-fone">${esc(l.celular||'—')}</div>
        </div>
        <div class="card-badges">${badgeStatus(l.status)}${badgeOrigem(l.origem)}</div>
      </div>
      ${etiquetas ? `<div class="card-etiquetas">${etiquetas}</div>` : ''}
      <div class="card-grid">
        <div class="card-item"><label>Profissão</label><span>${esc(l.profissao||'—')}</span></div>
        <div class="card-item"><label>Renda</label><span class="renda-val">${esc(l.renda||'—')}</span></div>
      </div>
      ${agendInfo}
      <div class="card-foot">
        <span class="card-data">Chegou ${fmtDate(l.datachegada)}</span>
        ${btnAcao(l)}
      </div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); const l=allLeads.find(x=>x.id===b.dataset.perfil); if(l) openPerfil(l); })
  );
  wrap.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', () => handleAction(b.dataset.id, b.dataset.action))
  );
  wrap.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); currentId=b.dataset.id; closeAllDropdowns(); handlePostCall(b.dataset.postcall); })
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────
function badgeOrigem(o) {
  const map = { Instagram:'instagram', Facebook:'facebook', Indicação:'indicacao', Google:'google', WhatsApp:'whatsapp', Outros:'outros' };
  return `<span class="badge-origem ${map[o]||'outros'}">${esc(o||'—')}</span>`;
}
function badgeStatus(s) {
  const labels = { aguardando:'Aguardando', agendado:'Agendado', realizada:'Call Realizada', noshow:'No Show', cancelado:'Cancelado' };
  return `<span class="badge-status ${s||''}">${labels[s]||s||'—'}</span>`;
}
function btnAcao(l) {
  const id = l.id;
  const canAgendar  = l.status !== 'cancelado';
  const canRemarcar = l.status === 'agendado' || l.status === 'noshow';
  const isAgendado  = l.status === 'agendado';
  const isRealizada = l.status === 'realizada';
  const opts = [
    canAgendar  ? `<button class="acao-opt opt-agendar"   data-id="${id}" data-action="agendar">📅 Agendar</button>`   : '',
                  `<button class="acao-opt opt-qualificar" data-id="${id}" data-action="qualificar">🔍 Ver Perfil</button>`,
    canRemarcar ? `<button class="acao-opt opt-remarcar"   data-id="${id}" data-action="agendar">🔄 Remarcar</button>` : '',
    isRealizada ? `<button class="acao-opt opt-ver"        data-id="${id}" data-action="ver">📋 Ver Resultado</button>`: '',
    isAgendado  ? `<div class="acao-sep"></div>
                   <button class="acao-opt opt-realizada" data-id="${id}" data-postcall="realizada">✅ Call Realizada</button>
                   <button class="acao-opt opt-noshow"    data-id="${id}" data-postcall="noshow">❌ No Show</button>
                   <button class="acao-opt opt-cancelado" data-id="${id}" data-postcall="cancelado">🚫 Cancelado</button>` : '',
  ].filter(Boolean).join('');
  return `<div class="acoes-cell">
    <div class="acoes-wrap" data-leadid="${id}">
      <button class="btn-acao-main" data-id="${id}" data-action="menu">Ações ▾</button>
      <div class="acoes-dropdown">${opts}</div>
    </div>
    <button class="btn-icon btn-editar"  data-id="${id}" data-action="editar"  title="Editar">✏</button>
    <button class="btn-icon btn-excluir" data-id="${id}" data-action="excluir" title="Excluir">🗑</button>
  </div>`;
}
function fmtDate(d) {
  if (!d) return '—';
  if (typeof d.toDate === 'function') d = d.toDate().toISOString().slice(0,10);
  const [y,m,dd] = String(d).split('-');
  return `${dd}/${m}/${y}`;
}
function fmtDateHora(date, hora) { return date ? (hora ? `${fmtDate(date)} · ${hora}` : fmtDate(date)) : '—'; }
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── STATS ───────────────────────────────────────────────────────────
function updateStats() {
  const mes  = $('filter-mes').value;
  const base = mes ? allLeads.filter(l=>(l.datachegada||'').startsWith(mes)) : allLeads;
  $('stat-total').textContent      = base.length;
  $('stat-aguardando').textContent = base.filter(l=>l.status==='aguardando').length;
  $('stat-agendado').textContent   = base.filter(l=>l.status==='agendado').length;
  $('stat-noshow').textContent     = base.filter(l=>l.status==='noshow').length;
  $('stat-realizada').textContent  = base.filter(l=>l.status==='realizada').length;
  $('stat-vendas').textContent     = base.filter(l=>l.venda_realizada===true).length;
}
function updateCount() {
  const t = filteredLeads.length, a = allLeads.length;
  $('results-info').textContent = t===a ? `${t} lead${t!==1?'s':''}` : `${t} de ${a} lead${a!==1?'s':''}`;
}

// ─── MONTHS ──────────────────────────────────────────────────────────
const MONTHS = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function populateMonths() {
  const sel = $('filter-mes');
  const cur = sel.value;
  const months = [...new Set(allLeads.filter(l=>l.datachegada).map(l=>l.datachegada.slice(0,7)))].sort().reverse();
  while (sel.options.length > 1) sel.remove(1);
  months.forEach(m => { const [y,mo]=m.split('-'); sel.appendChild(new Option(`${MONTHS[+mo]} ${y}`,m)); });
  if (cur) sel.value = cur;
}

function populateAllMonths() {
  // datachegada months
  const datachegadaMonths = [...new Set(allLeads.filter(l=>l.datachegada).map(l=>l.datachegada.slice(0,7)))].sort().reverse();
  // dataagendamento months
  const agendaMonths = [...new Set(allLeads.filter(l=>l.dataagendamento).map(l=>l.dataagendamento.slice(0,7)))].sort().reverse();

  function fill(selId, months) {
    const sel = $(selId); if (!sel) return;
    const cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    months.forEach(m => { const [y,mo]=m.split('-'); sel.appendChild(new Option(`${MONTHS[+mo]} ${y}`,m)); });
    if (cur) sel.value = cur;
  }
  fill('filter-mes',          datachegadaMonths);
  fill('agenda-filter-mes',   agendaMonths);
  fill('briefing-filter-mes', agendaMonths);
  fill('kanban-filter-mes',   agendaMonths);
  fill('rel-filter-mes',      datachegadaMonths);
}

// ─── ACTIONS ─────────────────────────────────────────────────────────
function handleAction(id, action) {
  currentId = id;
  const lead = allLeads.find(l=>l.id===id);
  if (!lead) return;
  if (action === 'menu') { toggleAcoesDropdown(id); return; }
  closeAllDropdowns();
  if      (action === 'agendar')    openAgendar(lead);
  else if (action === 'qualificar') openPerfil(lead);
  else if (action === 'ver')        verDetalhes(lead);
  else if (action === 'editar')     openNovoLead(lead);
  else if (action === 'excluir')    deleteLead(id);
}

async function deleteLead(id) {
  if (!confirm('Excluir este lead? Esta ação não pode ser desfeita.')) return;
  try {
    if (isLive) { await deleteDoc(doc(db,'leads',id)); }
    else        { allLeads = allLeads.filter(l=>l.id!==id); renderAll(); }
    selectedIds.delete(id); updateBulkBar();
    toast('Lead excluído.', 'ok');
  } catch(e) { console.error(e); toast('Erro ao excluir.', 'err'); }
}

// ─── BULK ─────────────────────────────────────────────────────────────
function updateBulkBar() {
  const n = selectedIds.size;
  $('bulk-bar').style.display = n > 0 ? 'flex' : 'none';
  $('bulk-count').textContent = `${n} selecionado${n!==1?'s':''}`;
}
async function bulkDelete() {
  const n = selectedIds.size; if (!n) return;
  if (!confirm(`Excluir ${n} lead(s)?`)) return;
  try {
    if (isLive) { await Promise.all([...selectedIds].map(id=>deleteDoc(doc(db,'leads',id)))); }
    else        { allLeads = allLeads.filter(l=>!selectedIds.has(l.id)); renderAll(); }
    selectedIds.clear(); updateBulkBar();
    toast(`${n} lead(s) excluído(s).`, 'ok');
  } catch(e) { console.error(e); toast('Erro ao excluir.', 'err'); }
}
async function bulkChangeStatus() {
  const status = $('bulk-status-sel').value, n = selectedIds.size;
  if (!status || !n) { toast('Selecione um status.', 'err'); return; }
  try {
    const now = new Date().toISOString();
    if (isLive) { await Promise.all([...selectedIds].map(id=>updateDoc(doc(db,'leads',id),{status,atualizadoem:now}))); }
    else { selectedIds.forEach(id=>{ const i=allLeads.findIndex(l=>l.id===id); if(i!==-1) allLeads[i]={...allLeads[i],status,atualizadoem:now}; }); renderAll(); }
    toast(`Status atualizado em ${n} lead(s).`, 'ok');
    selectedIds.clear(); $('bulk-status-sel').value = ''; updateBulkBar();
  } catch(e) { console.error(e); toast('Erro ao atualizar status.', 'err'); }
}

// ─── AGENDAR MODAL ───────────────────────────────────────────────────
function openAgendar(lead) {
  modalMode = 'agendar';
  cal = { step: 1, closer: null, leadSnap: lead };
  $('modal-title').textContent    = 'Agendar Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = strip([
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Chegou em', v: fmtDate(lead.datachegada) },
  ]);
  $('form-resultado').style.display = 'none';
  $('form-agendar').style.display   = 'block';
  $('form-detalhes').style.display  = 'none';
  schedGoToStep(1);
  openModal();
}

function schedGoToStep(n) {
  cal.step = n;
  $('sched-step-1').style.display = n===1 ? 'block' : 'none';
  $('sched-step-2').style.display = n===2 ? 'block' : 'none';
  $('btn-voltar').style.display   = n===2 ? 'inline-flex' : 'none';
  const btn = $('btn-confirmar');
  if (n===1) { btn.style.display = 'none'; }
  else { btn.textContent='Confirmar Agendamento'; btn.style.display=''; btn.style.background='var(--gold)'; btn.style.color='#0d1a1c'; btn.style.border='none'; btn.disabled=false; }
}

function schedSelectCloser(closer) {
  cal.closer = closer;
  window.open(CLOSERS[closer].calLink, '_blank', 'noopener,noreferrer');
  $('sched-closer-lbl').value = CLOSERS[closer].name;
  $('sched-datetime').value   = '';
  $('sched-obs').value        = '';
  schedGoToStep(2);
}

// ─── PERFIL DO LEAD ──────────────────────────────────────────────────
function instagramLink(raw) {
  if (!raw) return '—';
  const user = String(raw).replace(/^@/,'').trim();
  if (!user) return '—';
  return `<a href="https://instagram.com/${esc(user)}" target="_blank" rel="noopener" style="color:var(--gold)">@${esc(user)}</a>`;
}

function openPerfil(lead) {
  perfilLeadId = lead.id;
  const STATUS_LBL = { aguardando:'Aguardando', agendado:'Agendado', realizada:'Call Realizada', noshow:'No Show', cancelado:'Cancelado' };
  $('perfil-title').textContent    = lead.nome || '—';
  $('perfil-subtitle').textContent = STATUS_LBL[lead.status] || lead.status || '—';

  renderEtiquetas(lead);

  $('perfil-dados').innerHTML = [
    { l:'Nome',      v: lead.nome      || '—' },
    { l:'Celular',   v: lead.celular   || lead.telefone || '—' },
    { l:'E-mail',    v: lead.email     || '—' },
    { l:'Instagram', v: lead.instagram || null, ig: true },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Idade',     v: lead.idade     || '—' },
  ].map(({l,v,ig}) => `<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${ig?instagramLink(v):esc(v||'—')}</span></div>`).join('');

  // Agendamento section
  const agendaWrap = $('perfil-agendamento-wrap');
  if (lead.dataagendamento) {
    $('perfil-agendamento').innerHTML = [
      { l:'Data', v: fmtDate(lead.dataagendamento) },
      { l:'Hora', v: lead.horaagendamento || '—' },
      { l:'Closer', v: CLOSERS[lead.closer]?.name || lead.closer || '—' },
      { l:'Agendado por', v: lead.agendadopor || '—' },
    ].map(({l,v}) => `<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${esc(v)}</span></div>`).join('');
    agendaWrap.style.display = 'block';
  } else {
    agendaWrap.style.display = 'none';
  }

  // Perfil section
  const perfilItems = [
    { l:'Desafio',v:lead.desafio||''}, { l:'Motivação',v:lead.motivacao||''},
    { l:'Já participou',v:lead.jaParticipou||''}, { l:'Já é aluna',v:lead.jaEAluna||''},
    { l:'Tempo que conhece',v:lead.tempoConhece||''}, { l:'De onde conhece',v:lead.deOnde||''},
  ].filter(c=>c.v);
  const perfilWrap = $('perfil-perfil-wrap');
  if (perfilItems.length) {
    $('perfil-perfil').innerHTML = perfilItems.map(({l,v})=>`<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${esc(v)}</span></div>`).join('');
    perfilWrap.style.display = 'block';
  } else { perfilWrap.style.display = 'none'; }

  // Origem section
  const origemItems = [
    { l:'Origem',v:lead.origem||''}, { l:'UTM Campaign',v:lead.utm_campaign||''},
    { l:'UTM Medium',v:lead.utm_medium||''}, { l:'UTM Source',v:lead.utm_source||''},
  ].filter(c=>c.v);
  const origemWrap = $('perfil-origem-wrap');
  if (origemItems.length) {
    $('perfil-origem').innerHTML = origemItems.map(({l,v})=>`<div class="detalhes-item"><span class="detalhes-lbl">${esc(l)}</span><span class="detalhes-val">${esc(v)}</span></div>`).join('');
    origemWrap.style.display = 'block';
  } else { origemWrap.style.display = 'none'; }

  $('perfil-obs').value = lead.observacoes || '';

  const hist = buildHistorico(lead);
  $('perfil-historico').innerHTML = hist.length
    ? hist.map(h=>`<div class="hist-item"><span class="hist-ico">${h.ico}</span><div class="hist-body"><div class="hist-label">${esc(h.label)}</div>${h.sub?`<div class="hist-sub">${esc(h.sub)}</div>`:''}</div></div>`).join('')
    : '<p class="hist-empty">Nenhuma ação registrada.</p>';

  $('perfil-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePerfil() {
  $('perfil-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  perfilLeadId = null;
}

async function salvarObsPerfil() {
  if (!perfilLeadId) return;
  const obs = $('perfil-obs').value.trim();
  const btn = $('btn-salvar-obs');
  btn.disabled = true;
  try { await saveLead(perfilLeadId, { observacoes: obs, atualizadoem: new Date().toISOString() }); toast('Observações salvas.', 'ok'); }
  catch(e) { console.error(e); toast('Erro ao salvar.', 'err'); }
  finally { btn.disabled = false; }
}

function buildHistorico(lead) {
  const items = [];
  if (lead.datachegada) items.push({ ico:'◈', label:'Lead cadastrado', sub:fmtDate(lead.datachegada) });
  if (lead.dataagendamento) {
    const closerName = lead.closer ? (CLOSERS[lead.closer]?.name||lead.closer) : null;
    const sub = [
      `${fmtDate(lead.dataagendamento)}${lead.horaagendamento?' às '+lead.horaagendamento:''}`,
      closerName ? 'Closer: '+closerName : null,
      lead.agendadopor ? 'Por: '+lead.agendadopor : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico:'📅', label:'Call agendada', sub });
  }
  if (lead.status === 'noshow')    items.push({ ico:'❌', label:'No Show registrado', sub:'' });
  if (lead.status === 'cancelado') items.push({ ico:'🚫', label:'Cancelado', sub:'' });
  if (lead.status === 'realizada' || lead.realizadaem) {
    const CLOSER_LBL = { call_realizada:'Call Realizada', followup:'Follow Up', fechamento:'Fechamento', venda_ganha:'Venda Ganha', venda_perdida:'Venda Perdida' };
    const dataCall = lead.realizadaem
      ? new Date(lead.realizadaem).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
      : fmtDate(lead.dataagendamento);
    const sub = [
      dataCall,
      lead.venda_realizada===true  ? 'Venda realizada' : null,
      lead.venda_realizada===false ? 'Sem venda' : null,
      lead.produto ? lead.produto : null,
      lead.valor_venda ? lead.valor_venda : null,
      lead.status_closer ? CLOSER_LBL[lead.status_closer]||lead.status_closer : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico:'✅', label:'Call realizada', sub });
    if (lead.obs_call) items.push({ ico:'💬', label:'Obs. da call', sub:lead.obs_call });
  }
  return items;
}

// ─── ETIQUETAS ───────────────────────────────────────────────────────
function renderEtiquetas(lead) {
  const tags = lead.etiquetas || [];
  $('etiquetas-chips').innerHTML = tags.map(t => `
    <span class="etiqueta-chip">
      ${esc(t)}
      <button class="etiqueta-remove" data-tag="${esc(t)}" title="Remover">×</button>
    </span>`).join('');
  $('etiquetas-defaults').innerHTML = ETIQUETAS_DEFAULT.map(t => `
    <button class="etiqueta-default${tags.includes(t)?' active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');

  $('etiquetas-chips').querySelectorAll('.etiqueta-remove').forEach(btn =>
    btn.addEventListener('click', () => toggleEtiqueta(lead.id, btn.dataset.tag, 'remove'))
  );
  $('etiquetas-defaults').querySelectorAll('.etiqueta-default').forEach(btn =>
    btn.addEventListener('click', () => toggleEtiqueta(lead.id, btn.dataset.tag, 'toggle'))
  );
}

async function toggleEtiqueta(leadId, tag, mode) {
  const idx = allLeads.findIndex(l => l.id === leadId);
  if (idx === -1) return;
  const tags = [...(allLeads[idx].etiquetas || [])];
  if (mode === 'remove') {
    const i = tags.indexOf(tag); if (i !== -1) tags.splice(i, 1);
  } else {
    const i = tags.indexOf(tag);
    if (i !== -1) tags.splice(i, 1); else tags.push(tag);
  }
  allLeads[idx].etiquetas = tags;
  renderEtiquetas(allLeads[idx]);
  try { await saveLead(leadId, { etiquetas: tags, atualizadoem: new Date().toISOString() }); }
  catch(e) { toast('Erro ao salvar etiqueta.', 'err'); }
}

async function addEtiquetaCustom() {
  const input = $('etiqueta-custom-input');
  const tag   = input.value.trim();
  if (!tag) return;
  input.value = '';
  await toggleEtiqueta(perfilLeadId, tag, 'toggle');
}

// ─── RESULTADO MODAL ─────────────────────────────────────────────────
function openResultado(lead) {
  modalMode = 'resultado';
  $('modal-title').textContent    = 'Resultado da Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = strip([
    { l:'Agendado',  v: lead.dataagendamento ? `${fmtDate(lead.dataagendamento)} ${lead.horaagendamento||''}`.trim() : '—' },
    { l:'Closer',    v: CLOSERS[lead.closer]?.name || lead.closer || '—' },
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
  ]);
  $('form-agendar').style.display   = 'none';
  $('form-resultado').style.display = 'block';
  $('form-detalhes').style.display  = 'none';
  $('campos-venda').style.display   = 'none';
  $('campo-parcelas').style.display = 'none';
  $('campo-valor-entrada').style.display = 'none';
  document.querySelectorAll('#form-resultado .toggle-opt').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('#pagamento-opcoes input[type=checkbox]').forEach(c => c.checked = false);
  $('res-obs').value = '';
  $('res-valor-venda').value = '';
  $('res-valor-entrada').value = '';
  $('res-parcelas').value = '';
  $('res-produto').value = '';
  const btn = $('btn-confirmar');
  $('btn-voltar').style.display = 'none';
  btn.textContent='Salvar Resultado'; btn.style.display=''; btn.style.background='var(--green-bright)'; btn.style.color='#0d1a1c'; btn.style.border='none'; btn.disabled=false;
  openModal();
}

function openDetalhes(lead) {
  modalMode = 'detalhes';
  $('modal-title').textContent    = 'Detalhes da Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = '';
  $('form-agendar').style.display   = 'none';
  $('form-resultado').style.display = 'block';

  document.querySelectorAll('#form-resultado .toggle-opt').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('#pagamento-opcoes input[type=checkbox]').forEach(c => c.checked = false);

  if (lead.status_closer) setToggleVal('toggle-closer-status', lead.status_closer);
  const vendaStr = lead.venda_realizada===true?'sim': lead.venda_realizada===false?'nao':null;
  if (vendaStr) setToggleVal('toggle-venda', vendaStr);
  const temVenda = lead.venda_realizada===true;
  $('campos-venda').style.display = temVenda ? 'block' : 'none';
  if (temVenda) {
    $('res-produto').value         = lead.produto || '';
    $('res-valor-venda').value     = lead.valor_venda || '';
    $('res-valor-entrada').value   = lead.valor_entrada || '';
    $('res-parcelas').value        = lead.parcelas || '';
    (lead.formas_pagamento||[]).forEach(v => {
      const chk = document.querySelector(`#pagamento-opcoes input[value="${v}"]`);
      if (chk) chk.checked = true;
    });
    const temParcelado = (lead.formas_pagamento||[]).includes('parcelado');
    $('campo-parcelas').style.display = temParcelado ? 'block' : 'none';
    const temEntrada = lead.tem_entrada;
    if (temEntrada) setToggleVal('toggle-entrada','sim');
    $('campo-valor-entrada').style.display = temEntrada ? 'block' : 'none';
  }
  if (lead.temperatura) setToggleVal('toggle-temperatura', lead.temperatura);
  $('res-obs').value = lead.obs_call || '';

  $('det-nome').textContent      = lead.nome      || '—';
  $('det-celular').textContent   = lead.celular   || '—';
  $('det-email').textContent     = lead.email     || '—';
  $('det-origem').textContent    = lead.origem    || '—';
  $('det-profissao').textContent = lead.profissao || '—';
  $('det-renda').textContent     = lead.renda     || '—';
  $('det-closer').textContent    = lead.closer ? (CLOSERS[lead.closer]?.name||lead.closer) : '—';
  let dataCall = '—';
  if (lead.realizadaem) dataCall = new Date(lead.realizadaem).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  else if (lead.dataagendamento) dataCall = `${fmtDate(lead.dataagendamento)} ${lead.horaagendamento||''}`.trim();
  $('det-data-call').textContent = dataCall;
  $('form-detalhes').style.display = 'block';

  $('btn-voltar').style.display = 'none';
  const btn = $('btn-confirmar');
  btn.textContent='Salvar Resultado'; btn.style.display=''; btn.style.background='var(--green-bright)'; btn.style.color='#0d1a1c'; btn.style.border='none'; btn.disabled=false;
  openModal();
}

function verDetalhes(lead) {
  if (lead.status==='realizada') { openDetalhes(lead); return; }
  const lbl = { noshow:'No Show', cancelado:'Cancelado' };
  toast(`${lead.nome} — ${lbl[lead.status]||lead.status}`, 'ok');
}

function setToggleVal(groupId, val) {
  document.querySelectorAll(`#${groupId} .toggle-opt`).forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`#${groupId} .toggle-opt[data-val="${val}"]`);
  if (btn) btn.classList.add('selected');
}
function getToggleVal(groupId) {
  const sel = document.querySelector(`#${groupId} .toggle-opt.selected`);
  return sel ? sel.dataset.val : null;
}
function strip(items) {
  return items.map(({l,v}) => `<div class="strip-item"><span class="strip-lbl">${esc(l)}</span><span class="strip-val">${esc(v)}</span></div>`).join('');
}

// ─── MODAL ───────────────────────────────────────────────────────────
function openModal() {
  $('modal-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('btn-confirmar').disabled = false;
}
function closeModal() {
  $('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  currentId = null; modalMode = 'agendar';
  cal = { step:1, closer:null, leadSnap:null };
  $('btn-voltar').style.display     = 'none';
  $('form-resultado').style.display = 'none';
  $('form-detalhes').style.display  = 'none';
  $('form-agendar').style.display   = 'block';
  const btn = $('btn-confirmar');
  btn.style.display=''; btn.style.background=''; btn.style.color=''; btn.style.border=''; btn.textContent='Confirmar';
}

// ─── DROPDOWNS ───────────────────────────────────────────────────────
function closeAllDropdowns() {
  document.querySelectorAll('.acoes-dropdown.open').forEach(d => d.classList.remove('open'));
}
function toggleAcoesDropdown(id) {
  const wrap     = document.querySelector(`.acoes-wrap[data-leadid="${id}"]`);
  if (!wrap) return;
  const dropdown = wrap.querySelector('.acoes-dropdown');
  const isOpen   = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) dropdown.classList.add('open');
}

// ─── PÓS-CALL ────────────────────────────────────────────────────────
async function handlePostCall(action) {
  const lead = allLeads.find(l => l.id === currentId);
  if (!lead) return;
  if (action === 'remarcar') { openAgendar(lead); return; }
  if (action === 'realizada') { openResultado(lead); return; }
  const msgs = { noshow:`No Show — ${lead.nome}`, cancelado:`Cancelado — ${lead.nome}` };
  const updates = { status: action, atualizadoem: new Date().toISOString() };
  if (action === 'noshow') updates.kanban_column = 'venda_perdida';
  try { await saveLead(currentId, updates); toast(msgs[action]||'Status atualizado.', 'ok'); closeModal(); }
  catch(e) { console.error(e); toast('Erro ao salvar.', 'err'); }
}

// ─── CONFIRM ─────────────────────────────────────────────────────────
async function confirmar() {
  if (!currentId) return;
  const btn = $('btn-confirmar');
  btn.disabled = true;
  try {
    if (modalMode === 'agendar') {
      const dtVal = $('sched-datetime').value;
      if (!dtVal) { toast('Preencha a data e hora.', 'err'); btn.disabled=false; return; }
      const [datePart, timePart] = dtVal.split('T');
      const obs = $('sched-obs').value.trim();
      const agendadopor = currentUser?.displayName || currentUser?.email || 'Desconhecido';
      await saveLead(currentId, {
        status:'agendado', closer:cal.closer,
        dataagendamento:datePart, horaagendamento:timePart,
        observacoes:obs, agendadopor,
        kanban_column:'agendado',
        atualizadoem:new Date().toISOString()
      });
      toast(`Call agendada — ${timePart} · ${fmtDate(datePart)}`, 'ok');

    } else if (modalMode === 'resultado' || modalMode === 'detalhes') {
      const closerSt   = getToggleVal('toggle-closer-status');
      const vendaVal   = getToggleVal('toggle-venda');
      const temperatura = getToggleVal('toggle-temperatura');
      if (!closerSt) { toast('Selecione o status da negociação.', 'err'); btn.disabled=false; return; }
      if (!vendaVal) { toast('Informe se a venda foi realizada.', 'err'); btn.disabled=false; return; }

      const kanbanColMap = { call_realizada:'call_realizada', followup:'followup', fechamento:'fechamento', venda_ganha:'venda_ganha', venda_perdida:'venda_perdida' };
      const payload = {
        status:          'realizada',
        status_closer:   closerSt,
        kanban_column:   kanbanColMap[closerSt] || 'call_realizada',
        venda_realizada: vendaVal === 'sim',
        obs_call:        $('res-obs').value.trim(),
        atualizadoem:    new Date().toISOString()
      };
      if (modalMode === 'resultado') payload.realizadaem = new Date().toISOString();
      if (temperatura) payload.temperatura = temperatura;

      if (vendaVal === 'sim') {
        const formas = [...document.querySelectorAll('#pagamento-opcoes input[type=checkbox]:checked')].map(c=>c.value);
        payload.produto          = $('res-produto').value;
        payload.valor_venda      = $('res-valor-venda').value.trim();
        payload.formas_pagamento = formas;
        if (formas.includes('parcelado')) payload.parcelas = parseInt($('res-parcelas').value)||0;
        const entradaVal = getToggleVal('toggle-entrada');
        payload.tem_entrada = entradaVal === 'sim';
        if (entradaVal === 'sim') payload.valor_entrada = $('res-valor-entrada').value.trim();
      }

      const lead = allLeads.find(l => l.id === currentId);
      await saveLead(currentId, payload);
      toast(`Resultado salvo — ${lead?.nome||''}`, 'ok');
    }
    closeModal();
  } catch(e) {
    console.error(e);
    toast(e.message||'Erro ao confirmar.', 'err');
    btn.disabled = false;
  }
}

async function saveLead(id, data) {
  if (isLive) {
    await updateDoc(doc(db, 'leads', id), data);
  } else {
    const i = allLeads.findIndex(l => l.id === id);
    if (i !== -1) allLeads[i] = { ...allLeads[i], ...data };
    renderAll();
  }
}

// ─── NOVO / EDITAR LEAD ──────────────────────────────────────────────
function openNovoLead(lead = null) {
  novoLeadId = lead ? lead.id : null;
  $('novo-lead-title').textContent = lead ? 'Editar Lead' : 'Novo Lead';
  $('btn-salvar-lead').textContent = lead ? 'Salvar alterações' : 'Cadastrar Lead';
  $('nl-nome').value      = lead?.nome                      || '';
  $('nl-celular').value   = lead?.celular || lead?.telefone || '';
  $('nl-email').value     = lead?.email                     || '';
  $('nl-instagram').value = lead?.instagram                 || '';
  $('nl-profissao').value = lead?.profissao                 || '';
  $('nl-renda').value     = lead?.renda                     || '';
  $('nl-origem').value    = lead?.origem                    || '';
  $('nl-obs').value       = lead?.observacoes               || '';
  $('novo-lead-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('nl-nome').focus(), 50);
}
function closeNovoLead() {
  $('novo-lead-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  novoLeadId = null;
}
async function confirmarNovoLead() {
  const nome    = $('nl-nome').value.trim();
  const celular = $('nl-celular').value.trim();
  if (!nome)    { toast('Preencha o nome.', 'err'); return; }
  if (!celular) { toast('Preencha o celular.', 'err'); return; }
  const btn = $('btn-salvar-lead');
  btn.disabled = true;
  const data = {
    nome, celular,
    email:       $('nl-email').value.trim(),
    instagram:   $('nl-instagram').value.trim(),
    profissao:   $('nl-profissao').value.trim(),
    renda:       $('nl-renda').value.trim(),
    origem:      $('nl-origem').value,
    observacoes: $('nl-obs').value.trim(),
    atualizadoem: new Date().toISOString(),
  };
  try {
    if (novoLeadId) {
      await saveLead(novoLeadId, data);
      toast(`Lead atualizado — ${nome}`, 'ok');
    } else {
      data.status      = 'aguardando';
      data.datachegada = new Date().toISOString().slice(0,10);
      data.criadoem    = new Date().toISOString();
      data.etiquetas   = [];
      if (isLive) { await addDoc(collection(db,'leads'), data); }
      else        { allLeads.unshift({ id:'local-'+Date.now(), ...data }); renderAll(); }
      toast(`Lead cadastrado — ${nome}`, 'ok');
    }
    closeNovoLead();
  } catch(e) { console.error(e); toast(e.message||'Erro ao salvar.', 'err'); btn.disabled=false; }
}

// ─── TOAST ───────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const dock = $('toast-dock');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-ico">${type==='ok'?'✓':'✕'}</span><span>${esc(msg)}</span>`;
  dock.appendChild(el);
  setTimeout(() => { el.style.animation='toastOut .25s ease forwards'; setTimeout(()=>el.remove(),250); }, 3500);
}

// ─── EVENTS ──────────────────────────────────────────────────────────
function bindEvents() {
  // Sub-nav
  document.querySelectorAll('.sub-link[data-sub]').forEach(btn =>
    btn.addEventListener('click', () => switchSub(btn.dataset.sub))
  );

  // Tab nav
  document.querySelectorAll('.nav-link[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // Leads filters
  ['filter-status','filter-origem','filter-mes'].forEach(id => $(id).addEventListener('change', applyFilters));
  $('filter-busca').addEventListener('input', applyFilters);
  $('btn-limpar').addEventListener('click', () => {
    ['filter-status','filter-origem','filter-mes'].forEach(id => $(id).value = '');
    $('filter-busca').value = '';
    applyFilters();
  });

  // Agenda filters
  ['agenda-filter-mes','agenda-filter-closer'].forEach(id => $(id).addEventListener('change', renderAgendaSub));
  $('btn-gerar-agenda').addEventListener('click', gerarAgendaDoDia);

  // Briefing filters
  ['briefing-filter-mes','briefing-filter-closer'].forEach(id => $(id).addEventListener('change', renderBriefingSub));

  // Kanban filters
  ['kanban-filter-mes','kanban-filter-closer'].forEach(id => $(id).addEventListener('change', renderKanban));
  $('btn-add-column').addEventListener('click', addKanbanColumn);

  // Relatórios filters
  ['rel-filter-mes','rel-filter-origem'].forEach(id => $(id).addEventListener('change', renderRelatorios));

  // Novo lead
  $('btn-novo-lead-sub').addEventListener('click', () => openNovoLead());

  // Modal
  $('modal-close').addEventListener('click', closeModal);
  $('btn-cancelar').addEventListener('click', closeModal);
  $('btn-confirmar').addEventListener('click', confirmar);
  $('modal-backdrop').addEventListener('click', e => { if(e.target===$('modal-backdrop')) closeModal(); });
  $('btn-voltar').addEventListener('click', () => schedGoToStep(1));
  $('sched-step-1').addEventListener('click', e => {
    const card = e.target.closest('.closer-card');
    if (card) schedSelectCloser(card.dataset.closer);
  });

  // Resultado: toggles
  $('form-resultado').addEventListener('click', e => {
    const opt = e.target.closest('.toggle-opt');
    if (!opt) return;
    const group = opt.closest('.toggle-group');
    if (!group) return;
    document.querySelectorAll(`#${group.id} .toggle-opt`).forEach(b=>b.classList.remove('selected'));
    opt.classList.add('selected');

    if (group.id === 'toggle-venda') {
      $('campos-venda').style.display = opt.dataset.val==='sim' ? 'block' : 'none';
    }
    if (group.id === 'toggle-entrada') {
      $('campo-valor-entrada').style.display = opt.dataset.val==='sim' ? 'block' : 'none';
    }
  });

  // Parcelado toggle
  document.getElementById('pagamento-opcoes').addEventListener('change', () => {
    const parcelado = document.querySelector('#pagamento-opcoes input[value="parcelado"]')?.checked;
    $('campo-parcelas').style.display = parcelado ? 'block' : 'none';
  });

  // Bulk
  $('chk-all').addEventListener('change', e => {
    if (e.target.checked) filteredLeads.forEach(l=>selectedIds.add(l.id));
    else                  filteredLeads.forEach(l=>selectedIds.delete(l.id));
    updateBulkBar(); renderTable();
  });
  $('btn-bulk-delete').addEventListener('click', bulkDelete);
  $('btn-bulk-status').addEventListener('click', bulkChangeStatus);
  $('btn-bulk-clear').addEventListener('click', () => { selectedIds.clear(); updateBulkBar(); renderTable(); });

  // Perfil
  $('perfil-close').addEventListener('click', closePerfil);
  $('perfil-fechar').addEventListener('click', closePerfil);
  $('btn-salvar-obs').addEventListener('click', salvarObsPerfil);
  $('perfil-backdrop').addEventListener('click', e => { if(e.target===$('perfil-backdrop')) closePerfil(); });

  // Etiquetas
  $('btn-add-etiqueta').addEventListener('click', addEtiquetaCustom);
  $('etiqueta-custom-input').addEventListener('keydown', e => { if(e.key==='Enter') addEtiquetaCustom(); });

  // Novo lead modal
  $('novo-lead-close').addEventListener('click', closeNovoLead);
  $('novo-lead-cancelar').addEventListener('click', closeNovoLead);
  $('btn-salvar-lead').addEventListener('click', confirmarNovoLead);
  $('novo-lead-backdrop').addEventListener('click', e => { if(e.target===$('novo-lead-backdrop')) closeNovoLead(); });

  // Dropdown: fechar ao clicar fora
  document.addEventListener('click', e => { if(!e.target.closest('.acoes-wrap')) closeAllDropdowns(); });

  // Auth
  $('btn-login-google').addEventListener('click', loginWithGoogle);
  $('btn-logout').addEventListener('click', logoutUser);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePerfil(); closeNovoLead(); }
  });
}

// ─── SHORTHAND ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ─── BOOT ────────────────────────────────────────────────────────────
bindEvents();
initAuth();
