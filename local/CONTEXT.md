# CONTEXT — FDV Sistema Comercial

> Arquivo de contexto para recuperação rápida em novas sessões do Claude Code.
> Atualizado em: 2026-04-10

---

## O que é o projeto

Sistema comercial interno da **Faculdade da Vida (FDV)** para gestão do funil de vendas:
leads → agendamento de call → resultado da call → fechamento.

- **URL pública:** https://muyanepetters-alt.github.io/faculdadavida
- **Pasta local:** `C:\Users\muyan\FDV\vault\sistema-fdv\`
- **Para rodar localmente:** clique duas vezes em `iniciar.bat` (abre PowerShell + `node server.js` + browser em `localhost:3000`)

---

## Stack

- HTML + CSS + JavaScript puro (sem frameworks)
- Firebase SDK 10 via CDN (Firestore + Google Auth)
- GitHub Pages (hospedagem estática — sem backend próprio)
- Firebase projeto: `faculdade-da-vida`

---

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Toda a estrutura HTML (modais, tabs, kanban, etc.) |
| `app.js` | Toda a lógica JS (Firebase, render, eventos, kanban, relatórios) |
| `style.css` | Estilos (tema escuro, tokens CSS, responsivo) |
| `server.js` | Servidor HTTP local para dev (`node server.js`) |
| `seed.js` | Popula o Firestore com leads de teste (`node seed.js`) |
| `rdm.md` | Backlog de tasks com status atual |
| `iniciar.bat` | Atalho para rodar o servidor e abrir o browser |

---

## Navegação (menu)

```
Agendamentos
  ├── Lista de Leads    (sub-tab padrão)
  ├── Agenda de Hoje
  └── Briefing
Closer             (Kanban)
Relatórios
```

---

## Modelo de dados — lead (Firestore coleção `leads`)

```js
{
  // Dados pessoais
  nome, celular, email, instagram, profissao, renda, idade,

  // Funil
  datachegada,          // "YYYY-MM-DD" — quando entrou
  status,               // "aguardando" | "agendado" | "realizada" | "noshow" | "cancelado"
  etiquetas,            // string[] — ["Super Lead", "Bom", "Neutro", "Frio"] + customizadas

  // Agendamento
  dataagendamento,      // "YYYY-MM-DD"
  horaagendamento,      // "HH:MM"
  closer,               // "fernanda" | "thomaz"
  agendadopor,          // nome do usuário logado que fez o agendamento
  observacoes,          // textarea livre

  // Kanban
  kanban_column,        // controla posição no kanban (independente de status)
                        // valores: agendado | call_realizada | fechamento | followup | venda_ganha | venda_perdida

  // Resultado da call
  status_closer,        // "call_realizada" | "followup" | "fechamento" | "venda_ganha" | "venda_perdida"
  venda_realizada,      // bool
  produto,              // "Comunidade" | "PRM" | "Mentoria Individual" | "Comunidade 6m" | "Comunidade 1a"
  valor_venda,          // string ex: "R$ 3.000"
  formas_pagamento,     // string[] ex: ["cartao", "pix"]
  parcelas,             // number
  tem_entrada,          // bool
  valor_entrada,        // string ex: "R$ 500"
  temperatura,          // "frio" | "morno" | "quente"
  obs_call,             // textarea da call
  realizadaem,          // ISO timestamp

  // UTMs (chegam via Apps Script do Google Forms)
  utm_campaign, utm_medium, utm_content, utm_source,
  origem,               // "Instagram" | "Facebook" | "Indicação" | "Google" | "WhatsApp" | "Outros"

  // Perfil (vem do formulário de qualificação)
  desafio, motivacao, jaParticipou, jaEAluna, tempoConhece, deOnde,

  // Controle
  criadoem, atualizadoem,   // ISO timestamps
}
```

---

## Closers

```js
const CLOSERS = {
  fernanda: { name: 'Fernanda', calLink: 'https://calendar.app.google/hWWi6tVKAhoXg5cUA' },
  thomaz:   { name: 'Thomaz',   calLink: 'https://calendar.app.google/1heVe3395Tsk9GeM8' }
};
```

---

## Kanban

- Colunas padrão salvas em `localStorage` (chave `fdv_kanban_columns`)
- Usuário pode renomear colunas (contenteditable inline) e criar novas (botão "+ Coluna")
- Drag-and-drop nativo HTML5
- Ao mover card: atualiza campo `kanban_column` no Firestore
- Ao salvar resultado: `kanban_column` é atualizado automaticamente com base no `status_closer`

Mapeamento automático (quando `kanban_column` não está definido):
```
status = agendado           → coluna "agendado"
status = realizada
  status_closer = followup  → coluna "followup"
  status_closer = fechamento→ coluna "fechamento"
  venda_realizada = true    → coluna "venda_ganha"
  venda_realizada = false   → coluna "venda_perdida"
  else                      → coluna "call_realizada"
