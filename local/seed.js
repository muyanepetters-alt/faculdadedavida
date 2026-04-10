/**
 * FDV — Seed Script
 * Insere 5 leads fictícios no Firestore via REST API
 *
 * Uso:
 *   node seed.js
 *
 * Requisitos:
 *   - Node.js 14+ (sem necessidade de npm install)
 *   - Regras do Firestore permitindo escrita (allow write: if true)
 *
 * Se aparecer erro 403 (PERMISSION_DENIED):
 *   Firebase Console → Firestore Database → Regras → publique as regras abaixo:
 *
 *   rules_version = '2';
 *   service cloud.firestore.rules {
 *     match /databases/{database}/documents {
 *       match /leads/{id} {
 *         allow read, write: if true;
 *       }
 *     }
 *   }
 */

'use strict';

const https = require('https');

// ─── CONFIG ──────────────────────────────────────────────────────────
const PROJECT_ID = 'faculdade-da-vida';
const API_KEY    = 'AIzaSyBdcF3cXNmfspkHJfd6MduhVl9s9lU9mDk';
const ENDPOINT   = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/leads?key=${API_KEY}`;

// ─── LEADS DE TESTE ──────────────────────────────────────────────────
const LEADS = [
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
    nome:            'André Lima',
    celular:         '(21) 97345-6789',
    origem:          'Indicação',
    profissao:       'Fisioterapeuta',
    renda:           'R$ 9.000',
    datachegada:     '2026-04-03',
    status:          'agendado',
    dataagendamento: '2026-04-14',
    horaagendamento: '09:00',
    observacoes:     'Indicado pela turma anterior. Muito interessado.',
    criadoem:        new Date().toISOString()
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
    nome:             'Lucas Monteiro',
    celular:          '(41) 95567-8901',
    origem:           'Facebook',
    profissao:        'Coach de Carreira',
    renda:            'R$ 11.000',
    datachegada:      '2026-03-25',
    status:           'realizada',
    resultado:        'matriculado',
    observacoes_call: 'Fechou na hora. Pagamento à vista.',
    realizadaem:      '2026-04-01T15:42:00.000Z',
    criadoem:         new Date().toISOString()
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

// ─── CONVERTE PARA FORMATO FIRESTORE REST ────────────────────────────
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string')  fields[key] = { stringValue: value };
    else if (typeof value === 'number')  fields[key] = { integerValue: String(value) };
    else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
  }
  return fields;
}

// ─── HTTP POST ───────────────────────────────────────────────────────
function postToFirestore(lead) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ fields: toFirestoreFields(lead) });

    const options = {
      hostname: 'firestore.googleapis.com',
      path:     ENDPOINT,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) {
            reject(new Error(json.error?.message || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch {
          reject(new Error(`Resposta inesperada: ${raw}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────
async function main() {
  const line = '─'.repeat(50);

  console.log('');
  console.log(`  FDV — Seed Script`);
  console.log(`  ${line}`);
  console.log(`  Projeto  : ${PROJECT_ID}`);
  console.log(`  Coleção  : leads`);
  console.log(`  Leads    : ${LEADS.length}`);
  console.log(`  ${line}`);
  console.log('');

  let ok = 0;
  let fail = 0;

  for (const lead of LEADS) {
    const label = lead.nome.padEnd(26);
    try {
      const result = await postToFirestore(lead);
      const docId  = result.name.split('/').pop();
      console.log(`  ✅  ${label}  id: ${docId}`);
      ok++;
    } catch (err) {
      console.log(`  ❌  ${label}  erro: ${err.message}`);
      fail++;
    }
  }

  console.log('');
  console.log(`  ${line}`);
  console.log(`  Resultado: ${ok} inseridos, ${fail} erro(s)`);
  console.log('');

  if (fail > 0) {
    console.log('  ⚠️  Erros encontrados. Causas mais comuns:');
    console.log('');
    console.log('  1. Regras do Firestore bloqueando escrita (PERMISSION_DENIED)');
    console.log('     → Firebase Console → Firestore → Regras');
    console.log('     → Substitua o conteúdo por:');
    console.log('');
    console.log('        rules_version = \'2\';');
    console.log('        service cloud.firestore.rules {');
    console.log('          match /databases/{database}/documents {');
    console.log('            match /leads/{id} {');
    console.log('              allow read, write: if true;');
    console.log('            }');
    console.log('          }');
    console.log('        }');
    console.log('');
    console.log('  2. Firestore não foi ativado no projeto');
    console.log('     → Firebase Console → Build → Firestore Database → Criar banco de dados');
    console.log('');
  } else {
    console.log('  ✨ Abra o index.html num servidor HTTP para ver os leads.');
    console.log('     Dica: no VS Code, use a extensão Live Server.');
    console.log('');
  }
}

main().catch(err => {
  console.error('\n  Erro fatal:', err.message);
  process.exit(1);
});
