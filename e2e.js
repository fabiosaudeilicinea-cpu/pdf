/* Teste E2E completo da aplicação (Playwright) */
const { chromium } = require('playwright-core');

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { console.log('LAUNCH_FAIL: ' + e.message.split('\n')[0]); process.exit(2); }

  const page = await browser.newPage({ acceptDownloads: true });
  const erros = [];
  page.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE: ' + m.text()); });
  page.on('dialog', d => d.accept());

  await page.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle' });
  // Limpar estado de testes anteriores
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const ok = (nome, cond) => console.log((cond ? 'PASS' : 'FALHA') + ' | ' + nome);

  // ---- 1. Configurações gerais ----
  await page.fill('#cfg-especialidade', 'Otorrinolaringologia');
  await page.fill('#cfg-data', '2026-09-25');
  await page.fill('#cfg-horario', '08:00 – 12:00');
  await page.fill('#cfg-profissional', 'Dra. Maria Silva – UBS Centro');

  // ---- 2. Adicionar pacientes (com máscaras) ----
  for (let i = 1; i <= 4; i++) {
    await page.fill('#pac-nome', `Paciente ${i}`);
    await page.fill('#pac-mae', `Mãe do Paciente ${i}`);
    await page.fill('#pac-nascimento', `199${i}-05-12`);
    await page.fill('#pac-cpf', '12345678901');
    await page.fill('#pac-sus', '712345678901234');
    await page.fill('#pac-telefone', '11999998888');
    await page.fill('#pac-endereco', `Rua das Flores, ${i} - Centro`);
    await page.click('#btn-submit-pac');
  }
  let contador = (await page.textContent('#contador')).trim();
  ok('4 pacientes adicionados', contador === '4');

  const cpfCelula = await page.textContent('#lista-corpo tr:first-child td:nth-child(6)');
  ok('Máscara CPF aplicada (123.456.789-01)', /123\.456\.789-01/.test(cpfCelula));
  const telSalvo = await page.evaluate(() => JSON.parse(localStorage.getItem('lista-atendimento-medico-v1')).pacientes[0].telefone);
  ok('Máscara Telefone aplicada ((11) 99999-8888)', telSalvo === '(11) 99999-8888');

  // ---- 3. Editar ----
  await page.click('#lista-corpo tr:nth-child(2) button[data-act="edit"]');
  const titulo = (await page.textContent('#pac-form-title')).trim();
  ok('Modo edição ativado', /Editar/.test(titulo));
  await page.fill('#pac-nome', 'Paciente 2 EDITADO');
  await page.click('#btn-submit-pac');
  let nomes = await page.evaluate(() => [...document.querySelectorAll('#lista-corpo tr td:nth-child(3) .font-semibold')].map(e => e.textContent.trim()));
  ok('Edição guardada', nomes.includes('Paciente 2 EDITADO'));
  ok('Sem duplicação após editar', nomes.length === 4);

  // ---- 4. Reordenar com setas ----
  await page.click('#lista-corpo tr:first-child button[data-act="down"]');
  nomes = await page.evaluate(() => [...document.querySelectorAll('#lista-corpo tr td:nth-child(3) .font-semibold')].map(e => e.textContent.trim()));
  ok('Seta ▼ reordena (Paciente 1 desceu)', nomes[1] === 'Paciente 1');

  // ---- 5. Remover ----
  await page.click('#lista-corpo tr:last-child button[data-act="del"]');
  await page.waitForTimeout(200);
  contador = (await page.textContent('#contador')).trim();
  ok('Remoção funciona (3 restantes)', contador === '3');

  // ---- 6. Persistência localStorage ----
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('lista-atendimento-medico-v1')));
  ok('Persistência em localStorage', salvo && salvo.pacientes.length === 3 && salvo.config.especialidade === 'Otorrinolaringologia');

  // ---- 7. PDF: poucos pacientes → 1 página ----
  let dlInfo = page.waitForEvent('download', { timeout: 60000 });
  await page.click('#btn-pdf');
  let dl = await dlInfo;
  await dl.saveAs('/tmp/poucos.pdf');
  console.log('DOWNLOAD ok |', dl.suggestedFilename());
  const fs = require('fs');
  const { execSync } = require('child_process');
  const paginasDe = (f) => execSync(`python3 -c "import pypdf;print(len(pypdf.PdfReader('${f}').pages))"`).toString().trim();
  ok('PDF poucos pacientes cabe em 1 página A4', paginasDe('/tmp/poucos.pdf') === '1');

  // ---- 8. PDF: muitos pacientes → distribui proporcionalmente ----
  for (let i = 1; i <= 30; i++) {
    await page.fill('#pac-nome', `Paciente Extra ${String(i).padStart(2, '0')} Nome Completo Longo`);
    await page.fill('#pac-mae', `Responsável ${i} da Silva Souza`);
    await page.fill('#pac-nascimento', '1985-03-20');
    await page.fill('#pac-cpf', '98765432100');
    await page.fill('#pac-sus', '798765432109876');
    await page.fill('#pac-telefone', '21988887777');
    await page.fill('#pac-endereco', `Avenida Brasil, ${i}, Bairro Jardim América, Cidade Grande - UF`);
    await page.click('#btn-submit-pac');
  }
  dlInfo = page.waitForEvent('download', { timeout: 90000 });
  await page.click('#btn-pdf');
  dl = await dlInfo;
  await dl.saveAs('/tmp/muitos.pdf');
  const paginas2 = Number(paginasDe('/tmp/muitos.pdf'));
  ok('PDF com 33 pacientes gerado (' + paginas2 + ' páginas, compactado)', paginas2 >= 1 && paginas2 <= 3);

  // ---- 9. Validações ----
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('#btn-pdf'); // sem especialidade → alert aceite, nenhum download
  await page.waitForTimeout(800);
  ok('Bloqueia PDF sem dados (sem crash)', !erros.some(e => /PAGEERROR/.test(e)));

  console.log('ERROS JS:', erros.length ? erros.join(' || ') : 'nenhum');
  await browser.close();
})();