status = noshow/cancelado   → coluna "venda_perdida"
```

---

## Etiquetas

- Campo `etiquetas: string[]` no lead
- Padrão: `['Super Lead', 'Bom', 'Neutro', 'Frio']`
- Editáveis no modal Perfil do Lead
- Visíveis na tabela (até 2), cards mobile e kanban

---

## Funções JS principais em `app.js`

| Função | O que faz |
|---|---|
| `initAuth()` | Inicializa Firebase Auth + modo demo |
| `loadLeads()` | Abre listener `onSnapshot` no Firestore |
| `renderAll()` | Re-renderiza a tela ativa |
| `switchTab(tab)` | Muda a aba principal |
| `switchSub(sub)` | Muda o sub-tab (leads/agenda/briefing) |
| `applyFilters()` | Filtra e renderiza a lista de leads |
| `renderKanban()` | Renderiza o board Kanban com drag-drop |
| `renderRelatorios()` | Calcula e exibe todos os relatórios |
| `renderAgendaSub()` | Sub-tab Agenda de Hoje |
| `renderBriefingSub()` | Sub-tab Briefing (lista de agendados) |
| `openPerfil(lead)` | Abre modal de perfil do lead |
| `openAgendar(lead)` | Abre modal de agendamento (wizard 2 passos) |
| `openResultado(lead)` | Abre modal resultado da call |
| `confirmar()` | Salva agendamento ou resultado |
| `saveLead(id, data)` | Persiste no Firestore (ou local em demo) |
| `toggleEtiqueta(leadId, tag, mode)` | Add/remove etiqueta com save |
| `gerarBriefingLead(lead)` | Copia briefing para clipboard |
| `gerarAgendaDoDia()` | Copia agenda formatada para clipboard |
| `moveLeadToCol(leadId, colId)` | Move card no kanban |
| `addKanbanColumn()` | Adiciona nova coluna via prompt |
| `populateAllMonths()` | Popula todos os selects de mês |
| `toast(msg, type)` | Exibe toast de feedback |

---

## Design System (tokens CSS em `style.css`)

```css
--bg:           #1C2527   /* fundo geral */
--bg-card:      #1e2c2f   /* fundo de cards */
--bg-elevated:  #243135   /* fundo elevado */
--petro:        #0A4751
--petro-bright: #4db5c8   /* azul petróleo claro */
--gold:         #CE9221   /* dourado — cor principal */
--marsala:      #6B2737
--sand:         #DDC79E
--green:        #2E7D62
--green-bright: #4caf8e
--text:         #E4EAEA
--text-muted:   #8fa0a2
--text-dim:     #5c7073
--border:       #2e3f42
```

---

## Modo Demo

Se `firebaseConfig.apiKey === 'YOUR_API_KEY'`, o sistema usa `DEMO` (array local em `app.js`)
sem exigir login. Dados não são persistidos.

---

## Tasks pendentes (ver rdm.md para detalhes)

- Integração Google Sheets — importar leads dos formulários ISCAS/Respondi para Firestore
- Pós-venda — frente futura para alunos
