// ============================================================
//  FDV LEAD SYNC — Google Apps Script
//  ISCAS e Respondi.app → Firebase Firestore
//
//  Substitui o envio para o Kommo pelo envio direto ao
//  Firestore via REST API (sem OAuth, só apiKey).
// ============================================================

const CONFIG = {
  // Coluna onde a flag ✅/❌ é gravada (letra)
  FLAG_COLUMN_ISCAS:    'Q',   // coluna 17
  FLAG_COLUMN_RESPONDI: 'V',   // coluna 22

  // Mapeamento de colunas — ISCAS
  ISCAS_COLUMNS: {
    origem: 1, data: 2, status: 3, nome: 4, telefone: 5,
    email: 6, instagram: 7, desafio: 8, profissao: 9, renda: 10,
  },

  // Mapeamento de colunas — Respondi.app
  RESPONDI_COLUMNS: {
    origem: 1, data: 2, status: 3, nome: 4, telefone: 5,
    email: 6, instagram: 7, idade: 8, desafio: 9, profissao: 10,
    jaParticipou: 11, jaEAluna: 12, tempoConhece: 13, renda: 14,
    motivacao: 15, deOnde: 16,
  },

  // Firebase
  FIREBASE: {
    projectId:  'faculdade-da-vida',
    apiKey:     'AIzaSyBdcF3cXNmfspkHJfd6MduhVl9s9lU9mDk',
    collection: 'leads',
  },

  // Linhas iniciais de cada aba (ignora histórico antigo)
  START_ROW_ISCAS:    2038,
  START_ROW_RESPONDI: 1153,

  // Valor do campo "status" na planilha que dispara o envio
  STATUS_TRIGGER: 'Qualificado',

  FLAG_OK:  '✅',
  FLAG_ERR: '❌',
};

// ─── ENTRADA PRINCIPAL ───────────────────────────────────────────────
/**
 * Função principal — executada pelo trigger de 5 minutos.
 * Varre as duas abas e envia leads novos ao Firestore.
 */
function syncLeads() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  processSheet(ss, 'ISCAS',        CONFIG.ISCAS_COLUMNS,    CONFIG.FLAG_COLUMN_ISCAS,    'ISCAS',        CONFIG.START_ROW_ISCAS);
  processSheet(ss, 'Respondi.app', CONFIG.RESPONDI_COLUMNS, CONFIG.FLAG_COLUMN_RESPONDI, 'Respondi.app', CONFIG.START_ROW_RESPONDI);
}

// ─── PROCESSAR ABA ───────────────────────────────────────────────────
function processSheet(ss, sheetName, cols, flagCol, fonte, startRow) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Aba "' + sheetName + '" não encontrada — pulando.');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return; // sem linhas de dados na faixa

  const flagColIdx = columnLetterToIndex(flagCol);

  // Lê apenas as linhas a partir de startRow (ignora histórico antigo)
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, flagColIdx).getValues();

  data.forEach(function(row, i) {
    var rowNumber = i + startRow;
    var flagCell  = sheet.getRange(rowNumber, flagColIdx);
    var flag      = String(flagCell.getValue()).trim();

    // Já processado — pula
    if (flag === CONFIG.FLAG_OK || flag === CONFIG.FLAG_ERR) return;

    // Só processa linhas com status "Qualificado"
    var status = String(row[cols.status - 1] || '').trim();
    if (status !== CONFIG.STATUS_TRIGGER) return;

    var lead    = buildLead(row, cols, fonte);
    var success = sendToFirestore(lead);

    flagCell.setValue(success ? CONFIG.FLAG_OK : CONFIG.FLAG_ERR);
    SpreadsheetApp.flush(); // grava imediatamente
  });
}

// ─── MONTAR OBJETO DO LEAD ───────────────────────────────────────────
function buildLead(row, cols, fonte) {
  function get(colNum) {
    return colNum ? String(row[colNum - 1] || '').trim() : '';
  }

  return {
    nome:        get(cols.nome),
    telefone:    get(cols.telefone),
    email:       get(cols.email),
    instagram:   get(cols.instagram),
    profissao:   get(cols.profissao),
    renda:       get(cols.renda),
    origem:      get(cols.origem) || fonte,
    fonte:       fonte,
    status:      'aguardando',
    datachegada: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    criadoem:    new Date().toISOString(),
    // Campos de perfil salvos individualmente (exibidos na seção "Perfil" do app)
    desafio:      cols.desafio      ? get(cols.desafio)      : '',
    idade:        cols.idade        ? get(cols.idade)        : '',
    jaParticipou: cols.jaParticipou ? get(cols.jaParticipou) : '',
    jaEAluna:     cols.jaEAluna     ? get(cols.jaEAluna)     : '',
    tempoConhece: cols.tempoConhece ? get(cols.tempoConhece) : '',
    motivacao:    cols.motivacao    ? get(cols.motivacao)    : '',
    deOnde:       cols.deOnde       ? get(cols.deOnde)       : '',
    observacoes:  '',
  };
}

// ─── ENVIAR AO FIRESTORE ─────────────────────────────────────────────
/**
 * Cria um documento novo na coleção "leads" do Firestore
 * usando a REST API (POST com ID auto-gerado).
 * Retorna true em caso de sucesso, false em caso de erro.
 */
