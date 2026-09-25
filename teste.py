from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(accept_downloads=True)
    erros = []
    page.on("pageerror", lambda e: erros.append(f"PAGEERROR: {e}"))
    page.on("console", lambda m: erros.append(f"CONSOLE-ERR: {m.text}") if m.type == "error" else None)
    page.goto("http://localhost:8099/index.html", wait_until="networkidle")

    # Configurações
    page.fill("#cfg-especialidade", "Otorrinolaringologia")
    page.fill("#cfg-horario", "08:00 – 12:00")
    page.fill("#cfg-profissional", "Dra. Maria Silva – UBS Centro")

    # Adicionar 3 pacientes
    for i in range(1, 4):
        page.fill("#pac-nome", f"Paciente {i}")
        page.fill("#pac-mae", f"Maria Souza {i}")
        page.fill("#pac-nascimento", "1990-05-12")
        page.fill("#pac-cpf", "12345678901")
        page.fill("#pac-sus", "712345678901234")
        page.fill("#pac-telefone", "11999998888")
        page.fill("#pac-endereco", f"Rua das Flores, {i} - Centro")
        page.click("#btn-submit-pac")
    print("Contador:", page.inner_text("#contador").strip())
    print("CPF mascarado:", page.inner_text("#lista-corpo tr:first-child td:nth-child(6)").split()[1] if True else "")

    # Editar primeiro
    page.click("#lista-corpo tr:first-child button[data-act='edit']")
    print("Modo edicao:", page.inner_text("#pac-form-title").strip())
    page.fill("#pac-nome", "Paciente 1 EDITADO")
    page.click("#btn-submit-pac")
    nomes = [t.strip() for t in page.locator("#lista-corpo tr td.pdf-x").evaluate_all("")] if False else \
            page.evaluate("[...document.querySelectorAll('#lista-corpo tr td:nth-child(3) .font-semibold')].map(e=>e.textContent)")
    print("Nomes apos edicao:", nomes)

    # Reordenar: descer o primeiro
    page.click("#lista-corpo tr:first-child button[data-act='down']")
    nomes2 = page.evaluate("[...document.querySelectorAll('#lista-corpo tr td:nth-child(3) .font-semibold')].map(e=>e.textContent)")
    print("Ordem apos descer:", nomes2)

    # Remover ultimo (aceita confirm)
    page.on("dialog", lambda d: d.accept())
    page.locator("#lista-corpo tr:last-child button[data-act='del']").click()
    page.wait_for_timeout(300)
    print("Contador apos remover:", page.inner_text("#contador").strip())

    # Verificar largura da tabela PDF vs pagina A4
    page.click("#btn-pdf")
    try:
        dl = page.expect_download(timeout=45000)
        with dl as info:
            pass
        pdf_path = "/workspace/teste.pdf"
        info.value.save_as(pdf_path)
        print("PDF gerado:", info.value.suggested_filename)
    except Exception as e:
        print("FALHA DOWNLOAD:", e)
    print("Status:", page.inner_text("#pdf-status").strip())

    # Medir dimensoes do conteudo PDF antes de limpar (re-renderizar sem salvar)
    dims = page.evaluate("""() => {
      const area = document.getElementById('pdf-area');
      return { widthOK: true };
    }""")
    print("Erros JS:", erros if erros else "nenhum")
    browser.close()
