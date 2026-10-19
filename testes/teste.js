// Testa o site institucional com catálogo simulado (banco, planilha, GitHub e fotos falsos).
// Uso: cd nesta pasta && NODE_PATH=$(npm root -g) node teste.js   (gera prints em ./prints)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const SITE = path.resolve(__dirname, '..');
// O site é testado como fica publicado: gerado por ferramentas/gerar-paginas.mjs e servido como o GitHub Pages
// (arquivo, ou arquivo.html, ou 404.html com status 404).
const PUBLICADO = path.join(require('os').tmpdir(), 'verdan-site-teste'); const OUT = path.join(__dirname, 'prints'); fs.mkdirSync(OUT, { recursive: true });
const FOTO = n => `https://nyglymqlyjuyrhqslkzl.supabase.co/storage/v1/object/public/fotos-site/${n}`;
const CATS = ['Iluminação', 'Sinalização', 'Acessórios', 'Buzinas', 'Palhetas'];
const ITENS = [
  { codigo: 101, nome: 'Refletor LED 72W Preto', categoria: 'Iluminação', grupo: 'Refletor LED 72W', cor: 'Preto', voltagem: 'Bivolt', fotos: FOTO('a-led.jpg') + ',' + FOTO('a-white.jpg'), descricao: 'Refletor de LED para uso externo.', disponivel: true },
  { codigo: 102, nome: 'Refletor LED 72W Branco', categoria: 'Iluminação', grupo: 'Refletor LED 72W', cor: 'Branco', voltagem: 'Bivolt', fotos: FOTO('a-white.jpg'), disponivel: false },
  { codigo: 103, nome: 'Lâmpada Âmbar Lateral', categoria: 'Sinalização', fotos: FOTO('a-amber.jpg'), disponivel: true },
  { codigo: 104, nome: 'Kit de Acessórios', categoria: 'Acessórios', fotos: FOTO('a-set.jpg'), disponivel: true },
  { codigo: 105, nome: 'Lanterna Traseira', categoria: 'Sinalização', fotos: '1', disponivel: true },        // nome de arquivo do repo (1.png)
  { codigo: 106, nome: 'Produto sem foto', categoria: 'Acessórios', fotos: '', disponivel: true },
  { codigo: 107, nome: 'Buzina Esgotada', categoria: 'Buzinas', fotos: FOTO('a-set.jpg'), disponivel: false },
  { codigo: 108, nome: 'Foto quebrada', categoria: 'Acessórios', fotos: FOTO('nao-existe.jpg'), disponivel: true },
];
for (let i = 1; i <= 26; i++) ITENS.push({ codigo: 200 + i, nome: `Palheta ${String(i).padStart(2, '0')} polegadas`, categoria: 'Palhetas', fotos: FOTO(['a-led.jpg', 'a-amber.jpg', 'a-set.jpg', 'a-white.jpg'][i % 4]), disponivel: true });
const OK = []; const FALHAS = [];
const ok = (cond, txt) => (cond ? OK : FALHAS).push(txt);

