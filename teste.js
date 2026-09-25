const { chromium } = require('playwright-core');
(async () => {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.log('LAUNCH_FAIL: ' + e.message.split('\n')[0]);
    process.exit(2);
  }
  const page = await browser.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE: ' + m.text()); });
  await page.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle' }).catch(e => console.log('GOTO: '+e.message));

  // Preencher config
  await page.fill('#cfg-especialidade', 'Otorrinolaringologia');
  await page.fill('#cfg-horario', '08:00 – 12:00');
  await page.fill('#cfg-profissional', 'Dra. Maria Silva');

  // Adicionar 3 pacientes
  for (let i = 1; i <= 3; i++) {
    await page.fill('#pac-nome', `Paciente ${i}`);
    await page.fill('#pac-mae', `Mãe ${i}`);
    await page.fill('#pac-cpf', '12345678901');
    await page.fill('#pac-telefone', '11999998888');
    await page.fill('#pac-endereco', `Rua Teste, ${i}`);
    await page.click('#btn-submit-pac');
  }
  const contador = await page.textContent('#contador');
  console.log('Contador:', contador.trim());
  const cpfMask = await page.inputValue('#lista-corpo tr:first-child td:nth-child(6)').catch(()=>null);

  // Editar primeiro paciente
  await page.click('#lista-corpo tr:first-child button[data-act="edit"]');
  console.log('Titulo edicao:', (await page.textContent('#pac-form-title')).trim());
  await page.fill('#pac-nome', 'Paciente 1 Editado');
  await page.click('#btn-submit-pac');
  console.log('Nome apos edicao:', await page.textContent('#lista-corpo tr:first-child td:nth-child(3) .font-semibold').catch(()=>'?'));

  // Mover para baixo e reordenar
  await page.click('#lista-corpo tr:first-child button[data-act="down"]');
  console.log('Ordem apos down:', await page.$$eval('#lista-corpo tr td.font-semibold', els => els.map(e=>e.textContent)));

  // Remover ultimo
  page.on('dialog', d => d.accept());
  const trs = await page.$$('#lista-corpo tr');
  await trs[trs.length-1].$eval('button[data-act="del"]', b=>b.click());
  console.log('Contador apos remocao:', (await page.textContent('#contador')).trim());

  // Verificar CPF mascarado na tabela
  console.log('Celula CPF/SUS:', (await page.textContent('#lista-corpo tr:first-child td:nth-child(6)')).replace(/\s+/g,' ').trim());

  // Gerar PDF (intercepta download)
  const dlPromise = page.waitForEvent('download', { timeout: 30000 }).catch(()=>null);
  await page.click('#btn-pdf');
  const dl = await dlPromise;
  console.log('Download PDF:', dl ? dl.suggestedFilename() : 'FALHOU/NENHUM');
  if (dl) { const p = '/workspace/teste.pdf'; await dl.saveAs(p); console.log('PDF salvo:', p); }
  console.log('Status:', (await page.textContent('#pdf-status')).trim());

  console.log('ERROS JS:', erros.length ? erros.join(' | ') : 'nenhum');
  await browser.close();
})();
