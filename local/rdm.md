# RDM — Sistema FDV: Tasks Pendentes

> Última atualização: 2026-04-10 — v3 em desenvolvimento

---

## ✅ CONCLUÍDO (v1–v2 — base, kanban, etiquetas, relatórios)

- [x] **Qualificação de lead** — etiquetas (Super Lead, Bom, Neutro, Frio) + personalizadas no perfil
- [x] **Card do lead** — mostra data/hora/closer/agendadopor após agendamento (tabela + card mobile)
- [x] **Status visível no card** — badge de status na tabela e nos cards mobile
- [x] **Tela Closer** — kanban com botão Resultado e No Show em cada card
- [x] **Closer: formato Kanban** — colunas Agendado → Call Realizada → Fechamento → Follow Up → Venda Ganha → Venda Perdida (colunas editáveis e novas colunas)
- [x] **Menu** — unificado: Agendamentos (Lista de Leads, Agenda de Hoje, Briefing), Closer, Relatórios
- [x] **Closer** — responsável pelo agendamento (`agendadopor`) visível no kanban e perfil
- [x] **Produto** — campo com opções (Comunidade, PRM, Mentoria Individual, Comunidade 6m, Comunidade 1a)
- [x] **Forma de pagamento** — múltiplas formas simultâneas, parcelado X vezes, entrada (sim/não + valor)
- [x] **Filtro por mês** — em todas as telas (Lista de Leads, Agenda, Briefing, Kanban, Relatórios)
- [x] **Tela de Resultado de Call** — produto, pagamento multi, entrada, status de negociação
- [x] **Relatórios** — visão geral, faturamento, conversão por closer, por origem
- [x] **iniciar.bat** — atalho para rodar `node server.js` e abrir browser em `localhost:3000`
- [x] **Hot reload** — server SSE com `fs.watch` + inject automático no HTML (sem npm)

---

## ✅ CONCLUÍDO (v3 — redesign + melhorias)

- [x] **Design System v3** — Apple Design × Attio CRM: tokens de superfície (`--s1/s2/s3`), bordas rgba (`--b0–b3`), spring animations, glassmorphism nos modais
- [x] **Briefing WhatsApp** — formato limpo: nome bold, data/dia/hora, closer, contatos com 3 emojis, profissão·renda, desafio. Sem campos vazios, sem duplas linhas em branco
- [x] **Agenda — WhatsApp copy** — formato por closer com ícone, hora, nome e status "Aguardando confirmação"
- [x] **Etiquetas — cores personalizáveis** — pills com gradiente e borda colorida. Padrão: dourado (Super Lead), verde (Bom), petróleo (Neutro), marsala (Frio). Botão ⬤ abre color picker nativo; cor persiste em `localStorage`
- [x] **Etiquetas visíveis na tabela** — coluna dedicada com chips coloridos (até 2 por linha)
- [x] **Timeline do lead** — seção Histórico no modal com linha vertical conectora, badges circulares e sub-texto de data/hora/responsável
- [x] **Obs pós-call no Kanban** — textarea editável no rodapé de cada card, salva no Firebase/demo no blur. Drag bloqueado durante digitação
- [x] **Relatórios — ranking de origem** — barras horizontais com % de conversão colorida (verde ≥50%, dourado ≥25%)
- [x] **Relatórios — comparativo mês a mês** — barras duplas leads × vendas com legenda
- [x] **Relatórios — ticket médio** — por mês na tabela + no summary stats
- [x] **Agenda — mini calendário lateral** — navegação prev/next de mês, dias com calls marcados com ponto, dia selecionado em dourado, clique deseleciona, responsivo (colapsa em mobile)

---

## 🔲 PENDENTE

### Features prioritárias
- [ ] **Integração Google Sheets** — importar leads dos formulários ISCAS/Respondi para o Firestore automaticamente
- [ ] **Notificações de agenda** — lembrete antes da call (push ou WhatsApp via Evolution API)
- [ ] **Busca global** — busca por nome, celular, e-mail direto no header (qualquer tela)

### Features secundárias
- [ ] **Pós-venda** — frente futura para gestão de alunos
- [ ] **Export CSV/Excel** — exportar lista de leads com filtros ativos
- [ ] **Multi-usuário** — controle de acesso por role (admin, closer, SDR)
- [x] **Etiquetas no Kanban** — chips coloridos nos cards do kanban usando `etiquetaChip()` (corrigido junto com item de etiquetas)

---

## NOTAS TÉCNICAS

- `kanban_column` — campo no lead que controla a coluna no kanban (persistido no Firestore)
- `etiquetas: []` — array de strings no lead
- `etiqueta_colors` — cores salvas em `localStorage` (chave `fdv_etiqueta_colors`), não no Firestore
- `agendadopor` — nome do usuário logado no momento do agendamento
- `formas_pagamento: []` — array de métodos (avista, pix, cartao, boleto, parcelado)
- `parcelas: number`, `tem_entrada: bool`, `valor_entrada: string`
- `produto: string`
- `obs_call: string` — observações da call, editável pelo closer direto no kanban
- Colunas do kanban salvas em `localStorage` (chave `fdv_kanban_columns`)
- `agendaCalYear / agendaCalMonth` — estado do mini calendário (em memória, reset ao recarregar)
- Servidor local: `node app/server.js` na porta 3000, hot reload via SSE