const srv = http.createServer((q, s) => {
  const pedido = decodeURIComponent(q.url.split('?')[0]);
  const tentativas = pedido.endsWith('/') ? [pedido + 'index.html'] : [pedido, pedido + '.html'];
  let f = tentativas.map(t => path.join(PUBLICADO, t)).find(t => t.startsWith(PUBLICADO) && fs.existsSync(t) && fs.statSync(t).isFile());
  let status = 200;
  if (!f) { f = path.join(PUBLICADO, '404.html'); status = 404; }
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
  s.writeHead(status, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
const EMPRESA = { Empresa: 'VERDAN', EmpresaEmail: 'verdanbrasil@gmail.com', EmpresaCidade: 'Itabaiana', EmpresaUF: 'SE', SiteHorario: 'Segunda a sexta, das 8h às 18h', SiteInstagram: '@verdanbrasil' };
const BASE = 'http://127.0.0.1:8123/';

async function pagina(b, { largura = 390, altura = 844, banco = ITENS, planilha = false, reduzir = false, escala, empresa = EMPRESA } = {}) {
  const ctx = await b.newContext({ viewport: { width: largura, height: altura }, reducedMotion: reduzir ? 'reduce' : 'no-preference', deviceScaleFactor: escala || 1, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); p.erros = [];
  p.on('pageerror', e => p.erros.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.erros.push(m.text()); });
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/rpc/empresa_publica')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(empresa) });
    if (u.includes('/rpc/catalogo_publico')) { const d = typeof banco === 'function' ? banco() : banco; if (d === 'erro') return r.fulfill({ status: 500, body: '{}' }); return r.fulfill({ contentType: 'application/json', body: JSON.stringify(d) }); }
    if (u.includes('/fotos-site/')) { const f = path.join(__dirname, 'fotos', u.split('/').pop()); return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: 'image/jpeg' }) : r.fulfill({ status: 404, body: '' }); }
    if (u.includes('docs.google.com')) return planilha ? r.fulfill({ body: planilha, contentType: 'text/csv' }) : r.abort();
    if (u.includes('api.github.com')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(fs.readdirSync('/home/claude/lojistas/imagens').map(n => ({ name: n, type: 'file' }))) });
    if (u.includes('raw.githubusercontent.com')) { const f = path.join('/home/claude/lojistas/imagens', decodeURIComponent(u.split('/imagens/')[1])); return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (u.startsWith('https://wa.me/')) return r.fulfill({ body: 'whatsapp' });
    return r.fulfill({ status: 404, body: '' });
  });
  return p;
}
// Navega dentro do site (como um clique num link), pelo nome antigo da rota.
const caminho = r => '/' + r.replace(/^inicio$/, '').replace(/^empresa$/, 'a-verdan').replace(/^produto\//, 'produtos/');
const ir = async (p, rota, espera = 700) => { await p.evaluate(u => { history.pushState(null, '', u); dispatchEvent(new PopStateEvent('popstate')); }, caminho(rota)); await p.waitForTimeout(espera); };
const texto = (p, s) => p.$eval(s, e => e.innerText).catch(() => '');
const transbordo = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

(async () => {
  // Gera o site publicado com o catálogo de teste, menos o último produto (que fica para o 404.html abrir).
  const arqCat = path.join(require('os').tmpdir(), 'verdan-catalogo-teste.json');
  fs.writeFileSync(arqCat, JSON.stringify(ITENS.slice(0, -1)));
  require('child_process').execFileSync('node', [path.join(SITE, 'ferramentas/gerar-paginas.mjs'), PUBLICADO], { env: { ...process.env, VERDAN_CATALOGO: arqCat }, stdio: 'inherit' });
  await new Promise(r => srv.listen(8123, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // ===== Fluxos principais (celular 390) =====
  let p = await pagina(b);
  await p.goto(BASE); await p.waitForTimeout(1500);
  ok((await p.$$('.category-grid .category')).length === 6, 'início: 5 categorias reais + "Todos"');
  ok((await texto(p, '.category-grid')).includes('26 produtos'), 'início: contagem por categoria');
  ok((await p.$$('#detalhes .product')).length === 8, 'início: 8 destaques com foto');
  ok(!(await p.content()).match(/R\$\s?\d/), 'início: nenhum preço');
  await p.fill('[data-form-busca] input', 'lampada ambar'); await p.press('[data-form-busca] input', 'Enter'); await p.waitForTimeout(600);
  ok(p.url().includes('/produtos?q=lampada'), 'busca da home leva ao catálogo com a busca na URL');
  ok((await p.$$('#results .product')).length === 1 && (await texto(p, '#results')).includes('Lâmpada Âmbar'), 'busca sem acento acha "Lâmpada Âmbar"');
  await p.fill('#catalogSearch', '205'); await p.waitForTimeout(500);
  ok((await texto(p, '#results .product h3')).includes('Palheta 05'), 'busca por código exato vem primeiro');
  await p.fill('#catalogSearch', 'xyzabc'); await p.waitForTimeout(500);
  ok((await texto(p, '#results')).includes('Nenhum produto encontrado'), 'busca vazia mostra estado vazio');
  await p.screenshot({ path: `${OUT}/cel-busca-vazia.png` });
  await p.click('[data-limpar-tudo]'); await p.waitForTimeout(300);
  ok((await texto(p, '#resultCount')).startsWith('33 produtos'), 'limpar tudo volta aos 33 produtos (grupo conta 1)');
  ok((await p.$$('#results .product')).length === 24 && (await p.$$('#paginacao button')).length === 2, 'paginação de 24');
  await p.click('[data-alternar-filtros]'); await p.waitForTimeout(200);
  await p.check('#filters input[value=iluminacao]'); await p.check('#filters input[value=buzinas]'); await p.waitForTimeout(300);
  ok((await p.$$('#results .product')).length === 2, 'filtros combinados (OU na mesma lista)');
  ok(/categoria=(iluminacao,buzinas|buzinas,iluminacao)/.test(decodeURIComponent(p.url())), 'filtros vão para a URL');
  await p.selectOption('#sort', 'nome-desc'); await p.waitForTimeout(200);
  const urlFiltrada = p.url();
  await p.screenshot({ path: `${OUT}/cel-filtros.png` });
  const p2 = await pagina(b); await p2.goto(urlFiltrada); await p2.waitForTimeout(1500);
  ok((await p2.$$('#results .product')).length === 2 && await p2.$eval('#sort', e => e.value) === 'nome-desc' && (await p2.$$('#chips .chip')).length === 2, 'URL filtrada compartilhada abre igual');
  await p2.close();
  await p.click('[data-tirar-cat=buzinas]'); await p.waitForTimeout(200);
  ok((await p.$$('#results .product')).length === 1, 'tirar um chip de filtro');
  await p.click('[data-limpar-filtros]'); await p.waitForTimeout(200);

  // Ficha e volta mantendo a posição
  await ir(p, 'produtos', 1500); await p.$eval('#results .product:nth-child(9) h3 a', e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(300);
  const yLista = await p.evaluate(() => scrollY);
  await p.click('#results .product:nth-child(9) h3 a'); await p.waitForTimeout(700);
  ok(p.url().includes('/produtos/'), 'abre a ficha');
  await p.goBack(); await p.waitForTimeout(700);
  { const yv = await p.evaluate(() => scrollY); ok(Math.abs(yv - yLista) < 40, `voltar mantém a posição da lista (${yLista} → ${yv})`); };

  await ir(p, 'produto/refletor-led-72w');
  ok((await texto(p, '#codigoAtual')).includes('101'), 'ficha com variação começa na opção disponível');
  ok((await p.$$('.galeria-miniaturas button')).length === 2, 'galeria com miniaturas');
  ok((await p.getAttribute('#duvidaProduto', 'href')).includes(encodeURIComponent('cód. 101')), '"Tirar dúvida" leva nome, código e link');
  await p.screenshot({ path: `${OUT}/cel-ficha.png`, fullPage: true });
  await p.click('[data-ampliar]'); await p.waitForTimeout(300);
  ok(await p.$eval('#dialog', d => d.open && d.classList.contains('lightbox')), 'lightbox abre');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  ok((await texto(p, '#lbContador')).startsWith('2 de 2'), 'lightbox anda pelo teclado');
  await p.screenshot({ path: `${OUT}/cel-lightbox.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!(await p.$eval('#dialog', d => d.open)), 'Esc fecha o lightbox');
  await p.click('[data-variacao="102"]'); await p.waitForTimeout(200);
  ok(!!(await p.$('#acaoProduto a.btn')) && !(await p.$('[data-adicionar-ficha]')), 'opção sem disponibilidade troca "Adicionar" por "Consultar"');
  await p.click('[data-variacao="101"]');
  await p.click('[data-qtd="1"]'); await p.click('[data-qtd="1"]');
  await p.click('[data-adicionar-ficha]'); await p.waitForTimeout(200);
  await p.click('[data-adicionar-ficha]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => JSON.parse(localStorage['verdan-solicitacao'])['101']) === 6, 'adicionar o mesmo item duas vezes soma (3+3)');
  ok((await texto(p, '#cartCount')) === '1', 'contador do cabeçalho');
  ok((await texto(p, '#toast')).includes('Ver solicitação'), 'aviso com atalho para a solicitação');

  await ir(p, 'produto/foto-quebrada', 1200);
  ok((await p.$$('.bigimage .sem-imagem')).length === 1, 'foto quebrada vira "Imagem em atualização"');
  await ir(p, 'produto/lanterna-traseira', 1200);
  ok(await p.$eval('.bigimage img', i => i.complete && i.naturalWidth > 0).catch(() => false), 'foto pelo nome do arquivo do repositório (1 → 1.png)');
  await p.click('[data-adicionar-ficha]');
  await ir(p, 'produto/produto-sem-foto');
  await p.click('[data-adicionar-ficha]');
  await ir(p, 'produtos?q=buzina');
  ok((await texto(p, '#results')).includes('Consultar disponibilidade'), 'card sem disponibilidade mostra "Consultar disponibilidade"');

  // Solicitação
  await ir(p, 'solicitacao');
  ok((await p.$$('.cart-row')).length === 3, 'solicitação com 3 itens');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.zap')).display) === 'none', 'botão flutuante some na solicitação');
  await p.click('[data-qtd-item="105"][data-passo="1"]');
  ok(await p.evaluate(() => JSON.parse(localStorage['verdan-solicitacao'])['105']) === 2, 'alterar quantidade na solicitação');
  await p.fill('[data-qtd-input="105"]', '0'); await p.press('[data-qtd-input="105"]', 'Tab'); await p.waitForTimeout(200);
  ok(await p.inputValue('[data-qtd-input="105"]') === '2', 'quantidade inválida é recusada');
  await p.click('[data-remover="106"]'); await p.waitForTimeout(200);
  ok((await p.$$('.cart-row')).length === 2, 'remover item');
  await p.click('#toast button'); await p.waitForTimeout(200);
  ok((await p.$$('.cart-row')).length === 3, 'desfazer remoção');
  await p.fill('#name', 'João Teste'); await p.fill('#company', 'Auto Peças X'); await p.fill('#note', 'Scania R440');
  ok(!(await p.evaluate(() => JSON.stringify(localStorage))).includes('João'), 'nome/empresa não ficam guardados no navegador');
  await p.screenshot({ path: `${OUT}/cel-solicitacao.png`, fullPage: true });
  await p.click('#requestForm button[type=submit]'); await p.waitForTimeout(300);
  const msg = await p.inputValue('#mensagemFinal');
  ok(msg.startsWith('Olá! Gostaria de solicitar um orçamento na VERDAN.') && msg.includes('Nome: João Teste') && msg.includes('Cód. 101 | Quantidade: 6') && msg.trim().endsWith('Podem confirmar disponibilidade, aplicação e condições comerciais?'), 'mensagem no formato da especificação');
  ok(!/R\$|pedido enviado/i.test(msg), 'mensagem sem preço e sem "pedido enviado"');
  await p.screenshot({ path: `${OUT}/cel-previa.png` });
  await p.fill('#mensagemFinal', msg + '\nUrgente'); 
  ok(decodeURIComponent(await p.getAttribute('#continuarZap', 'href')).includes('Urgente'), 'texto editado vai para o WhatsApp');
  ok((await p.getAttribute('#continuarZap', 'href')).startsWith('https://wa.me/5579998390222?text='), 'link do WhatsApp com o número certo');
  await p.click('[data-copiar]'); await p.waitForTimeout(200);
  ok((await p.evaluate(() => navigator.clipboard.readText())).includes('Urgente'), 'copiar mensagem');
  const [zap] = await Promise.all([p.context().waitForEvent('page'), p.click('#continuarZap')]); await zap.close(); await p.waitForTimeout(500);
  ok(!(await p.$eval('#dialog', d => d.open)) && (await p.$$('.cart-row')).length === 3, 'depois do WhatsApp a lista continua');
  await p.reload(); await p.waitForTimeout(1200);
  ok((await p.$$('.cart-row')).length === 3 && (await p.inputValue('#name')) === '', 'recarregar mantém os itens, não o nome');
  await p.click('[data-esvaziar]'); await p.waitForTimeout(200);
  ok((await p.$$('.cart-row')).length === 3, 'esvaziar pede confirmação');
  await p.click('[data-confirmar-esvaziar]'); await p.waitForTimeout(200);
  ok((await texto(p, 'main')).includes('Sua solicitação está vazia'), 'esvaziar após confirmar');

  // Item que saiu do catálogo
  await p.evaluate(() => { localStorage['verdan-solicitacao'] = JSON.stringify({ '103': 1, '999': 2 }); });
  await p.reload(); await p.waitForTimeout(1500);
  ok((await p.$$('.cart-row')).length === 1 && (await texto(p, 'main')).includes('saiu do catálogo'), 'item fora do catálogo é retirado com aviso');

  // Rotas
  for (const r of ['empresa', 'como-comprar', 'contato', 'privacidade', 'links', 'nao-existe', 'produto/nao-existe']) { await ir(p, r); }
  await ir(p, 'nao-existe'); ok((await texto(p, 'main h1')).includes('Página não encontrada'), 'rota inválida mostra 404');
  await ir(p, 'links'); ok(await p.$eval('.header', h => h.hidden), 'Links esconde o cabeçalho');
  await ir(p, 'contato'); ok(!(await p.$eval('.header', h => h.hidden)), 'cabeçalho volta depois de Links');
  ok((await texto(p, 'main')).includes('verdanbrasil@gmail.com') && (await texto(p, 'main')).includes('Segunda a sexta, das 8h às 18h') && (await texto(p, 'main')).includes('Itabaiana - SE'), 'Contato com e-mail, horário e cidade vindos do programa');
  ok(await p.getAttribute('[data-instagram]', 'href') === 'https://instagram.com/verdanbrasil' && !(await p.$eval('[data-instagram]', e => e.hidden)), 'Instagram do programa vira link no rodapé');
  ok(!(await p.content()).includes('PixChave'), 'nada além do público');
  ok(p.erros.length === 0, 'sem erros de JavaScript: ' + p.erros.join(' | '));
  await p.close();

  // ===== Endereços sem # =====
  p = await pagina(b, { largura: 1440, altura: 900 });
  const bruto = await (await p.request.get(BASE + 'produtos/refletor-led-72w')).text();
  ok(bruto.includes('<title>Refletor LED 72W | VERDAN</title>') && bruto.includes('og:image" content="https://') && bruto.includes('canonical" href="https://verdanbrasil.github.io/produtos/refletor-led-72w"'), 'página do produto já vem com título, foto e endereço próprios (Google e prévia do WhatsApp)');
  const mapa = await (await p.request.get(BASE + 'sitemap.xml')).text();
  ok(mapa.includes('/produtos/lampada-ambar-lateral') && !mapa.includes('/solicitacao'), 'sitemap com os produtos');
  ok((await p.request.get(BASE + 'favicon.ico')).ok(), 'ícone da aba publicado');
  await p.goto(BASE + 'produtos/refletor-led-72w'); await p.waitForTimeout(1200);
  ok((await texto(p, 'main h1')).includes('Refletor LED 72W') && await p.title() === 'Refletor LED 72W | VERDAN', 'abrir o endereço do produto direto');
  await p.evaluate(() => { window.semRecarregar = 1; });
  await p.click('.navlinks a[href="/a-verdan"]'); await p.waitForTimeout(500);
  ok(p.url() === BASE + 'a-verdan' && await p.evaluate(() => window.semRecarregar === 1), 'menu troca de página sem recarregar, endereço /a-verdan');
  await p.click('.navlinks a[href="/contato"]'); await p.waitForTimeout(400);
  await p.goBack(); await p.waitForTimeout(400);
  ok(p.url() === BASE + 'a-verdan' && (await texto(p, 'main h1')).includes('Conheça a VERDAN'), 'botão voltar do navegador');
  const ultimo = ITENS[ITENS.length - 1];
  await p.goto(BASE + 'produtos/' + ultimo.nome.toLowerCase().replace(/ /g, '-')); await p.waitForTimeout(1200);
  ok((await texto(p, 'main h1')).includes(ultimo.nome), 'produto novo (ainda sem página gerada) abre pelo 404.html');
  await p.goto(BASE + '#produto/lanterna-traseira'); await p.waitForTimeout(1200);
  ok(p.url() === BASE + 'produtos/lanterna-traseira' && (await texto(p, 'main h1')).includes('Lanterna Traseira'), 'link antigo com # vira o endereço novo');
  await p.goto(BASE + 'qualquer-coisa'); await p.waitForTimeout(800);
  ok((await texto(p, 'main h1')).includes('Página não encontrada') && await p.$eval('meta[name=robots]', m => m.content) === 'noindex', 'endereço inexistente mostra 404 sem ir para o Google');
  ok(p.erros.length === 0, 'endereços: sem erros de JavaScript: ' + p.erros.join(' | '));
  await p.close();

  // ===== Falha de carga e reserva =====
  p = await pagina(b, { banco: 'erro', planilha: false });
  await p.goto(BASE + 'produtos'); await p.waitForTimeout(1500);
  ok((await texto(p, '#results')).includes('Não foi possível carregar'), 'falha na carga mostra aviso com "Tentar novamente"');
  await p.screenshot({ path: `${OUT}/cel-falha.png` });
  await p.close();
  const csv = 'ID,Produto,Categoria,Preço,Imagem (URL)\n1,Lanterna Planilha,Iluminação,10,1\n';
  p = await pagina(b, { banco: [], planilha: csv });
  await p.goto(BASE + 'produtos'); await p.waitForTimeout(1500);
  ok((await texto(p, '#results')).includes('Lanterna Planilha'), 'sem produtos no banco, usa a planilha');
  ok(!(await texto(p, 'main')).includes('10'), 'planilha: preço não aparece');
  await p.close();

  // ===== Larguras, zoom e movimento reduzido =====
  const rotas = ['inicio', 'produtos', 'produto/refletor-led-72w', 'solicitacao', 'empresa', 'como-comprar', 'contato', 'privacidade', 'links'];
  for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    p = await pagina(b, { largura: w, altura: h });
    await p.goto(BASE); await p.waitForTimeout(1200);
    await p.evaluate(() => { localStorage['verdan-solicitacao'] = JSON.stringify({ '101': 2, '104': 1 }); }); await p.reload(); await p.waitForTimeout(1200);
    for (const r of rotas) {
      await ir(p, r, 600);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 40)); } scrollTo({ top: 0, behavior: 'instant' }); });
      await p.waitForTimeout(250);
      const t = await transbordo(p); ok(t <= 0, `${w}px ${r}: sem rolagem lateral (${t})`);
      if ([360, 1440, 768].includes(w)) await p.screenshot({ path: `${OUT}/${w}-${r.replace('/', '_')}.png`, fullPage: true });
    }
    ok(p.erros.length === 0, `${w}px sem erros: ` + p.erros.join(' | '));
    await p.close();
  }
  // Zoom 200% ≈ janela de 640 css px num monitor de 1280
  p = await pagina(b, { largura: 640, altura: 400, escala: 2 });
  await p.goto(BASE); await p.waitForTimeout(1200);
  for (const r of ['inicio', 'produtos', 'produto/refletor-led-72w', 'solicitacao']) { await ir(p, r); const t = await transbordo(p); ok(t <= 0, `zoom 200% ${r}: sem rolagem lateral (${t})`); }
  await p.close();
  p = await pagina(b, { reduzir: true });
  await p.goto(BASE); await p.waitForTimeout(1200);
  await p.evaluate(() => scrollTo(0, 300)); await p.waitForTimeout(200);
  ok(await p.$eval('.hero-scene', e => !e.style.transform) && await p.evaluate(() => !document.body.classList.contains('motion-ready')), 'movimento reduzido: sem parallax nem revelação');
  await p.close();

  // Teclado: pular para o conteúdo
  p = await pagina(b, { largura: 1440, altura: 900 });
  await p.goto(BASE); await p.waitForTimeout(1000);
  await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.activeElement.classList.contains('skip')), 'primeiro Tab vai para "Pular para o conteúdo"');
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); ok(await p.evaluate(() => document.activeElement.id === 'main'), 'pular para o conteúdo funciona');
  await p.close();

  await b.close(); srv.close();
  console.log(`OK ${OK.length}`); FALHAS.forEach(f => console.log('FALHOU: ' + f));
  process.exit(FALHAS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
