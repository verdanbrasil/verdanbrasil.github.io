# Site institucional VERDAN (versão 2, baseada no protótipo)

Site estático: abre direto no navegador, sem servidor. Nunca mostra preço.

## Arquivos
- `index.html`: cabeçalho, rodapé e estrutura.
- `assets/config.js`: **o único arquivo para editar no dia a dia**. WhatsApp, e-mail, horário, endereço, Instagram, CNPJ e produtos em destaque. Campo vazio = o site esconde aquele item.
- `assets/site.js`: páginas, catálogo, solicitação e mensagem do WhatsApp.
- `assets/site.css`: visual do protótipo + estados (carregando, vazio, falha, sem imagem).
- `assets/img/`, `assets/fontes/`: imagem da estrada, logo, ícones (o mesmo do programa) e a fonte Manrope.
- `favicon.ico`: ícone da aba, copiado do programa (`verdan.ico`).

## Páginas
`#inicio`, `#produtos` (busca, categorias, ordem e página ficam no link), `#produto/<nome>`, `#solicitacao`, `#empresa`, `#como-comprar`, `#contato`, `#privacidade`, `#links` (para a bio do Instagram). Qualquer outro endereço mostra "Página não encontrada".

## Catálogo
1. Banco do programa (Supabase, função `catalogo_publico`): só produtos marcados "No site".
2. Enquanto o banco não tiver produtos marcados, usa a planilha do site de pedidos.
3. Produtos com o mesmo Grupo viram um item com opções (cor, tamanho, voltagem).

## Solicitação
Guarda só códigos e quantidades no navegador. Nome, empresa e observações não ficam guardados. A mensagem abre no WhatsApp (5579998390222) para a pessoa enviar.

## Publicar
Está no repositório público `verdanbrasil/verdanbrasil.github.io`; o GitHub Pages publica o `main` em https://verdanbrasil.github.io.
Endereços: /produtos, /produtos/<nome>, /a-verdan, /como-comprar, /contato, /solicitacao, /privacidade, /links. Links antigos com # continuam funcionando.
A Action "Publicar site" (`.github/workflows/publicar.yml`) roda a cada 3 horas e gera, com `ferramentas/gerar-paginas.mjs`, uma página para cada produto (título, foto e descrição próprios para o Google e para a prévia do link no WhatsApp), o `sitemap.xml` e o `404.html`. Produto novo já abre no site antes disso, pelo `404.html`.

## Dados da empresa
WhatsApp, e-mail, cidade/UF e CNPJ vêm do programa (Cadastros › Empresa), pela função `empresa_publica()` do banco (arquivo `verdan-site/supabase/empresa-publica.sql`, junto no `site-completo.sql`). Horário, Instagram, destaques e "mostrar endereço completo" também vêm de lá quando o programa ganhar esses campos. O `config.js` só vale para o que estiver vazio no programa.

## Testes
`cd testes && NODE_PATH=$(npm root -g) node teste.js` (111 verificações, prints em `testes/prints/`). Usa catálogo e fotos falsos; nada é enviado de verdade.
