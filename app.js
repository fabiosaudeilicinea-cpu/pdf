/* =========================================================
   Gerador de Listas de Atendimento Médico  (app.js)
   Vanilla JS + Tailwind (CDN) + html2pdf.js
   ========================================================= */

const STORAGE_KEY = 'lista-atendimento-medico-v1';

/* ---------- Estado ---------- */
let state = {
  config: { especialidade: '', data: '', horario: '', profissional: '' },
  pacientes: [] // {id, nome, mae, nascimento, cpf, sus, telefone, endereco}
};
let editingId = null;

/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/* Máscaras com preservação da posição do cursor */
function aplicarMascara(el, fn) {
  const pos = el.selectionEnd;
  const antes = el.value;
  const depois = fn(antes);
  if (antes === depois) return;
  let delta = 0;
  for (let i = 0; i < Math.min(pos, depois.length); i++) {
    if (antes[i] !== depois[i]) delta++;
  }
  el.value = depois;
  try { el.setSelectionRange(Math.max(0, pos + delta), Math.max(0, pos + delta)); } catch (e) {}
}
function mascaraCPF(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  return v.replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function mascaraTelefone(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (!v) return '';
  if (v.length <= 2) return '(' + v;
  if (v.length <= 6) return '(' + v.slice(0, 2) + ') ' + v.slice(2);
  if (v.length <= 10) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
  return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
}

/* ---------- Persistência ---------- */
function salvar() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.pacientes)) state = data;
    }
  } catch (e) {}
}

/* ---------- Ligações do DOM ---------- */
const cfgInputs = {
  especialidade: $('#cfg-especialidade'),
  data: $('#cfg-data'),
  horario: $('#cfg-horario'),
  profissional: $('#cfg-profissional'),
};
const pacInputs = {
  nome: $('#pac-nome'),
  mae: $('#pac-mae'),
  nascimento: $('#pac-nascimento'),
  cpf: $('#pac-cpf'),
  sus: $('#pac-sus'),
  telefone: $('#pac-telefone'),
  endereco: $('#pac-endereco'),
};

Object.entries(cfgInputs).forEach(([k, el]) => {
  el.addEventListener('input', () => { state.config[k] = el.value; salvar(); });
});

// Máscaras em tempo real
pacInputs.cpf.addEventListener('input', e => aplicarMascara(e.target, mascaraCPF));
pacInputs.telefone.addEventListener('input', e => aplicarMascara(e.target, mascaraTelefone));

/* ---------- Formulário de paciente ---------- */
$('#pac-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nome = pacInputs.nome.value.trim();
  if (!nome) { pacInputs.nome.focus(); return; }

  const dados = {
    nome,
    mae: pacInputs.mae.value.trim(),
    nascimento: pacInputs.nascimento.value,
    cpf: pacInputs.cpf.value.trim(),
    sus: pacInputs.sus.value.trim(),
    telefone: pacInputs.telefone.value.trim(),
    endereco: pacInputs.endereco.value.trim(),
  };

  if (editingId) {
    const idx = state.pacientes.findIndex(p => p.id === editingId);
    if (idx >= 0) state.pacientes[idx] = { ...state.pacientes[idx], ...dados };
    sairModoEdicao();
  } else {
    state.pacientes.push({ id: uid(), ...dados });
  }
  limparFormPaciente();
  salvar();
  renderLista();
  pacInputs.nome.focus();
});

function limparFormPaciente() {
  Object.values(pacInputs).forEach(el => el.value = '');
}
function entrarModoEdicao(p) {
  editingId = p.id;
  pacInputs.nome.value = p.nome;
  pacInputs.mae.value = p.mae || '';
  pacInputs.nascimento.value = p.nascimento || '';
  pacInputs.cpf.value = p.cpf || '';
  pacInputs.sus.value = p.sus || '';
  pacInputs.telefone.value = p.telefone || '';
  pacInputs.endereco.value = p.endereco || '';
  $('#pac-form-title').textContent = '✏️ Editar Paciente';
  $('#btn-submit-pac').textContent = '💾 Guardar Alterações';
  $('#btn-cancel-edit').classList.remove('hidden');
  window.scrollTo({ top: $('#pac-form').offsetTop - 80, behavior: 'smooth' });
}
function sairModoEdicao() {
  editingId = null;
  $('#pac-form-title').textContent = '➕ Adicionar Paciente';
  $('#btn-submit-pac').textContent = '➕ Adicionar Paciente';
  $('#btn-cancel-edit').classList.add('hidden');
}
$('#btn-cancel-edit').addEventListener('click', () => {
  limparFormPaciente();
  sairModoEdicao();
});

