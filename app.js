/**
 * FDV — Sistema Comercial
 * Tela 1: Lista de Leads
 *
 * CONFIGURAÇÃO DO FIREBASE
 * ──────────────────────────────────────────────────────────────────
 * 1. Acesse https://console.firebase.google.com
 * 2. Crie um projeto e ative o Firestore Database (modo produção ou teste)
 * 3. Em "Configurações do projeto > Seus apps", copie o firebaseConfig
 * 4. Cole as credenciais abaixo substituindo os valores "YOUR_..."
 * 5. No Firestore, crie a coleção "leads" (será criada automaticamente
 *    ao adicionar o primeiro documento)
 *
 * Estrutura do documento "leads":
 *   nome         string   — Nome completo
 *   celular      string   — Ex: (11) 99999-9999
 *   origem       string   — Instagram | Facebook | Indicação | Google | WhatsApp | Outros
 *   profissao    string
 *   renda        string   — Ex: R$ 5.000
 *   datachegada  string   — YYYY-MM-DD
 *   status       string   — aguardando | agendado | realizada
 *   dataagendamento  string   — YYYY-MM-DD (preenchido ao agendar)
 *   horaagendamento  string   — HH:MM (preenchido ao agendar)
 *   observacoes  string
 *   resultado    string   — preenchido ao marcar realizada
 * ──────────────────────────────────────────────────────────────────
 */

import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, onSnapshot,
  doc, updateDoc, addDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const CLOSERS = {
  fernanda: { name: 'Fernanda', color: '#CE9221', bg: 'rgba(206,146,33,.12)', calLink: 'https://calendar.app.google/hWWi6tVKAhoXg5cUA' },
  thomaz:   { name: 'Thomaz',   color: '#4db5c8', bg: 'rgba(77,181,200,.12)',  calLink: 'https://calendar.app.google/1heVe3395Tsk9GeM8' }
};

// ─── FIREBASE CONFIG ────────────────────────────────────────────────
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
  { id:'d1', nome:'Ana Carolina Silva',    celular:'(11) 99876-5432', origem:'Instagram', profissao:'Professora',        renda:'R$ 4.500',  datachegada:'2026-04-01', status:'aguardando' },
  { id:'d2', nome:'Roberto Mendes',        celular:'(21) 98765-4321', origem:'Indicação', profissao:'Analista de TI',    renda:'R$ 8.200',  datachegada:'2026-04-02', status:'agendado',  dataagendamento:'2026-04-10', horaagendamento:'14:30' },
  { id:'d3', nome:'Mariana Fonseca',       celular:'(31) 97654-3210', origem:'Facebook',  profissao:'Enfermeira',        renda:'R$ 5.800',  datachegada:'2026-03-28', status:'realizada', resultado:'interessado' },
  { id:'d4', nome:'Carlos Eduardo Lopes',  celular:'(41) 96543-2109', origem:'Google',    profissao:'Empresário',        renda:'R$ 15.000', datachegada:'2026-04-03', status:'aguardando' },
  { id:'d5', nome:'Patrícia Oliveira',     celular:'(51) 95432-1098', origem:'WhatsApp',  profissao:'Nutricionista',     renda:'R$ 6.300',  datachegada:'2026-04-05', status:'aguardando' },
  { id:'d6', nome:'Marcos Henrique Costa', celular:'(61) 94321-0987', origem:'Instagram', profissao:'Engenheiro Civil',  renda:'R$ 12.000', datachegada:'2026-03-20', status:'realizada', resultado:'matriculado' },
  { id:'d7', nome:'Juliana Alves',         celular:'(71) 93210-9876', origem:'Indicação', profissao:'Médica',            renda:'R$ 22.000', datachegada:'2026-04-06', status:'agendado',  dataagendamento:'2026-04-11', horaagendamento:'10:00' },
  { id:'d8', nome:'Fernando Ribeiro',      celular:'(81) 92109-8765', origem:'Outros',    profissao:'Advogado',          renda:'R$ 9.500',  datachegada:'2026-03-15', status:'aguardando' },
  { id:'d9', nome:'Camila Torres',         celular:'(11) 91098-7654', origem:'Instagram', profissao:'Designer',          renda:'R$ 7.200',  datachegada:'2026-04-07', status:'aguardando' },
  { id:'d10',nome:'Rodrigo Neves',         celular:'(21) 90987-6543', origem:'Google',    profissao:'Contador',          renda:'R$ 10.800', datachegada:'2026-03-10', status:'realizada', resultado:'nao_interessado' },
];

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
let leadsLoaded   = false;
let activeTab     = 'leads';

// agendamento state
let cal = {
  step:     1,     // 1 | 2
  closer:   null,  // 'fernanda' | 'thomaz'
  leadSnap: null
};

// ─── AUTH ────────────────────────────────────────────────────────────
function initAuth() {
  isLive = initFirebase();

  if (!isLive) {
    // Demo mode — skip auth, go straight to app
    $('login-screen').style.display = 'none';
    $('app-header').style.display   = '';
    $('app-main').style.display     = '';
    loadLeads();
    return;
  }

  auth = getAuth();

  onAuthStateChanged(auth, user => {
    if (user) {
      // Logged in
      $('login-screen').style.display = 'none';
      $('app-header').style.display   = '';
      $('app-main').style.display     = '';

      // Populate user info in header
      const avatar = $('user-avatar');
      if (user.photoURL) {
        avatar.src           = user.photoURL;
        avatar.style.display = '';
      }
      $('user-name').textContent = user.displayName || user.email;

      if (!leadsLoaded) {
        leadsLoaded = true;
        loadLeads();
      }
    } else {
      // Not logged in — show login screen
      $('login-screen').style.display = '';
      $('app-header').style.display   = 'none';
      $('app-main').style.display     = 'none';
      leadsLoaded = false;
    }
  });
}

async function loginWithGoogle() {
  const btn = $('btn-login-google');
  const err = $('login-error');
  btn.disabled      = true;
  err.style.display = 'none';
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    err.textContent   = 'Erro ao entrar. Tente novamente.';
    err.style.display = 'block';
    console.error(e);
  } finally {
    btn.disabled = false;
  }
}

async function logoutUser() {
  try {
    leadsLoaded = false;
    await signOut(auth);
  } catch (e) {
    console.error(e);
  }
}

// ─── INIT FIREBASE ───────────────────────────────────────────────────
function initFirebase() {
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.info('🟡 Firebase não configurado — usando dados de demonstração.');
    return false;
  }
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.info('✅ Firebase conectado.');
    return true;
  } catch (e) {
    console.error('❌ Falha ao conectar Firebase:', e);
    return false;
  }
}

