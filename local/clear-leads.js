/**
 * FDV — Clear Leads Script
 * Apaga todos os documentos da coleção "leads" no Firestore.
 *
 * Uso:
 *   node clear-leads.js
 *
 * Requisitos:
 *   - Node.js 14+ (sem npm install)
 *   - Regras do Firestore permitindo escrita (allow write: if true)
 */

'use strict';

const https = require('https');

// ─── CONFIG ──────────────────────────────────────────────────────────
const PROJECT_ID = 'faculdade-da-vida';
const API_KEY    = 'AIzaSyBdcF3cXNmfspkHJfd6MduhVl9s9lU9mDk';
const BASE_PATH  = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── HTTP HELPERS ────────────────────────────────────────────────────
function request(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode === 204 || raw.trim() === '') {
          resolve({});
          return;
        }
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) {
            reject(new Error(json.error?.message || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch {
          reject(new Error(`Resposta inesperada (${res.statusCode}): ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ─── LISTAR TODOS OS DOCUMENTOS (com paginação) ──────────────────────
async function listAllDocs() {
  const docs = [];
  let pageToken = null;

  do {
    const qs = new URLSearchParams({ key: API_KEY, pageSize: 300 });
    if (pageToken) qs.set('pageToken', pageToken);

    const json = await request('GET', `${BASE_PATH}/leads?${qs}`);

    if (json.documents) docs.push(...json.documents);
    pageToken = json.nextPageToken || null;

  } while (pageToken);

  return docs;
}

// ─── APAGAR UM DOCUMENTO ────────────────────────────────────────────
function deleteDoc(docName) {
  // docName: "projects/.../documents/leads/{id}"
  const path = `/v1/${docName}?key=${API_KEY}`;
  return request('DELETE', path);
}

// ─── MAIN ────────────────────────────────────────────────────────────
async function main() {
  const line = '─'.repeat(50);

  console.log('');
  console.log('  FDV — Clear Leads');
  console.log(`  ${line}`);
  console.log(`  Projeto : ${PROJECT_ID}`);
  console.log(`  Coleção : leads`);
  console.log(`  ${line}`);
  console.log('');
  console.log('  Listando documentos…');

  let docs;
  try {
    docs = await listAllDocs();
  } catch (err) {
    console.error(`\n  ❌ Erro ao listar documentos: ${err.message}`);
    process.exit(1);
  }

  if (docs.length === 0) {
    console.log('  ℹ️  Coleção já está vazia. Nada a fazer.');
    console.log('');
    return;
  }

  console.log(`  Encontrados: ${docs.length} documento(s)\n`);

  let ok = 0;
  let fail = 0;

  for (const doc of docs) {
    const id    = doc.name.split('/').pop();
    const label = id.padEnd(24);
    try {
      await deleteDoc(doc.name);
      console.log(`  ✅  ${label}  apagado`);
      ok++;
    } catch (err) {
      console.log(`  ❌  ${label}  erro: ${err.message}`);
      fail++;
    }
  }

  console.log('');
  console.log(`  ${line}`);
  console.log(`  Resultado: ${ok} apagados, ${fail} erro(s)`);
  console.log('');

  if (fail > 0) {
    console.log('  ⚠️  Erros encontrados. Causa mais comum:');
    console.log('     Regras do Firestore bloqueando escrita (PERMISSION_DENIED)');
    console.log('     → Firebase Console → Firestore → Regras → allow write: if true');
    console.log('');
  } else {
    console.log('  ✨ Coleção "leads" esvaziada com sucesso.');
    console.log('');
  }
}

main().catch(err => {
  console.error('\n  Erro fatal:', err.message);
  process.exit(1);
});