/* ---------- Renderização da tabela ---------- */
function renderLista() {
  const corpo = $('#lista-corpo');
  corpo.innerHTML = '';
  $('#contador').textContent = state.pacientes.length;
  $('#lista-vazia').style.display = state.pacientes.length ? 'none' : 'block';

  state.pacientes.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-teal-50/50 transition bg-white';
    tr.draggable = true;
    tr.dataset.index = i;

    const linha2 = [
      p.cpf && `CPF: ${esc(p.cpf)}`,
      p.sus && `SUS: ${esc(p.sus)}`,
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');
    const linha3 = [
      p.telefone && `📞 ${esc(p.telefone)}`,
      p.endereco && esc(p.endereco),
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    tr.innerHTML = `
      <td class="px-2 py-2 text-center text-slate-400 font-semibold">${i + 1}</td>
      <td class="px-1 py-2 text-slate-300 cursor-grab select-none" title="Arrastar">⠿</td>
      <td class="px-2 py-2">
        <div class="font-semibold text-slate-800">${esc(p.nome)}</div>
        <div class="text-xs text-slate-500 md:hidden">${esc(p.mae || '')}${p.nascimento ? ' • Nasc.: ' + fmtDataBR(p.nascimento) : ''}</div>
      </td>
      <td class="px-2 py-2 hide-mobile text-slate-600">${esc(p.mae || '—')}</td>
      <td class="px-2 py-2 hide-mobile text-slate-600 whitespace-nowrap">${p.nascimento ? fmtDataBR(p.nascimento) : '—'}</td>
      <td class="px-2 py-2 hide-mobile text-xs text-slate-600 leading-snug">
        ${linha2 || '—'}${linha3 ? '<br>' + linha3 : ''}
      </td>
      <td class="px-2 py-2 hide-mobile text-xs text-slate-600 leading-snug">
        ${[p.telefone, p.endereco].filter(Boolean).map(esc).join('<br>') || '—'}
      </td>
      <td class="px-2 py-2 text-right whitespace-nowrap">
        <button data-act="up" title="Mover para cima" class="p-1.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button data-act="down" title="Mover para baixo" class="p-1.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30" ${i === state.pacientes.length - 1 ? 'disabled' : ''}>▼</button>
        <button data-act="edit" title="Editar" class="p-1.5 rounded hover:bg-amber-100 text-amber-600">✏️</button>
        <button data-act="del" title="Remover" class="p-1.5 rounded hover:bg-rose-100 text-rose-600">🗑️</button>
      </td>`;
    corpo.appendChild(tr);
  });
}

/* Delegação de eventos das ações */
$('#lista-corpo').addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-act]');
  if (!btn) return;
  const tr = btn.closest('tr');
  const i = Number(tr.dataset.index);
  const p = state.pacientes[i];
  if (!p) return;

  switch (btn.dataset.act) {
    case 'up':
      if (i > 0) { [state.pacientes[i - 1], state.pacientes[i]] = [state.pacientes[i], state.pacientes[i - 1]]; }
      break;
    case 'down':
      if (i < state.pacientes.length - 1) { [state.pacientes[i + 1], state.pacientes[i]] = [state.pacientes[i], state.pacientes[i + 1]]; }
      break;
    case 'edit':
      entrarModoEdicao(p);
      return; // não precisa re-render
    case 'del':
      if (!confirm(`Remover o paciente "${p.nome}"?`)) return;
      state.pacientes.splice(i, 1);
      if (editingId === p.id) { sairModoEdicao(); limparFormPaciente(); }
      break;
  }
  salvar();
  renderLista();
});

/* ---------- Drag & Drop ---------- */
let dragIdx = null;
const corpoEl = $('#lista-corpo');

