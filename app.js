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
  doc, updateDoc, addDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
let modalMode     = 'agendar'; // 'agendar' | 'realizar'
let db            = null;
let isLive        = false;

// agendamento state
let cal = {
  step:     1,     // 1 | 2
  closer:   null,  // 'fernanda' | 'thomaz'
  leadSnap: null
};

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
      return { id: d.id, ...data };
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

// ─── RENDER PIPELINE ─────────────────────────────────────────────────
function renderAll() {
  // Ordena por datachegada decrescente no cliente (sem precisar de índice no Firestore)
  allLeads.sort((a, b) => (b.datachegada || '').localeCompare(a.datachegada || ''));
  populateMonths();
  applyFilters();
  updateStats();
}

function applyFilters() {
  const origem = $('filter-origem').value;
  const status = $('filter-status').value;
  const mes    = $('filter-mes').value;
  const busca  = $('filter-busca').value.toLowerCase().trim();

  filteredLeads = allLeads.filter(l => {
    if (origem && l.origem  !== origem)         return false;
    if (status && l.status  !== status)         return false;
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
}

// ─── TABLE ───────────────────────────────────────────────────────────
function renderTable() {
  const tbody = $('leads-tbody');
  const empty = $('empty-state');

  if (!filteredLeads.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filteredLeads.map(l => /* html */`
    <tr data-id="${l.id}">
      <td class="cell-nome">${esc(l.nome || '—')}</td>
      <td class="cell-fone">${esc(l.celular || '—')}</td>
      <td>${badgeOrigem(l.origem)}</td>
      <td class="cell-prof">${esc(l.profissao || '—')}</td>
      <td class="cell-renda">${esc(l.renda || '—')}</td>
      <td class="cell-data">${fmtDate(l.datachegada)}</td>
      <td>${badgeStatus(l.status)}</td>
      <td>${btnAcao(l)}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', () => handleAction(b.dataset.id, b.dataset.action))
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
          <div class="card-nome">${esc(l.nome || '—')}</div>
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

  wrap.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', () => handleAction(b.dataset.id, b.dataset.action))
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
  const labels = { aguardando: 'Aguardando', agendado: 'Agendado', realizada: 'Call Realizada' };
  return `<span class="badge-status ${s || ''}">${labels[s] || '—'}</span>`;
}

function btnAcao(l) {
  if (l.status === 'aguardando')
    return `<button class="btn-acao agendar" data-id="${l.id}" data-action="agendar">Agendar</button>`;
  if (l.status === 'agendado')
    return `<button class="btn-acao realizar" data-id="${l.id}" data-action="realizar">Marcar Realizada</button>`;
  return `<button class="btn-acao ver" data-id="${l.id}" data-action="ver">Ver detalhes</button>`;
}

function fmtDate(d) {
  if (!d) return '—';
  if (typeof d.toDate === 'function') d = d.toDate().toISOString().slice(0, 10);
  const [y, m, dd] = String(d).split('-');
  return `${dd}/${m}/${y}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── STATS ───────────────────────────────────────────────────────────
function updateStats() {
  $('stat-total').textContent      = allLeads.length;
  $('stat-aguardando').textContent = allLeads.filter(l => l.status === 'aguardando').length;
  $('stat-agendado').textContent   = allLeads.filter(l => l.status === 'agendado').length;
  $('stat-realizada').textContent  = allLeads.filter(l => l.status === 'realizada').length;
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

  if (action === 'agendar')  openAgendar(lead);
  else if (action === 'realizar') openRealizar(lead);
  else verDetalhes(lead);
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

  $('form-agendar').style.display   = 'block';
  $('form-realizada').style.display = 'none';

  schedGoToStep(1);
  openModal();
}

function openRealizar(lead) {
  modalMode = 'realizar';
  $('modal-title').textContent    = 'Marcar Call Realizada';
  $('modal-subtitle').textContent = `${lead.nome} · ${lead.celular}`;

  $('lead-strip').innerHTML = strip([
    { l:'Data da Call', v: lead.dataagendamento ? fmtDate(lead.dataagendamento) : '—' },
    { l:'Horário',      v: lead.horaagendamento || '—' },
    { l:'Profissão',    v: lead.profissao || '—' },
    { l:'Renda',        v: lead.renda     || '—' },
  ]);

  $('form-agendar').style.display  = 'none';
  $('form-realizada').style.display = 'block';

  const confirm = $('btn-confirmar');
  confirm.textContent = 'Marcar como Realizada';
  confirm.style.cssText = 'background:var(--green-bright);color:#fff';

  $('input-resultado').value  = 'interessado';
  $('input-obs-call').value   = '';

  openModal();
}

function verDetalhes(lead) {
  const resultMap = {
    interessado:     'Interessado — continua no funil',
    nao_interessado: 'Não interessado',
    reagendar:       'Precisa reagendar',
    matriculado:     'Matriculado ✓'
  };
  toast(`${lead.nome} — ${resultMap[lead.resultado] || 'Call realizada'}`, 'ok');
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
  cal = { step: 1, closer: null, leadSnap: null };
  $('btn-voltar').style.display = 'none';
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

    } else {
      const resultado = $('input-resultado').value;
      const obs       = $('input-obs-call').value.trim();
      await saveLead(currentId, {
        status: 'realizada', resultado,
        observacoes_call: obs,
        realizadaem: new Date().toISOString()
      });
      toast('Call marcada como realizada!', 'ok');
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
  ['filter-origem','filter-status','filter-mes'].forEach(id =>
    $(id).addEventListener('change', applyFilters)
  );
  $('filter-busca').addEventListener('input', applyFilters);
  $('btn-limpar').addEventListener('click', () => {
    ['filter-origem','filter-status','filter-mes'].forEach(id => $(id).value = '');
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

  // agendamento: voltar ao passo 1
  $('btn-voltar').addEventListener('click', () => schedGoToStep(1));

  // agendamento: seleção de closer (delegação)
  $('sched-step-1').addEventListener('click', e => {
    const card = e.target.closest('.closer-card');
    if (card) schedSelectCloser(card.dataset.closer);
  });

  // new lead (placeholder)
  $('btn-novo-lead').addEventListener('click', () =>
    toast('Tela de cadastro em breve!', 'ok')
  );

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ─── SHORTHAND ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ─── BOOT ────────────────────────────────────────────────────────────
isLive = initFirebase();
bindEvents();
loadLeads();