// ─── LOAD ────────────────────────────────────────────────────────────
function loadLeads() {
  const overlay = $('loading-layer');

  if (!isLive) {
    setTimeout(() => {
      allLeads = structuredClone(DEMO);
      overlay.style.display = 'none';
      $('demo-banner').style.display = 'block';
      renderAll();
    }, 700);
    return;
  }

  // Sem orderBy: evita exigência de índice e funciona em qualquer configuração.
  // A ordenação por datachegada é feita no cliente dentro de renderAll().
  const leadsRef = collection(db, 'leads');
  let firstSnapshot = true;

  console.log('[FDV] Abrindo listener no Firestore — coleção: leads');

  onSnapshot(leadsRef, async snap => {
    console.log(`[FDV] Snapshot recebido — ${snap.size} documento(s), empty: ${snap.empty}`);

    if (firstSnapshot && snap.empty) {
      firstSnapshot = false;
      console.log('[FDV] Coleção vazia — seed não é feito automaticamente aqui. Execute: node seed.js');
      overlay.style.display = 'none';
      renderAll(); // renderiza estado vazio
      return;
    }
    firstSnapshot = false;

    allLeads = snap.docs.map(d => {
      const data = d.data();
      console.log(`[FDV] Lead: ${data.nome} | status: ${data.status} | datachegada: ${data.datachegada}`);
      const lead = { id: d.id, ...data };
      // normaliza: Apps Script grava "telefone", app usa "celular"
      if (!lead.celular && lead.telefone) lead.celular = lead.telefone;
      return lead;
    });

    overlay.style.display = 'none';
    renderAll();
  }, err => {
    overlay.style.display = 'none';
    console.error('[FDV] Erro no Firestore:', err.code, err.message);
    showFirestoreError(err.code);
  });
}

// ─── SEED (leads de teste para primeira execução) ────────────────────
async function seedFirestore() {
  const leads = [
    {
      nome:        'Beatriz Santos',
      celular:     '(11) 98234-5678',
      origem:      'Instagram',
      profissao:   'Psicóloga',
      renda:       'R$ 7.500',
      datachegada: '2026-04-05',
      status:      'aguardando',
      criadoem:    new Date().toISOString()
    },
    {
      nome:        'André Lima',
      celular:     '(21) 97345-6789',
      origem:      'Indicação',
      profissao:   'Fisioterapeuta',
      renda:       'R$ 9.000',
      datachegada: '2026-04-03',
      status:      'agendado',
      dataagendamento: '2026-04-12',
      horaagendamento: '09:00',
      observacoes: 'Indicado pela turma anterior. Muito interessado.',
      criadoem:    new Date().toISOString()
    },
    {
      nome:        'Fernanda Castro',
      celular:     '(31) 96456-7890',
      origem:      'WhatsApp',
      profissao:   'Terapeuta Holística',
      renda:       'R$ 5.200',
      datachegada: '2026-04-06',
      status:      'aguardando',
      criadoem:    new Date().toISOString()
    },
    {
      nome:        'Lucas Monteiro',
      celular:     '(41) 95567-8901',
      origem:      'Facebook',
      profissao:   'Coach de Carreira',
      renda:       'R$ 11.000',
      datachegada: '2026-03-25',
      status:      'realizada',
      dataagendamento: '2026-04-01',
      horaagendamento: '15:00',
      resultado:   'matriculado',
      observacoes_call: 'Fechou na hora. Pagamento à vista.',
      realizadaem: '2026-04-01T15:42:00.000Z',
      criadoem:    new Date().toISOString()
    },
    {
      nome:        'Isabela Rodrigues',
      celular:     '(51) 94678-9012',
      origem:      'Google',
      profissao:   'Pedagoga',
      renda:       'R$ 4.800',
      datachegada: '2026-04-07',
      status:      'aguardando',
      criadoem:    new Date().toISOString()
    }
  ];

  const ref = collection(db, 'leads');
  await Promise.all(leads.map(l => addDoc(ref, l)));
  console.info('✅ 5 leads de teste inseridos no Firestore.');
}

// ─── ERRO PERSISTENTE ────────────────────────────────────────────────
function showFirestoreError(code) {
  const msgs = {
    'permission-denied': 'Permissão negada pelo Firestore. Abra o Firebase Console → Firestore → Regras e permita leitura/escrita.',
    'unavailable':       'Firestore indisponível. Verifique sua conexão com a internet.',
    'not-found':         'Banco de dados não encontrado. Verifique se o Firestore foi ativado no projeto.',
  };
  const msg = msgs[code] || `Erro Firestore (${code}). Verifique o console do navegador (F12).`;

  const wrap = $('table-wrap');
  wrap.innerHTML = `
    <div style="padding:48px 32px;text-align:center">
      <div style="font-size:28px;margin-bottom:16px">⚠️</div>
      <h3 style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Não foi possível carregar os leads</h3>
      <p style="font-size:13px;color:var(--text-muted);max-width:440px;margin:0 auto 20px;line-height:1.7">${msg}</p>
      <details style="text-align:left;max-width:460px;margin:0 auto">
        <summary style="font-size:12px;color:var(--text-dim);cursor:pointer;margin-bottom:8px">Regras recomendadas para desenvolvimento</summary>
        <pre style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:14px;font-size:12px;color:var(--sand);overflow:auto">rules_version = '2';
service cloud.firestore.rules {
  match /databases/{database}/documents {
    match /leads/{id} {
      allow read, write: if true;
    }
  }
}</pre>
      </details>
    </div>`;

  // também mostra nos cards (mobile)
  $('leads-cards').innerHTML = '';
}

// ─── TAB SWITCHING ───────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  const panel = $('tab-' + tab);
  if (panel) panel.style.display = '';
  document.querySelectorAll('.nav-link[data-tab]').forEach(l =>
    l.classList.toggle('active', l.dataset.tab === tab)
  );
  if      (tab === 'leads')        { populateMonths(); applyFilters(); }
  else if (tab === 'closer')       renderCloserTab();
  else if (tab === 'agendamentos') renderAgendamentosTab();
  // relatórios: static panel, nothing to render
}

// ─── RENDER PIPELINE ─────────────────────────────────────────────────
function renderAll() {
  allLeads.sort((a, b) => (b.datachegada || '').localeCompare(a.datachegada || ''));
  updateStats(); // always keep stats fresh
  if      (activeTab === 'leads')        { populateMonths(); applyFilters(); }
  else if (activeTab === 'closer')       renderCloserTab();
  else if (activeTab === 'agendamentos') renderAgendamentosTab();
}

function applyFilters() {
  const origem = $('filter-origem').value;
  const mes    = $('filter-mes').value;
  const busca  = $('filter-busca').value.toLowerCase().trim();
  // Leads tab always shows only aguardando
  filteredLeads = allLeads.filter(l => {
    if (l.status !== 'aguardando')                         return false;
    if (origem && l.origem !== origem)                     return false;
    if (mes    && !(l.datachegada || '').startsWith(mes))  return false;
    if (busca) {
      const n = (l.nome    || '').toLowerCase();
      const c = (l.celular || '').toLowerCase();
      if (!n.includes(busca) && !c.includes(busca))        return false;
    }
    return true;
  });

  renderTable();
  renderCards();
  updateCount();
  updateStats();
}

