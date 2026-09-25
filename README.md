# 🩺 Gerador de Listas de Atendimento Médico

Aplicação web **estática** (100% front-end, sem backend) para criar listas/planilhas de
atendimento médico por especialidade e exportá-las em **PDF** formatado (A4).

Pronta para publicação no **Vercel** como projeto estático — não precisa de build.

## ✨ Funcionalidades

- **Configurações gerais**: Especialidade Médica (com sugestões), Data, Horário (opcional) e Profissional/Unidade de Saúde (opcional).
- **Adição de pacientes**: Nome (obrigatório), Nome da Mãe/Responsável, Data de Nascimento, CPF (com máscara), Cartão SUS/CNS, Telefone (com máscara) e Endereço.
- **Gestão da lista**: tabela organizada com botões **Editar**, **Remover**, setas **▲/▼** e **arrastar-e-soltar** (drag & drop) para reordenar.
- **Gerar PDF**: botão destacado que produz um documento limpo e profissional com:
  - Cabeçalho com **Especialidade, Data e Hora** em destaque;
  - **Paginação inteligente**: ajusta espaçamento/tamanho automaticamente para tentar manter todos os registos numa única página A4; se houver muitos pacientes, distribui proporcionalmente por várias páginas sem cortar linhas a meio.
- **Persistência automática** dos dados no navegador (`localStorage`).

## 🛠️ Tecnologias

- HTML5 + JavaScript vanilla
- [Tailwind CSS](https://cdn.tailwindcss.com) (via CDN)
- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) (via CDN)

## 🚀 Executar localmente

Basta abrir o `index.html` num navegador, ou servir a pasta:

```bash
npx --yes serve .
```

## ☁️ Publicar no Vercel

1. Faça push deste repositório para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. Framework preset: **Other** (deixe *Build Command* e *Output Directory* vazios).
4. Clique em **Deploy**. ✅

Alternativa via CLI:

```bash
npm i -g vercel
vercel --prod
```

## 📁 Estrutura

```
├── index.html   # Interface (Tailwind) + área de render do PDF
├── app.js       # Lógica: estado, tabela, ordenação, geração do PDF
└── README.md
```