function sendToFirestore(lead) {
  var url = 'https://firestore.googleapis.com/v1/projects/'
    + CONFIG.FIREBASE.projectId
    + '/databases/(default)/documents/'
    + CONFIG.FIREBASE.collection
    + '?key=' + CONFIG.FIREBASE.apiKey;

  var payload = JSON.stringify({ fields: toFirestoreFields(lead) });

  var options = {
    method:           'post',
    contentType:      'application/json',
    payload:          payload,
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code     = response.getResponseCode();

    if (code >= 200 && code < 300) {
      Logger.log('✅ Lead enviado: ' + lead.nome + ' (' + lead.fonte + ')');
      return true;
    } else {
      Logger.log('❌ Erro ' + code + ' ao enviar ' + lead.nome + ': ' + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log('❌ Exceção ao enviar ' + lead.nome + ': ' + e.message);
    return false;
  }
}

// ─── CONVERTER PARA FORMATO FIRESTORE ───────────────────────────────
/**
 * Converte um objeto JS plano para o formato de campos
 * exigido pela REST API do Firestore.
 *
 * Exemplo:
 *   { nome: "Ana" } → { nome: { stringValue: "Ana" } }
 */
function toFirestoreFields(obj) {
  var fields = {};
  Object.keys(obj).forEach(function(key) {
    var val = obj[key];
    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[key] = Number.isInteger(val)
        ? { integerValue: String(val) }
        : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    }
  });
  return fields;
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────
/**
 * Converte letra(s) de coluna para índice numérico 1-based.
 * Ex: "A" → 1, "Q" → 17, "V" → 22, "AA" → 27
 */
function columnLetterToIndex(letters) {
  var result = 0;
  for (var i = 0; i < letters.length; i++) {
    result = result * 26 + letters.toUpperCase().charCodeAt(i) - 64;
  }
  return result;
}

// ─── GERENCIAR TRIGGER ───────────────────────────────────────────────
/**
 * Cria o trigger de 5 minutos para syncLeads.
 * Execute esta função UMA VEZ manualmente no editor do Apps Script.
 * Triggers duplicados são removidos automaticamente antes de criar.
 */
function createTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'syncLeads'; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('syncLeads')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger de 5 minutos criado para syncLeads.');
}

/**
 * Remove todos os triggers de syncLeads (use para pausar a sync).
 */
function deleteTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'syncLeads'; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });

  Logger.log('Triggers de syncLeads removidos.');
}

// ─── TESTE MANUAL ────────────────────────────────────────────────────
/**
 * Executa syncLeads uma vez para testar sem precisar esperar o trigger.
 * Veja o resultado em: Visualizar → Registros de execução
 */
function testSync() {
  syncLeads();
}

// ============================================================
//  COMO USAR — INSTRUÇÕES PARA O GOOGLE APPS SCRIPT
// ============================================================
//
//  1. ABRIR O EDITOR
//     Na planilha Google Sheets: Extensões → Apps Script
//
//  2. COLAR O CÓDIGO
//     Apague o conteúdo padrão de "Código.gs" e cole TODO
//     o conteúdo deste arquivo (sem as linhas de comentário
//     de instrução, se preferir).
//
//  3. SALVAR
//     Ctrl+S (ou ícone de disquete). Nome do projeto: "FDV Sync"
//
//  4. ATIVAR O TRIGGER (executa uma única vez)
//     a) No editor, selecione a função "createTimeTrigger"
//        no menu suspenso ao lado do botão ▶ Executar
//     b) Clique ▶ Executar
//     c) Na primeira execução, o Google pedirá permissão —
//        clique em "Avançado" → "Acessar FDV Sync (não seguro)"
//        e autorize o acesso à planilha e à internet (UrlFetchApp)
//     d) Confirme em "Visualizar → Acionadores" que o trigger
//        aparece com frequência "A cada 5 minutos"
//
//  5. TESTAR SEM ESPERAR
//     Selecione "testSync" e clique ▶ Executar.
//     Veja logs em "Visualizar → Registros de execução".
//
//  6. LÓGICA DE FLAGS
//     - Somente linhas com status "Qualificado" são enviadas
//     - Após envio: coluna Q (ISCAS) ou V (Respondi.app) recebe ✅
//     - Em caso de erro de rede/API: recebe ❌ (será retentado na
//       próxima execução do trigger apenas se a flag for apagada)
//
//  7. PAUSAR A SYNC
//     Execute "deleteTimeTrigger" para remover o trigger.
//     Execute "createTimeTrigger" novamente para reativar.
//
//  8. SEGURANÇA
//     A apiKey do Firebase está embutida no script. As regras
//     do Firestore devem permitir escrita apenas na coleção
//     "leads" — nunca "allow read, write: if true" em produção.
//     Regra recomendada para este caso:
//
//       match /leads/{id} {
//         allow read:  if false;          // leitura só pelo app
//         allow write: if request.auth == null;  // aceita apiKey
//       }
//
//     Ou, enquanto estiver em desenvolvimento:
//       allow read, write: if true;
//
// ============================================================