corpoEl.addEventListener('dragstart', (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  dragIdx = Number(tr.dataset.index);
  tr.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});
corpoEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  const tr = e.target.closest('tr');
  if (!tr) return;
  document.querySelectorAll('#lista-corpo tr').forEach(r => r.classList.remove('drag-over'));
  tr.classList.add('drag-over');
});
corpoEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const tr = e.target.closest('tr');
  if (!tr || dragIdx === null) return;
  const alvo = Number(tr.dataset.index);
  if (alvo !== dragIdx) {
    const [movido] = state.pacientes.splice(dragIdx, 1);
    state.pacientes.splice(alvo, 0, movido);
    salvar();
    renderLista();
  }
  dragIdx = null;
});
corpoEl.addEventListener('dragend', () => {
  dragIdx = null;
  document.querySelectorAll('#lista-corpo tr').forEach(r => r.classList.remove('drag-over', 'dragging'));
});

/* =========================================================
   GERAÇÃO DO PDF
   Regra de paginação: o espaçamento/tamanho de fonte é
   ajustado automaticamente para tentar manter TODOS os
   registos numa única página A4. Se mesmo no nível máximo
   de compactação não couberem, a tabela distribui-se
   proporcionalmente por várias páginas (html2pdf divide a
   imagem renderizada em fatias de altura igual a uma
   página), sem margens laterais nem linhas cortadas ao
   meio (page-break-inside: avoid nas linhas).
   ========================================================= */
function validarAntesDoPdf() {
  if (!state.config.especialidade.trim()) { alert('Preencha a Especialidade Médica.'); cfgInputs.especialidade.focus(); return false; }
  if (!state.config.data) { alert('Selecione a Data do Atendimento.'); cfgInputs.data.focus(); return false; }
  if (!state.pacientes.length) { alert('Adicione pelo menos um paciente à lista.'); return false; }
  return true;
}