// ─── CLOSER TAB ──────────────────────────────────────────────────────
function renderCloserTab() {
  const agendados = allLeads.filter(l => l.status === 'agendado');

  ['fernanda', 'thomaz'].forEach(key => {
    const list  = $(`closer-${key}-list`);
    const count = $(`closer-${key}-count`);
    const leads = agendados.filter(l => (l.closer || '').toLowerCase() === key)
      .sort((a, b) =>
        ((a.dataagendamento || '') + (a.horaagendamento || ''))
          .localeCompare((b.dataagendamento || '') + (b.horaagendamento || ''))
      );

    count.textContent = `${leads.length} call${leads.length !== 1 ? 's' : ''} agendada${leads.length !== 1 ? 's' : ''}`;

    if (!leads.length) {
      list.innerHTML = '<p class="closer-empty-section">Nenhuma call agendada.</p>';
      return;
    }

    list.innerHTML = leads.map(l => `
      <div class="clc-card">
        <div class="clc-head">
          <button class="clc-nome" data-perfil="${l.id}">${esc(l.nome || '—')}</button>
          <span class="clc-tempo">${fmtDateHora(l.dataagendamento, l.horaagendamento)}</span>
        </div>
        <div class="clc-meta">
          ${badgeOrigem(l.origem)}
          ${l.renda   ? `<span class="clc-renda">${esc(l.renda)}</span>`   : ''}
          ${l.celular ? `<span class="clc-cel">${esc(l.celular)}</span>` : ''}
        </div>
        ${l.observacoes ? `<div class="clc-obs">${esc(l.observacoes)}</div>` : ''}
        <div class="clc-foot">
          <button class="btn-acao realizar btn-resultado-closer" data-id="${l.id}">
            Resultado da Call →
          </button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-perfil]').forEach(b =>
      b.addEventListener('click', () => {
        const lead = allLeads.find(l => l.id === b.dataset.perfil);
        if (lead) openPerfil(lead);
      })
    );
    list.querySelectorAll('.btn-resultado-closer').forEach(b =>
      b.addEventListener('click', () => {
        const lead = allLeads.find(l => l.id === b.dataset.id);
        if (!lead) return;
        currentId = lead.id;
        openResultado(lead);
      })
    );
  });
}

// ─── AGENDAMENTOS TAB ────────────────────────────────────────────────
function renderAgendamentosTab() {
  const today     = new Date().toISOString().slice(0, 10);
  const todayLeads = allLeads.filter(l => l.status === 'agendado' && l.dataagendamento === today);
  const content   = $('agenda-content');
  const label     = $('agenda-data-label');

  label.textContent = `${todayLeads.length} call${todayLeads.length !== 1 ? 's' : ''} para hoje — ${fmtDate(today)}`;

  if (!todayLeads.length) {
    content.innerHTML = `
      <div class="agenda-empty">
        <div class="empty-ico">📅</div>
        <h3>Nenhuma call para hoje</h3>
        <p>Sem calls agendadas para ${fmtDate(today)}.</p>
      </div>`;
    return;
  }

  // Group by closer, sort each group by time
  const groups = {};
  todayLeads.forEach(l => {
    const k = l.closer || '_sem_closer';
    if (!groups[k]) groups[k] = [];
    groups[k].push(l);
  });
  Object.values(groups).forEach(arr =>
    arr.sort((a, b) => (a.horaagendamento || '').localeCompare(b.horaagendamento || ''))
  );

  const order = ['fernanda', 'thomaz',
    ...Object.keys(groups).filter(k => k !== 'fernanda' && k !== 'thomaz')];

  content.innerHTML = order
    .filter(k => groups[k]?.length)
    .map(key => {
      const c      = CLOSERS[key];
      const leads  = groups[key];
      const name   = c ? c.name : (key === '_sem_closer' ? 'Sem closer' : key);
      const color  = c ? c.color : 'var(--text-muted)';
      const bg     = c ? c.bg   : 'var(--bg-elevated)';
      const border = c ? c.color : 'var(--border)';
      const init   = name[0].toUpperCase();
      return `
        <div class="agenda-group">
          <div class="agenda-group-header">
            <div class="agenda-avatar" style="color:${color};background:${bg};border:1.5px solid ${border}">${init}</div>
            <h3 class="agenda-group-name">${esc(name)}</h3>
            <span class="agenda-group-count">${leads.length} call${leads.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="agenda-cards">
            ${leads.map(l => `
              <div class="agenda-card">
                <div class="agenda-card-time">${esc(l.horaagendamento || '—')}</div>
                <div class="agenda-card-info">
                  <button class="agenda-card-nome" data-perfil="${l.id}">${esc(l.nome || '—')}</button>
                  <span class="agenda-card-sub">${[l.celular, l.origem, l.renda].filter(Boolean).map(esc).join(' · ')}</span>
                </div>
                <button class="btn-ghost btn-sm btn-briefing" data-id="${l.id}">Gerar Briefing</button>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

  content.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', () => {
      const lead = allLeads.find(l => l.id === b.dataset.perfil);
      if (lead) openPerfil(lead);
    })
  );
  content.querySelectorAll('.btn-briefing').forEach(b =>
    b.addEventListener('click', () => {
      const lead = allLeads.find(l => l.id === b.dataset.id);
      if (lead) gerarBriefingLead(lead);
    })
  );
}

function gerarAgendaDoDia() {
  const today     = new Date().toISOString().slice(0, 10);
  const todayLeads = allLeads.filter(l => l.status === 'agendado' && l.dataagendamento === today);

  if (!todayLeads.length) {
    toast('Nenhuma call agendada para hoje.', 'err');
    return;
  }

  const groups = {};
  todayLeads.forEach(l => {
    const k = l.closer || '_sem_closer';
    if (!groups[k]) groups[k] = [];
    groups[k].push(l);
  });
  Object.values(groups).forEach(arr =>
    arr.sort((a, b) => (a.horaagendamento || '').localeCompare(b.horaagendamento || ''))
  );

  const divider = '─'.repeat(36);
  let text = `📅 AGENDA DO DIA — ${fmtDate(today)}\n${'═'.repeat(36)}\n\n`;

  ['fernanda', 'thomaz', ...Object.keys(groups).filter(k => k !== 'fernanda' && k !== 'thomaz')]
    .filter(k => groups[k])
    .forEach(key => {
      const name  = CLOSERS[key] ? CLOSERS[key].name : (key === '_sem_closer' ? 'Sem closer' : key);
      text += `👤 ${name.toUpperCase()}\n${divider}\n`;
      groups[key].forEach(l => {
        text += `${l.horaagendamento || '--:--'} — ${l.nome || '—'} | ${l.celular || '—'}`;
        if (l.origem) text += ` | ${l.origem}`;
        if (l.renda)  text += ` | ${l.renda}`;
        text += '\n';
      });
      text += '\n';
    });

  navigator.clipboard.writeText(text)
    .then(() => toast('Agenda copiada para a área de transferência!', 'ok'))
    .catch(() => toast('Não foi possível copiar. Verifique permissões do navegador.', 'err'));
}

function gerarBriefingLead(lead) {
  const fields = [
    ['Nome',              lead.nome],
    ['Celular',           lead.celular],
    ['E-mail',            lead.email],
    ['Instagram',         lead.instagram],
    ['Profissão',         lead.profissao],
    ['Renda',             lead.renda],
    ['Origem',            lead.origem],
    ['Desafio',           lead.desafio],
    ['Motivação',         lead.motivacao],
    ['Já participou',     lead.jaParticipou],
    ['Já é aluna',        lead.jaEAluna],
    ['Tempo que conhece', lead.tempoConhece],
    ['De onde conhece',   lead.deOnde],
    ['Observações',       lead.observacoes],
    ['Temperatura',       lead.temperatura],
    ['Call',              lead.dataagendamento ? `${fmtDate(lead.dataagendamento)} às ${lead.horaagendamento || '—'}` : null],
    ['Closer',            lead.closer ? (CLOSERS[lead.closer]?.name || lead.closer) : null],
  ];

  const line = '─'.repeat(32);
  let text = `📋 BRIEFING — ${lead.nome || '—'}\n${line}\n`;
  fields.forEach(([label, val]) => {
    if (val) text += `${label}: ${val}\n`;
  });

  navigator.clipboard.writeText(text)
    .then(() => toast(`Briefing de ${lead.nome} copiado!`, 'ok'))
    .catch(() => toast('Não foi possível copiar.', 'err'));
}

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

  tbody.innerHTML = filteredLeads.map(l => /* html */`
    <tr data-id="${l.id}" class="${selectedIds.has(l.id) ? 'row-selected' : ''}">
      <td class="cell-chk">
        <input type="checkbox" class="row-chk" data-id="${l.id}"
          ${selectedIds.has(l.id) ? 'checked' : ''}>
      </td>
      <td class="cell-nome"><button class="nome-link" data-perfil="${l.id}">${esc(l.nome || '—')}</button></td>
      <td class="cell-fone">${esc(l.celular || '—')}</td>
      <td>${badgeOrigem(l.origem)}</td>
      <td class="cell-renda">${esc(l.renda || '—')}</td>
      <td>${badgeStatus(l.status)}</td>
      <td class="cell-acoes">${btnAcao(l)}</td>
    </tr>
  `).join('');

  // select-all state
  const allChecked = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));
  $('chk-all').checked = allChecked;
  $('chk-all').indeterminate = !allChecked && filteredLeads.some(l => selectedIds.has(l.id));

  tbody.querySelectorAll('.row-chk').forEach(chk =>
    chk.addEventListener('change', () => {
      if (chk.checked) selectedIds.add(chk.dataset.id);
      else             selectedIds.delete(chk.dataset.id);
      updateBulkBar();
      const row = chk.closest('tr');
      row.classList.toggle('row-selected', chk.checked);
      const allNowChecked = filteredLeads.every(l => selectedIds.has(l.id));
      $('chk-all').checked = allNowChecked;
      $('chk-all').indeterminate = !allNowChecked && filteredLeads.some(l => selectedIds.has(l.id));
    })
  );
  tbody.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const lead = allLeads.find(l => l.id === b.dataset.perfil);
      if (lead) openPerfil(lead);
    })
  );
  tbody.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      handleAction(b.dataset.id, b.dataset.action);
    })
  );
  tbody.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      currentId = b.dataset.id;
      closeAllDropdowns();
      handlePostCall(b.dataset.postcall);
    })
  );
}

// ─── CARDS (mobile) ──────────────────────────────────────────────────
function renderCards() {
  const wrap = $('leads-cards');

  if (!filteredLeads.length) {
    wrap.innerHTML = /* html */`
      <div class="cards-empty">
        <h3>Nenhum lead encontrado</h3>
        <p>Ajuste os filtros ou cadastre um novo lead.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = filteredLeads.map(l => /* html */`
    <div class="lead-card" data-id="${l.id}">
      <div class="card-head">
        <div>
          <button class="card-nome nome-link" data-perfil="${l.id}">${esc(l.nome || '—')}</button>
          <div class="card-fone">${esc(l.celular || '—')}</div>
        </div>
        <div class="card-badges">
          ${badgeStatus(l.status)}
          ${badgeOrigem(l.origem)}
        </div>
      </div>
      <div class="card-grid">
        <div class="card-item">
          <label>Profissão</label>
          <span>${esc(l.profissao || '—')}</span>
        </div>
        <div class="card-item">
          <label>Renda Mensal</label>
          <span class="renda-val">${esc(l.renda || '—')}</span>
        </div>
      </div>
      <div class="card-foot">
        <span class="card-data">Chegou em ${fmtDate(l.datachegada)}</span>
        ${btnAcao(l)}
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-perfil]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      const lead = allLeads.find(l => l.id === b.dataset.perfil);
      if (lead) openPerfil(lead);
    })
  );
  wrap.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', () => handleAction(b.dataset.id, b.dataset.action))
  );
  wrap.querySelectorAll('[data-postcall]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      currentId = b.dataset.id;
      closeAllDropdowns();
      handlePostCall(b.dataset.postcall);
    })
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────
function badgeOrigem(o) {
  const map = {
    Instagram: 'instagram', Facebook: 'facebook', Indicação: 'indicacao',
    Google: 'google', WhatsApp: 'whatsapp', Outros: 'outros'
  };
  const cls = map[o] || 'outros';
  return `<span class="badge-origem ${cls}">${esc(o || '—')}</span>`;
}

function badgeStatus(s) {
  const labels = {
    aguardando: 'Aguardando', agendado: 'Agendado',
    realizada: 'Call Realizada', noshow: 'No Show', cancelado: 'Cancelado'
  };
  return `<span class="badge-status ${s || ''}">${labels[s] || '—'}</span>`;
}

function btnAcao(l) {
  const id = l.id;
  const canAgendar  = l.status !== 'cancelado';
  const canRemarcar = l.status === 'agendado' || l.status === 'noshow';
  const isAgendado  = l.status === 'agendado';
  const isRealizada = l.status === 'realizada';

  const opts = [
    canAgendar  ? `<button class="acao-opt opt-agendar"   data-id="${id}" data-action="agendar">📅 Agendar</button>` : '',
                  `<button class="acao-opt opt-qualificar" data-id="${id}" data-action="qualificar">🔍 Qualificar</button>`,
    canRemarcar ? `<button class="acao-opt opt-remarcar"   data-id="${id}" data-action="agendar">🔄 Remarcar</button>` : '',
    isRealizada ? `<button class="acao-opt opt-ver"        data-id="${id}" data-action="ver">📋 Ver detalhes</button>` : '',
    isAgendado  ? `<div class="acao-sep"></div>
                   <button class="acao-opt opt-realizada" data-id="${id}" data-postcall="realizada">✅ Call Realizada</button>
                   <button class="acao-opt opt-noshow"    data-id="${id}" data-postcall="noshow">❌ No Show</button>
                   <button class="acao-opt opt-cancelado" data-id="${id}" data-postcall="cancelado">🚫 Cancelado</button>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="acoes-cell">
      <div class="acoes-wrap" data-leadid="${id}">
        <button class="btn-acao-main" data-id="${id}" data-action="menu">Ações ▾</button>
        <div class="acoes-dropdown">${opts}</div>
      </div>
      <button class="btn-icon btn-editar" data-id="${id}" data-action="editar" title="Editar lead">✏</button>
      <button class="btn-icon btn-excluir" data-id="${id}" data-action="excluir" title="Excluir lead">🗑</button>
    </div>`;
}

function fmtDate(d) {
  if (!d) return '—';
  if (typeof d.toDate === 'function') d = d.toDate().toISOString().slice(0, 10);
  const [y, m, dd] = String(d).split('-');
  return `${dd}/${m}/${y}`;
}

function fmtDateHora(date, hora) {
  if (!date) return '—';
  return hora ? `${fmtDate(date)} · ${hora}` : fmtDate(date);
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── STATS ───────────────────────────────────────────────────────────
function updateStats() {
  const mes  = $('filter-mes').value;
  const base = mes
    ? allLeads.filter(l => (l.datachegada || '').startsWith(mes))
    : allLeads;

  $('stat-total').textContent      = base.length;
  $('stat-aguardando').textContent = base.filter(l => l.status === 'aguardando').length;
  $('stat-agendado').textContent   = base.filter(l => l.status === 'agendado').length;
  $('stat-noshow').textContent     = base.filter(l => l.status === 'noshow').length;
  $('stat-realizada').textContent  = base.filter(l => l.status === 'realizada').length;
  $('stat-vendas').textContent     = base.filter(l => l.venda_realizada === true).length;
}

function updateCount() {
  const t = filteredLeads.length, a = allLeads.length;
  $('results-info').textContent =
    t === a
      ? `${t} lead${t !== 1 ? 's' : ''}`
      : `${t} de ${a} lead${a !== 1 ? 's' : ''}`;
}

// ─── MONTHS FILTER ───────────────────────────────────────────────────
const MONTHS = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function populateMonths() {
  const sel = $('filter-mes');
  const cur = sel.value;
  const months = [...new Set(
    allLeads.filter(l => l.datachegada).map(l => l.datachegada.slice(0, 7))
  )].sort().reverse();

  while (sel.options.length > 1) sel.remove(1);
  months.forEach(m => {
    const [y, mo] = m.split('-');
    sel.appendChild(new Option(`${MONTHS[+mo]} ${y}`, m));
  });
  if (cur) sel.value = cur;
}

// ─── ACTIONS ─────────────────────────────────────────────────────────
function handleAction(id, action) {
  currentId = id;
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  if (action === 'menu') { toggleAcoesDropdown(id); return; }
  closeAllDropdowns();
  if      (action === 'agendar')    openAgendar(lead);
  else if (action === 'qualificar') openPerfil(lead);
  else if (action === 'ver')        verDetalhes(lead);
  else if (action === 'editar')     openNovoLead(lead);
  else if (action === 'excluir')    deleteLead(id);
}

// ─── DELETE ──────────────────────────────────────────────────────────
async function deleteLead(id) {
  if (!confirm('Excluir este lead? Esta ação não pode ser desfeita.')) return;
  try {
    if (isLive) {
      await deleteDoc(doc(db, 'leads', id));
    } else {
      allLeads = allLeads.filter(l => l.id !== id);
      renderAll();
    }
    selectedIds.delete(id);
    updateBulkBar();
    toast('Lead excluído.', 'ok');
  } catch (e) {
    console.error(e);
    toast('Erro ao excluir. Tente novamente.', 'err');
  }
}

// ─── BULK ─────────────────────────────────────────────────────────────
function updateBulkBar() {
  const n   = selectedIds.size;
  const bar = $('bulk-bar');
  bar.style.display = n > 0 ? 'flex' : 'none';
  $('bulk-count').textContent = `${n} selecionado${n !== 1 ? 's' : ''}`;
}

async function bulkDelete() {
  const n = selectedIds.size;
  if (!n) return;
  if (!confirm(`Excluir ${n} lead(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
  try {
    if (isLive) {
      await Promise.all([...selectedIds].map(id => deleteDoc(doc(db, 'leads', id))));
    } else {
      allLeads = allLeads.filter(l => !selectedIds.has(l.id));
      renderAll();
    }
    selectedIds.clear();
    updateBulkBar();
    toast(`${n} lead(s) excluído(s).`, 'ok');
  } catch (e) {
    console.error(e);
    toast('Erro ao excluir. Tente novamente.', 'err');
  }
}

async function bulkChangeStatus() {
  const status = $('bulk-status-sel').value;
  const n = selectedIds.size;
  if (!status || !n) { toast('Selecione um status para aplicar.', 'err'); return; }
  try {
    const now = new Date().toISOString();
    if (isLive) {
      await Promise.all([...selectedIds].map(id =>
        updateDoc(doc(db, 'leads', id), { status, atualizadoem: now })
      ));
    } else {
      selectedIds.forEach(id => {
        const i = allLeads.findIndex(l => l.id === id);
        if (i !== -1) allLeads[i] = { ...allLeads[i], status, atualizadoem: now };
      });
      renderAll();
    }
    toast(`Status atualizado para "${status}" em ${n} lead(s).`, 'ok');
    selectedIds.clear();
    $('bulk-status-sel').value = '';
    updateBulkBar();
  } catch (e) {
    console.error(e);
    toast('Erro ao atualizar status.', 'err');
  }
}

function openAgendar(lead) {
  modalMode = 'agendar';
  cal = { step: 1, closer: null, leadSnap: lead };

  $('modal-title').textContent    = 'Agendar Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;

  $('lead-strip').innerHTML = strip([
    { l:'Origem',   v: lead.origem    || '—' },
    { l:'Profissão',v: lead.profissao || '—' },
    { l:'Renda',    v: lead.renda     || '—' },
    { l:'Chegou em',v: fmtDate(lead.datachegada) },
  ]);

  $('form-resultado').style.display = 'none';
  $('form-agendar').style.display   = 'block';

  schedGoToStep(1);
  openModal();
}


// ─── MODAL PERFIL DO LEAD ────────────────────────────────────────────
function instagramLink(raw) {
  if (!raw) return '—';
  const user = String(raw).replace(/^@/, '').trim();
  if (!user) return '—';
  return `<a href="https://instagram.com/${esc(user)}" target="_blank" rel="noopener noreferrer" style="color:var(--gold)">@${esc(user)}</a>`;
}

function openPerfil(lead) {
  perfilLeadId = lead.id;

  const STATUS_LBL = {
    aguardando: 'Aguardando', agendado: 'Agendado',
    realizada: 'Call Realizada', noshow: 'No Show', cancelado: 'Cancelado'
  };

  $('perfil-title').textContent    = lead.nome || '—';
  $('perfil-subtitle').textContent = STATUS_LBL[lead.status] || lead.status || '—';

  // ── Dados pessoais ──────────────────────────────────────────────────
  const celular = lead.celular || lead.telefone || '—';
  $('perfil-dados').innerHTML = [
    { l: 'Nome',      v: lead.nome      || '—' },
    { l: 'Celular',   v: celular },
    { l: 'E-mail',    v: lead.email     || '—' },
    { l: 'Instagram', v: lead.instagram || null, ig: true },
    { l: 'Profissão', v: lead.profissao || '—' },
    { l: 'Renda',     v: lead.renda     || '—' },
    { l: 'Idade',     v: lead.idade     || '—' },
  ].map(({ l, v, ig }) => `
    <div class="detalhes-item">
      <span class="detalhes-lbl">${esc(l)}</span>
      <span class="detalhes-val">${ig ? instagramLink(v) : esc(v || '—')}</span>
    </div>`).join('');

  // ── Perfil ──────────────────────────────────────────────────────────
  const perfilItems = [
    { l: 'Desafio',           v: lead.desafio      || '' },
    { l: 'Motivação',         v: lead.motivacao    || '' },
    { l: 'Já participou',     v: lead.jaParticipou || '' },
    { l: 'Já é aluna',        v: lead.jaEAluna     || '' },
    { l: 'Tempo que conhece', v: lead.tempoConhece || '' },
    { l: 'De onde conhece',   v: lead.deOnde       || '' },
  ].filter(c => c.v);

  const perfilWrap = $('perfil-perfil-wrap');
  if (perfilItems.length) {
    $('perfil-perfil').innerHTML = perfilItems.map(({ l, v }) => `
      <div class="detalhes-item">
        <span class="detalhes-lbl">${esc(l)}</span>
        <span class="detalhes-val">${esc(v)}</span>
      </div>`).join('');
    perfilWrap.style.display = 'block';
  } else {
    perfilWrap.style.display = 'none';
  }

  // ── Origem ──────────────────────────────────────────────────────────
  const origemItems = [
    { l: 'Origem',       v: lead.origem       || '' },
    { l: 'UTM Campaign', v: lead.utm_campaign || '' },
    { l: 'UTM Medium',   v: lead.utm_medium   || '' },
    { l: 'UTM Content',  v: lead.utm_content  || '' },
    { l: 'UTM Source',   v: lead.utm_source   || '' },
  ].filter(c => c.v);

  const origemWrap = $('perfil-origem-wrap');
  if (origemItems.length) {
    $('perfil-origem').innerHTML = origemItems.map(({ l, v }) => `
      <div class="detalhes-item">
        <span class="detalhes-lbl">${esc(l)}</span>
        <span class="detalhes-val">${esc(v)}</span>
      </div>`).join('');
    origemWrap.style.display = 'block';
  } else {
    origemWrap.style.display = 'none';
  }

  // ── Observações (textarea editável) ────────────────────────────────
  $('perfil-obs').value = lead.observacoes || '';

  // ── Histórico ───────────────────────────────────────────────────────
  const hist = buildHistorico(lead);
  $('perfil-historico').innerHTML = hist.length
    ? hist.map(h => `
      <div class="hist-item">
        <span class="hist-ico">${h.ico}</span>
        <div class="hist-body">
          <div class="hist-label">${esc(h.label)}</div>
          ${h.sub ? `<div class="hist-sub">${esc(h.sub)}</div>` : ''}
        </div>
      </div>`).join('')
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
  try {
    await saveLead(perfilLeadId, { observacoes: obs, atualizadoem: new Date().toISOString() });
    toast('Observações salvas.', 'ok');
  } catch (e) {
    console.error(e);
    toast('Erro ao salvar. Tente novamente.', 'err');
  } finally {
    btn.disabled = false;
  }
}

function buildHistorico(lead) {
  const items = [];

  if (lead.datachegada) {
    items.push({ ico: '◈', label: 'Lead cadastrado', sub: fmtDate(lead.datachegada) });
  }

  if (lead.dataagendamento) {
    const closerName = lead.closer ? (CLOSERS[lead.closer]?.name || lead.closer) : null;
    const sub = [
      `${fmtDate(lead.dataagendamento)}${lead.horaagendamento ? ' às ' + lead.horaagendamento : ''}`,
      closerName ? 'Closer: ' + closerName : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico: '📅', label: 'Call agendada', sub });
  }

  if (lead.status === 'noshow') {
    items.push({ ico: '❌', label: 'No Show registrado', sub: '' });
  } else if (lead.status === 'cancelado') {
    items.push({ ico: '🚫', label: 'Cancelado', sub: '' });
  } else if (lead.status === 'realizada' || lead.realizadaem) {
    const CLOSER_LBL = { followup:'Follow Up', fechamento:'Fechamento', venda_realizada:'Venda Realizada', venda_perdida:'Venda Perdida' };
    const dataCall = lead.realizadaem
      ? new Date(lead.realizadaem).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : fmtDate(lead.dataagendamento);
    const sub = [
      dataCall,
      lead.venda_realizada === true  ? 'Venda realizada' : null,
      lead.venda_realizada === false ? 'Sem venda'        : null,
      lead.valor_venda ? lead.valor_venda : null,
      lead.status_closer ? CLOSER_LBL[lead.status_closer] || lead.status_closer : null,
      lead.temperatura ? lead.temperatura.charAt(0).toUpperCase() + lead.temperatura.slice(1) : null,
    ].filter(Boolean).join(' · ');
    items.push({ ico: '✅', label: 'Call realizada', sub });

    if (lead.obs_call) {
      items.push({ ico: '💬', label: 'Obs. da call', sub: lead.obs_call });
    }
  }

  return items;
}

function verDetalhes(lead) {
  if (lead.status === 'realizada') {
    openDetalhes(lead);
    return;
  }
  const statusLbl = { noshow: 'No Show', cancelado: 'Cancelado' };
  toast(`${lead.nome} — ${statusLbl[lead.status] || lead.status}`, 'ok');
}

function openDetalhes(lead) {
  modalMode = 'detalhes';

  $('modal-title').textContent    = 'Detalhes da Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;
  $('lead-strip').innerHTML = '';

  // Seção 1 — Resultado (pré-preenchido)
  $('form-agendar').style.display   = 'none';
  $('form-resultado').style.display = 'block';

  document.querySelectorAll('#form-resultado .toggle-opt').forEach(b => b.classList.remove('selected'));

  const vendaStr = lead.venda_realizada === true ? 'sim' : lead.venda_realizada === false ? 'nao' : null;
  if (vendaStr) setToggleVal('toggle-venda', vendaStr);

  const temVenda = lead.venda_realizada === true;
  $('campos-venda').style.display = temVenda ? 'block' : 'none';
  $('res-valor-venda').value       = temVenda ? (lead.valor_venda   || '') : '';
  $('res-valor-entrada').value     = temVenda ? (lead.valor_entrada || '') : '';
  if (temVenda && lead.forma_pagamento) setToggleVal('toggle-pagamento', lead.forma_pagamento);

  if (lead.status_closer) setToggleVal('toggle-closer-status', lead.status_closer);
  if (lead.temperatura)   setToggleVal('toggle-temperatura',   lead.temperatura);
  $('res-obs').value = lead.obs_call || '';

  // Seção 2 — Dados do lead (somente leitura)
  $('det-nome').textContent      = lead.nome      || '—';
  $('det-celular').textContent   = lead.celular   || '—';
  $('det-email').textContent     = lead.email     || '—';
  $('det-origem').textContent    = lead.origem    || '—';
  $('det-profissao').textContent = lead.profissao || '—';
  $('det-renda').textContent     = lead.renda     || '—';
  $('det-closer').textContent    = lead.closer ? (CLOSERS[lead.closer]?.name || lead.closer) : '—';

  let dataCall = '—';
  if (lead.realizadaem) {
    dataCall = new Date(lead.realizadaem).toLocaleString('pt-BR', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  } else if (lead.dataagendamento) {
    dataCall = `${fmtDate(lead.dataagendamento)} ${lead.horaagendamento || ''}`.trim();
  }
  $('det-data-call').textContent = dataCall;
  $('form-detalhes').style.display = 'block';

  // Footer
  $('btn-voltar').style.display = 'none';
  const btn = $('btn-confirmar');
  btn.textContent      = 'Salvar Resultado';
  btn.style.display    = '';
  btn.style.background = 'var(--green-bright)';
  btn.style.color      = '#0d1a1c';
  btn.style.border     = 'none';
  btn.disabled         = false;

  openModal();
}

function setToggleVal(groupId, val) {
  const btn = document.querySelector(`#${groupId} .toggle-opt[data-val="${val}"]`);
  if (!btn) return;
  document.querySelectorAll(`#${groupId} .toggle-opt`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function strip(items) {
  return items.map(({ l, v }) => `
    <div class="strip-item">
      <span class="strip-lbl">${esc(l)}</span>
      <span class="strip-val">${esc(v)}</span>
    </div>`).join('');
}

// ─── MODAL OPEN / CLOSE ──────────────────────────────────────────────
function openModal() {
  $('modal-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('btn-confirmar').disabled = false;
}

function closeModal() {
  $('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  currentId = null;
  modalMode = 'agendar';
  cal = { step: 1, closer: null, leadSnap: null };
  $('btn-voltar').style.display     = 'none';
  $('form-resultado').style.display = 'none';
  $('form-detalhes').style.display  = 'none';
  $('form-agendar').style.display   = 'block';
  const btn = $('btn-confirmar');
  btn.style.display    = '';
  btn.style.background = '';
  btn.style.color      = '';
  btn.style.border     = '';
  btn.textContent      = 'Confirmar';
}

// ─── AÇÕES DROPDOWN ──────────────────────────────────────────────────
function closeAllDropdowns() {
  document.querySelectorAll('.acoes-dropdown.open')
    .forEach(d => d.classList.remove('open'));
}

function toggleAcoesDropdown(id) {
  const wrap = document.querySelector(`.acoes-wrap[data-leadid="${id}"]`);
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

  if (action === 'remarcar') {
    openAgendar(lead);
    return;
  }

  if (action === 'realizada') {
    openResultado(lead);
    return;
  }

  const toastMsg = {
    noshow:    `No Show registrado — ${lead.nome}`,
    cancelado: `Cancelamento registrado — ${lead.nome}`
  };

  try {
    await saveLead(currentId, { status: action, atualizadoem: new Date().toISOString() });
    toast(toastMsg[action] || 'Status atualizado.', 'ok');
    closeModal();
  } catch (e) {
    console.error(e);
    toast('Erro ao salvar. Tente novamente.', 'err');
  }
}

// ─── RESULTADO DE CALL ───────────────────────────────────────────────
function openResultado(lead) {
  modalMode = 'resultado';

  $('modal-title').textContent    = 'Resultado da Call';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;

  $('lead-strip').innerHTML = strip([
    { l:'Origem',    v: lead.origem    || '—' },
    { l:'Profissão', v: lead.profissao || '—' },
    { l:'Renda',     v: lead.renda     || '—' },
    { l:'Agendado',  v: lead.dataagendamento ? `${fmtDate(lead.dataagendamento)} ${lead.horaagendamento || ''}`.trim() : '—' },
  ]);

  // reset form
  $('form-agendar').style.display  = 'none';
  $('form-resultado').style.display = 'block';
  $('campos-venda').style.display  = 'none';

  // reset toggles
  document.querySelectorAll('#form-resultado .toggle-opt').forEach(b => b.classList.remove('selected'));

  // reset textareas / inputs
  $('res-obs').value          = '';
  $('res-valor-venda').value  = '';
  $('res-valor-entrada').value = '';

  // configure footer
  $('btn-voltar').style.display = 'none';
  const btn = $('btn-confirmar');
  btn.textContent      = 'Salvar Resultado';
  btn.style.display    = '';
  btn.style.background = 'var(--green-bright)';
  btn.style.color      = '#0d1a1c';
  btn.style.border     = 'none';
  btn.disabled         = false;

  openModal();
}

function toggleSelect(groupId, clickedBtn) {
  document.querySelectorAll(`#${groupId} .toggle-opt`).forEach(b => b.classList.remove('selected'));
  clickedBtn.classList.add('selected');
}

function getToggleVal(groupId) {
  const sel = document.querySelector(`#${groupId} .toggle-opt.selected`);
  return sel ? sel.dataset.val : null;
}

// ─── AGENDAMENTO ─────────────────────────────────────────────────────

function schedGoToStep(n) {
  cal.step = n;
  $('sched-step-1').style.display = n === 1 ? 'block' : 'none';
  $('sched-step-2').style.display = n === 2 ? 'block' : 'none';
  $('btn-voltar').style.display   = n === 2 ? 'inline-flex' : 'none';

  const btn = $('btn-confirmar');
  if (n === 1) {
    btn.style.display = 'none';
  } else {
    btn.textContent        = 'Confirmar Agendamento';
    btn.style.display      = '';
    btn.style.background   = 'var(--gold)';
    btn.style.color        = '#0d1a1c';
    btn.style.border       = 'none';
    btn.disabled           = false;
  }
}

function schedSelectCloser(closer) {
  cal.closer = closer;
  window.open(CLOSERS[closer].calLink, '_blank', 'noopener,noreferrer');
  $('sched-closer-lbl').value = CLOSERS[closer].name;
  $('sched-datetime').value   = '';
  $('sched-obs').value        = '';
  schedGoToStep(2);
}

// ─── CONFIRM ─────────────────────────────────────────────────────────
async function confirmar() {
  if (!currentId) return;

  const btn = $('btn-confirmar');
  btn.disabled = true;

  try {
    if (modalMode === 'agendar') {
      const dtVal = $('sched-datetime').value; // "YYYY-MM-DDTHH:MM"
      if (!dtVal) {
        toast('Preencha a data e hora da call.', 'err');
        btn.disabled = false;
        return;
      }
      const [datePart, timePart] = dtVal.split('T');
      const obs = $('sched-obs').value.trim();

      await saveLead(currentId, {
        status:          'agendado',
        closer:          cal.closer,
        dataagendamento: datePart,
        horaagendamento: timePart,
        observacoes:     obs,
        atualizadoem:    new Date().toISOString()
      });

      toast(`Call agendada com ${CLOSERS[cal.closer].name} — ${timePart} · ${fmtDate(datePart)}`, 'ok');

    } else if (modalMode === 'resultado') {
      const vendaVal    = getToggleVal('toggle-venda');
      const closerSt    = getToggleVal('toggle-closer-status');
      const temperatura = getToggleVal('toggle-temperatura');

      if (!vendaVal) {
        toast('Informe se a venda foi realizada.', 'err');
        btn.disabled = false;
        return;
      }
      if (!closerSt) {
        toast('Selecione o status do closer.', 'err');
        btn.disabled = false;
        return;
      }

      const payload = {
        status:         'realizada',
        venda_realizada: vendaVal === 'sim',
        status_closer:  closerSt,
        obs_call:       $('res-obs').value.trim(),
        realizadaem:    new Date().toISOString(),
        atualizadoem:   new Date().toISOString()
      };

      if (temperatura) payload.temperatura = temperatura;

      if (vendaVal === 'sim') {
        const pagamento = getToggleVal('toggle-pagamento');
        payload.valor_venda   = $('res-valor-venda').value.trim();
        payload.valor_entrada = $('res-valor-entrada').value.trim();
        if (pagamento) payload.forma_pagamento = pagamento;
      }

      const lead = allLeads.find(l => l.id === currentId);
      await saveLead(currentId, payload);
      toast(`Call registrada — ${lead ? lead.nome : ''}`, 'ok');

    } else if (modalMode === 'detalhes') {
      const vendaVal    = getToggleVal('toggle-venda');
      const closerSt    = getToggleVal('toggle-closer-status');
      const temperatura = getToggleVal('toggle-temperatura');

      if (!vendaVal) {
        toast('Informe se a venda foi realizada.', 'err');
        btn.disabled = false;
        return;
      }
      if (!closerSt) {
        toast('Selecione o status do closer.', 'err');
        btn.disabled = false;
        return;
      }

      const payload = {
        venda_realizada: vendaVal === 'sim',
        status_closer:   closerSt,
        obs_call:        $('res-obs').value.trim(),
        atualizadoem:    new Date().toISOString()
      };

      if (temperatura) payload.temperatura = temperatura;

      if (vendaVal === 'sim') {
        const pagamento = getToggleVal('toggle-pagamento');
        payload.valor_venda   = $('res-valor-venda').value.trim();
        payload.valor_entrada = $('res-valor-entrada').value.trim();
        if (pagamento) payload.forma_pagamento = pagamento;
      }

      const lead = allLeads.find(l => l.id === currentId);
      await saveLead(currentId, payload);
      toast(`Resultado atualizado — ${lead ? lead.nome : ''}`, 'ok');

    }

    closeModal();

  } catch (e) {
    console.error(e);
    toast(e.message || 'Erro ao confirmar. Tente novamente.', 'err');
    btn.disabled = false;
  }
}

async function saveLead(id, data) {
  if (isLive) {
    await updateDoc(doc(db, 'leads', id), data);
  } else {
    // local update (demo mode)
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
  $('nl-nome').value      = lead?.nome                          || '';
  $('nl-celular').value   = lead?.celular || lead?.telefone     || '';
  $('nl-email').value     = lead?.email                         || '';
  $('nl-instagram').value = lead?.instagram                     || '';
  $('nl-profissao').value = lead?.profissao                     || '';
  $('nl-renda').value     = lead?.renda                         || '';
  $('nl-origem').value    = lead?.origem                        || '';
  $('nl-obs').value       = lead?.observacoes                   || '';
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
  if (!nome)    { toast('Preencha o nome do lead.', 'err'); return; }
  if (!celular) { toast('Preencha o celular.', 'err'); return; }

  const btn = $('btn-salvar-lead');
  btn.disabled = true;

  const data = {
    nome, celular,
    email:        $('nl-email').value.trim(),
    instagram:    $('nl-instagram').value.trim(),
    profissao:    $('nl-profissao').value.trim(),
    renda:        $('nl-renda').value.trim(),
    origem:       $('nl-origem').value,
    observacoes:  $('nl-obs').value.trim(),
    atualizadoem: new Date().toISOString(),
  };

  try {
    if (novoLeadId) {
      await saveLead(novoLeadId, data);
      toast(`Lead atualizado — ${nome}`, 'ok');
    } else {
      data.status      = 'aguardando';
      data.datachegada = new Date().toISOString().slice(0, 10);
      data.criadoem    = new Date().toISOString();
      if (isLive) {
        await addDoc(collection(db, 'leads'), data);
      } else {
        allLeads.unshift({ id: 'local-' + Date.now(), ...data });
        renderAll();
      }
      toast(`Lead cadastrado — ${nome}`, 'ok');
    }
    closeNovoLead();
  } catch (e) {
    console.error(e);
    toast(e.message || 'Erro ao salvar. Tente novamente.', 'err');
    btn.disabled = false;
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const dock = $('toast-dock');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-ico">${type === 'ok' ? '✓' : '✕'}</span><span>${esc(msg)}</span>`;
  dock.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .25s ease forwards';
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

// ─── EVENTS ──────────────────────────────────────────────────────────
function bindEvents() {
  // filters
  ['filter-origem','filter-mes'].forEach(id =>
    $(id).addEventListener('change', applyFilters)
  );
  $('filter-busca').addEventListener('input', applyFilters);
  $('btn-limpar').addEventListener('click', () => {
    ['filter-origem','filter-mes'].forEach(id => $(id).value = '');
    $('filter-busca').value = '';
    applyFilters();
  });

  // modal controls
  $('modal-close').addEventListener('click', closeModal);
  $('btn-cancelar').addEventListener('click', closeModal);
  $('btn-confirmar').addEventListener('click', confirmar);
  $('modal-backdrop').addEventListener('click', e => {
    if (e.target === $('modal-backdrop')) closeModal();
  });

  // fecha dropdown ao clicar fora
  document.addEventListener('click', e => {
    if (!e.target.closest('.acoes-wrap')) closeAllDropdowns();
  });

  // agendamento: voltar ao passo 1
  $('btn-voltar').addEventListener('click', () => schedGoToStep(1));

  // agendamento: seleção de closer (delegação)
  $('sched-step-1').addEventListener('click', e => {
    const card = e.target.closest('.closer-card');
    if (card) schedSelectCloser(card.dataset.closer);
  });

  // resultado: toggles
  $('form-resultado').addEventListener('click', e => {
    const opt = e.target.closest('.toggle-opt');
    if (!opt) return;
    const group = opt.closest('.toggle-group');
    if (!group) return;
    toggleSelect(group.id, opt);

    // mostrar/ocultar campos financeiros
    if (group.id === 'toggle-venda') {
      $('campos-venda').style.display = opt.dataset.val === 'sim' ? 'block' : 'none';
    }
  });

  // novo lead button
  $('btn-novo-lead').addEventListener('click', () => openNovoLead());

  // select-all checkbox
  $('chk-all').addEventListener('change', e => {
    if (e.target.checked) filteredLeads.forEach(l => selectedIds.add(l.id));
    else                  filteredLeads.forEach(l => selectedIds.delete(l.id));
    updateBulkBar();
    renderTable();
  });

  // bulk bar
  $('btn-bulk-delete').addEventListener('click', bulkDelete);
  $('btn-bulk-status').addEventListener('click', bulkChangeStatus);
  $('btn-bulk-clear').addEventListener('click', () => {
    selectedIds.clear();
    updateBulkBar();
    renderTable();
  });

  // perfil modal
  $('perfil-close').addEventListener('click', closePerfil);
  $('perfil-fechar').addEventListener('click', closePerfil);
  $('btn-salvar-obs').addEventListener('click', salvarObsPerfil);
  $('perfil-backdrop').addEventListener('click', e => {
    if (e.target === $('perfil-backdrop')) closePerfil();
  });

  // novo lead modal
  $('novo-lead-close').addEventListener('click', closeNovoLead);
  $('novo-lead-cancelar').addEventListener('click', closeNovoLead);
  $('btn-salvar-lead').addEventListener('click', confirmarNovoLead);
  $('novo-lead-backdrop').addEventListener('click', e => {
    if (e.target === $('novo-lead-backdrop')) closeNovoLead();
  });

  // tab navigation
  document.querySelectorAll('.nav-link[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // agendamentos tab
  $('btn-gerar-agenda').addEventListener('click', gerarAgendaDoDia);

  // auth buttons
  $('btn-login-google').addEventListener('click', loginWithGoogle);
  $('btn-logout').addEventListener('click', logoutUser);

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePerfil(); closeNovoLead(); }
  });
}

// ─── SHORTHAND ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ─── BOOT ────────────────────────────────────────────────────────────
bindEvents();
initAuth();
