const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({acceptDownloads:true});
  p.on('console', m => { if (m.type()==='error') console.log('CONSOLE-ERR:', m.text().slice(0,200)); });
  p.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0,300)));
  p.on('dialog', d=>d.accept());
  await p.goto('http://localhost:8099/index.html', {waitUntil:'networkidle'});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'networkidle'});
  await p.fill('#cfg-especialidade','Otorrinolaringologia');
  for (let i=1;i<=3;i++){ await p.fill('#pac-nome','Paciente '+i); await p.fill('#pac-mae','Mãe '+i); await p.fill('#pac-endereco','Rua X, '+i); await p.click('#btn-submit-pac'); }

  // hook direto no jsPDF de instância criada pelo Worker do html2pdf via Object.getPrototypeOf? 
  // Mais simples: observar o doc final dentro do worker clonado — impossível.
  // Alternativa: reproduzir a medição do app em tempo real com MutationObserver e depois
  // chamar manualmente o pipeline .toPdf() para inspecionar.
  const resumo = await p.evaluate(async () => {
    // recriar exatamente o que gerarPDF faz, mas sem save
    state.config.especialidade = 'Otorrinolaringologia';
    const area = document.getElementById('pdf-area');
    const ALTURA_UTIL = 269*(96/25.4);
    // construir doc como no ramo umaPaginaSó
    const r = {};
    // medir
    area.innerHTML = `<div class="pdf-page"><div class="pdf-header"></div><div class="pdf-meta"></div>${construirTabelaPdfHtml()}<div class="pdf-footer"></div></div>`;
    const medidor = area.querySelector('.pdf-page');
    r.pageScrollH = medidor.scrollHeight;
    r.pageOffsetH = medidor.offsetHeight;
    r.minHeightPx = (297 - 28) * (96/25.4);
    return r;
  });
  console.log('MEDICAO:', JSON.stringify(resumo));

  const dl = p.waitForEvent('download', {timeout:60000}).catch(()=>null);
  await p.click('#btn-pdf');
  const d = await dl;
  if (d) { await d.saveAs('/tmp/poucos.pdf'); console.log('status:', await p.evaluate(()=>document.getElementById('pdf-status').textContent)); }
  await b.close();
})();