// Constrói apenas a TABELA do PDF (o cabeçalho/meta/footer ficam fora,
// repetindo-se no topo de cada página quando houver mais do que uma).
function construirTabelaPdfHtml() {
  const col = (v) => `<td class="pdf-detail">${v || '<span class="pdf-vazio">—</span>'}</td>`;
  const linhas = state.pacientes.map((p, i) => `
      <tr>
        <td class="pdf-num">${i + 1}</td>
        <td class="pdf-name">${esc(p.nome)}</td>
        ${col(p.mae ? esc(p.mae) : '')}
        ${col(p.nascimento ? fmtDataBR(p.nascimento) : '')}
        ${col(p.cpf ? esc(p.cpf) : '')}
        ${col(p.sus ? esc(p.sus) : '')}
        ${col(p.telefone ? esc(p.telefone) : '')}
        ${col(p.endereco ? esc(p.endereco) : '')}
      </tr>`).join('');

  return `
    <table class="pdf-table" id="pdf-tabela">
      <thead>
        <tr>
          <th style="width:20px">#</th>
          <th style="width:34mm">Paciente</th>
          <th style="width:30mm">Mãe / Responsável</th>
          <th style="width:18mm">Nascimento</th>
          <th style="width:26mm">CPF</th>
          <th style="width:27mm">Cartão SUS</th>
          <th style="width:25mm">Telefone</th>
          <th>Endereço</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function cabecalhoPdfHtml() {
  const c = state.config;
  return `
    <div class="pdf-header">
      <h1 class="pdf-title">${esc(c.especialidade)}</h1>
      <div class="pdf-sub">Lista / Planilha de Atendimento Médico</div>
    </div>
    <div class="pdf-meta">
      <span><b>Data:</b> ${fmtDataBR(c.data)}</span>
      ${c.horario ? `<span><b>Horário:</b> ${esc(c.horario)}</span>` : ''}
      ${c.profissional ? `<span><b>Profissional/Unidade:</b> ${esc(c.profissional)}</span>` : ''}
      <span><b>Total de pacientes:</b> ${state.pacientes.length}</span>
    </div>`;
}

async function gerarPDF() {
  if (!validarAntesDoPdf()) return;
  const status = $('#pdf-status');
  const btn = $('#btn-pdf');
  btn.disabled = true;
  status.textContent = '⏳ A gerar PDF...';

  const area = $('#pdf-area');
  const agora = new Date();
  const geradoEm = agora.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  // Altura útil de uma página A4 com os nossos paddings (~269mm ≈ 1017px @96dpi)
  const ALTURA_UTIL = 269 * (96 / 25.4);

  /* Níveis de compactação progressiva: tenta caber tudo numa única página.
     Em vez de `zoom`/`transform` (que html2canvas renderiza de forma
     inconsistente), cada nível é um conjunto de regras CSS reais —
     padding e font-size — aplicadas ao documento. */
  const niveis = [
    { nome: 'normal',   css: '' },
    { nome: 'compact',  css: '.pdf-nivel td,.pdf-nivel th{padding:2px 5px!important;font-size:8.5px!important}.pdf-nivel td.pdf-name{font-size:9px!important}' },
    { nome: 'apertado', css: '.pdf-nivel td,.pdf-nivel th{padding:1px 4px!important;font-size:7.5px!important}.pdf-nivel td.pdf-name{font-size:8px!important}.pdf-header{margin-bottom:6px!important}' },
    { nome: 'micro',    css: '.pdf-nivel td,.pdf-nivel th{padding:0 3px!important;font-size:6.5px!important;line-height:1.15!important}.pdf-nivel td.pdf-name{font-size:7px!important}.pdf-header{margin-bottom:4px!important}.pdf-meta{margin-bottom:4px!important;font-size:9px!important}.pdf-footer{margin-top:6px!important}' },
  ];

  // --- Medição: escolher o nível que mantém tudo numa página ---
  let nivelEscolhido = niveis[niveis.length - 1];
  let altTabelaNoNivel = 0;
  let alturaCabecalho = 0;
  {
    const medidorCss = document.createElement('style');
    medidorCss.textContent = niveis.map(n => `.pdf-med-${n.nome} ${n.css.replace(/\.pdf-nivel/g, '*')}`).join('\n');
    document.head.appendChild(medidorCss);
    area.innerHTML = `<div class="pdf-page"><div class="pdf-header"></div><div class="pdf-meta"></div>${construirTabelaPdfHtml()}<div class="pdf-footer"></div></div>`;
    const medidor = area.querySelector('.pdf-page');
    const tabelaMedida = medidor.querySelector('#pdf-tabela');
    alturaCabecalho = medidor.querySelector('.pdf-header').offsetHeight
                    + medidor.querySelector('.pdf-meta').offsetHeight
                    + medidor.querySelector('.pdf-footer').offsetHeight + 40;

    for (const n of niveis) {
      medidor.classList.add('pdf-med-' + n.nome);
      tabelaMedida.classList.add('pdf-nivel');
      const altTabela = tabelaMedida.getBoundingClientRect().height;
      if (alturaCabecalho + altTabela <= ALTURA_UTIL) {
        nivelEscolhido = n; altTabelaNoNivel = altTabela; break;
      }
      nivelEscolhido = n; altTabelaNoNivel = altTabela;
    }
    medidorCss.remove();
    area.innerHTML = ''; // libertar o medidor antes de construir o documento final
  }
  const umaPaginaSó = alturaCabecalho + altTabelaNoNivel <= ALTURA_UTIL;

  // --- Construção final do documento ---
  let doc;
  if (umaPaginaSó) {
    doc = document.createElement('div');
    doc.className = 'pdf-page';
    doc.innerHTML = `${cabecalhoPdfHtml()}${construirTabelaPdfHtml()}
      <div class="pdf-footer">Documento gerado em ${geradoEm} &nbsp;•&nbsp; Assinatura: _________________________________</div>`;
    if (nivelEscolhido.css) {
      const st = document.createElement('style');
      st.textContent = nivelEscolhido.css.replace(/\.pdf-nivel/g, '.pdf-page');
      doc.appendChild(st);
    }
  } else {
    // Muitos pacientes → distribuir proporcionalmente por várias páginas.
    // Com `mode:'css'`, o html2pdf recorta a imagem renderizada em fatias
    // de exatamente uma página A4, mantendo as margens laterais; como
    // calculamos blocos (.pdf-pagina-bloco) com altura ≤ altura útil da
    // página e cada bloco tem page-break-inside: avoid, nenhuma linha é
    // cortada a meio e o conteúdo fica equilibrado entre páginas.
    const nPacientes = state.pacientes.length;
    const altUtilPorPagina = ALTURA_UTIL - alturaCabecalho;
    const numPaginas = Math.max(2, Math.ceil(altTabelaNoNivel / altUtilPorPagina));
    const porPagina = Math.ceil(nPacientes / numPaginas);
    const col = (v) => `<td class="pdf-detail">${v || '<span class="pdf-vazio">—</span>'}</td>`;

    let blocos = '';
    for (let ini = 0; ini < nPacientes; ini += porPagina) {
      const parte = state.pacientes.slice(ini, ini + porPagina);
      const linhasParte = parte.map((p, j) => `
      <tr>
        <td class="pdf-num">${ini + j + 1}</td>
        <td class="pdf-name">${esc(p.nome)}</td>
        ${col(p.mae ? esc(p.mae) : '')}
        ${col(p.nascimento ? fmtDataBR(p.nascimento) : '')}
        ${col(p.cpf ? esc(p.cpf) : '')}
        ${col(p.sus ? esc(p.sus) : '')}
        ${col(p.telefone ? esc(p.telefone) : '')}
        ${col(p.endereco ? esc(p.endereco) : '')}
      </tr>`).join('');
      blocos += `<div class="pdf-pagina-bloco"><table class="pdf-table pdf-nivel">
        <thead>
          <tr>
            <th style="width:20px">#</th>
            <th style="width:34mm">Paciente</th>
            <th style="width:30mm">Mãe / Responsável</th>
            <th style="width:18mm">Nascimento</th>
            <th style="width:26mm">CPF</th>
            <th style="width:27mm">Cartão SUS</th>
            <th style="width:25mm">Telefone</th>
            <th>Endereço</th>
          </tr>
        </thead>
        <tbody>${linhasParte}</tbody>
      </table></div>`;
    }

    doc = document.createElement('div');
    doc.className = 'pdf-page';
    doc.innerHTML = `${cabecalhoPdfHtml()}${blocos}
      <div class="pdf-footer">Documento gerado em ${geradoEm} &nbsp;•&nbsp; Assinatura: _________________________________</div>`;
    const st = document.createElement('style');
    st.textContent = nivelEscolhido.css;
    doc.appendChild(st);
  }

  area.innerHTML = '';
  area.appendChild(doc);

  const nomeFicheiro = `Atendimento_${(state.config.especialidade || 'Geral').replace(/\s+/g, '_')}_${state.config.data}.pdf`;

  try {
    await html2pdf().set({
      name: nomeFicheiro,
      windowWidth: 794,      // largura A4 @96dpi
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] },
    }).from(doc).save();
    status.textContent = '✅ PDF gerado com sucesso!';
  } catch (err) {
    console.error(err);
    status.textContent = '❌ Erro ao gerar PDF. Tente novamente.';
  } finally {
    setTimeout(() => { area.innerHTML = ''; status.textContent = ''; }, 4000);
    btn.disabled = false;
  }
}

$('#btn-pdf').addEventListener('click', gerarPDF);

/* ---------- Limpar tudo ---------- */
$('#btn-limpar').addEventListener('click', () => {
  if (!confirm('Limpar todas as configurações e pacientes?')) return;
  state = { config: { especialidade: '', data: '', horario: '', profissional: '' }, pacientes: [] };
  Object.values(cfgInputs).forEach(el => el.value = '');
  limparFormPaciente();
  sairModoEdicao();
  salvar();
  renderLista();
});

/* ---------- Inicialização ---------- */
function init() {
  carregar();
  cfgInputs.especialidade.value = state.config.especialidade || '';
  cfgInputs.data.value = state.config.data || new Date().toISOString().slice(0, 10);
  state.config.data = cfgInputs.data.value;
  cfgInputs.horario.value = state.config.horario || '';
  cfgInputs.profissional.value = state.config.profissional || '';
  renderLista();
}
init();
