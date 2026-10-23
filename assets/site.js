// VERDAN, site institucional. Navegação por âncoras (#produtos, #produto/<slug>, #solicitacao...),
// catálogo do banco do programa (Supabase) com a planilha como reserva, e solicitação de orçamento
// que segue pelo WhatsApp. Nada aqui confirma compra, preço ou estoque.
(() => {
"use strict";

const C = window.VERDAN_CONFIG || {};
const POR_PAGINA = 24;
const CHAVE_SOLICITACAO = "verdan-solicitacao";
const CHAVE_CATALOGO = "verdan-catalogo-v1";
const CHAVE_IMAGENS = "verdan-lista-imagens";
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ===== Utilidades =====
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = v => String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const slugify = v => norm(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
const icons = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
  light: '<path d="M7 17h10M9 21h6M8 13a6 6 0 118 0l-1 4H9zM12 1v2M2 8l2 1M22 8l-2 1"/>',
  signal: '<path d="M3 20h18L12 3zM12 9v5M12 17h.01"/>',
  tool: '<path d="M14 6a5 5 0 006 6L9 22l-5-5L14 6zM14 6l4 4 3-3"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6M19 6a8 8 0 010 12"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z"/>',
  wiper: '<path d="M3 20l15-15M14 5l5 0M5 20a12 12 0 0115-15"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 6l9 7 9-7"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-4a7 7 0 0114 0v4M17 4a3 3 0 010 6M18 14a5 5 0 014 5"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1121 11.5z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  zoom: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6M10 7v6M7 10h6"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
};
const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[n] || icons.arrow}</svg>`;
function iconeCategoria(nome){
  const n = norm(nome);
  if(/ilumin|farol|lanterna|led/.test(n)) return "light";
  if(/sinaliz/.test(n)) return "signal";
  if(/buzina|som/.test(n)) return "sound";
  if(/corote|reservat/.test(n)) return "drop";
  if(/palheta/.test(n)) return "wiper";
  return "tool";
}

// ===== WhatsApp =====
let temWhatsApp = /^\d{12,13}$/.test(C.whatsapp || "");
function linkWhatsApp(texto){
  return temWhatsApp ? `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(texto)}` : "/contato";
}
function telefoneFormatado(){
  const d = String(C.whatsapp || "").replace(/^55/, "");
  if(d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if(d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return "";
}
const MENSAGEM_GERAL = "Olá! Vim pelo site da VERDAN e gostaria de falar com o comercial.";
function prepararLinksFixos(){
  $$("[data-whatsapp=geral]").forEach(a => {
    a.href = linkWhatsApp(MENSAGEM_GERAL);
    if(temWhatsApp) a.target = "_blank"; else a.removeAttribute("target");
  });
  $$("[data-telefone]").forEach(e => { e.textContent = telefoneFormatado(); });
  $$("[data-email]").forEach(a => { a.hidden = !C.email; a.href = C.email ? `mailto:${C.email}` : "#"; a.textContent = C.email || ""; });
  $$("[data-instagram]").forEach(a => { a.hidden = !C.instagram; a.href = C.instagram || "#"; });
  $$("[data-endereco]").forEach(e => { e.textContent = C.endereco || ""; });
}

// ===== Dados da empresa (Cadastros › Empresa, no programa) =====
// O que vier preenchido no programa vale mais que o config.js; campo vazio no programa mantém o config.
const CHAVE_EMPRESA = "verdan-empresa-v1";
function aplicarEmpresa(d){
  if(!d || typeof d !== "object") return;
  const txt = k => String(d[k] ?? "").trim();
  const zap = txt("EmpresaWhatsApp").replace(/\D/g, "");
  if(zap.length === 10 || zap.length === 11) C.whatsapp = "55" + zap;
  else if(/^55\d{10,11}$/.test(zap)) C.whatsapp = zap;
  if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(txt("EmpresaEmail"))) C.email = txt("EmpresaEmail");
  if(txt("SiteHorario")) C.horario = txt("SiteHorario");
  const insta = txt("SiteInstagram");
  if(insta) C.instagram = /^https?:\/\//i.test(insta) ? insta : `https://instagram.com/${insta.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "")}`;
  // CNPJ só aparece se for um número válido (o programa pode estar com um provisório, ex.: só zeros).
  const cnpj = txt("EmpresaCNPJ").replace(/\D/g, "");
  if(cnpj.length === 14 && !/^(\d)\1+$/.test(cnpj)) C.cnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  const cidade = [txt("EmpresaCidade"), txt("EmpresaUF")].filter(Boolean).join(" - ");
  const rua = [txt("EmpresaEndereco"), txt("EmpresaBairro")].filter(Boolean).join(", ");
  if(cidade) C.endereco = [rua, cidade].filter(Boolean).join(", ") + (txt("EmpresaCEP") ? `, CEP ${txt("EmpresaCEP")}` : "");
  if(txt("SiteDestaques")) C.destaques = txt("SiteDestaques").split(/[,;\s]+/).filter(Boolean);
  temWhatsApp = /^\d{12,13}$/.test(C.whatsapp || "");
  prepararLinksFixos();
}
try{ aplicarEmpresa(JSON.parse(localStorage.getItem(CHAVE_EMPRESA) || "null")); }catch(e){}
async function buscarEmpresa(){
  if(!C.supabaseUrl || !C.supabaseChavePublica) return;
  try{
    const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/empresa_publica`, { method: "POST", headers: { apikey: C.supabaseChavePublica, "Content-Type": "application/json" }, body: "{}" });
    if(!r.ok) return;
    const d = await r.json();
    if(d && typeof d === "object" && !Array.isArray(d)){
      aplicarEmpresa(d);
      try{ localStorage.setItem(CHAVE_EMPRESA, JSON.stringify(d)); }catch(e){}
    }
  }catch(e){}
}
function urlDoProduto(p){
  return `${(C.siteUrl || location.origin).replace(/\/$/, "")}/produtos/${p.slug}`;
}

// ===== Imagens =====
let mapaImagens = null;
async function carregarMapaImagens(){
  try{
    const salvo = JSON.parse(localStorage.getItem(CHAVE_IMAGENS) || "null");
    if(salvo && Date.now() - salvo.em < 30 * 60 * 1000){ mapaImagens = salvo.mapa; return; }
  }catch(e){}
  if(!C.listaImagens) return;
  try{
    const r = await fetch(C.listaImagens);
    if(!r.ok) return;
    const mapa = {};
    (await r.json()).filter(a => a.type === "file").forEach(a => {
      const semExt = a.name.replace(/\.[^.]+$/, "").toLowerCase();
      mapa[a.name.toLowerCase()] = a.name;
      if(!mapa[semExt]) mapa[semExt] = a.name;
    });
    mapaImagens = mapa;
    try{ localStorage.setItem(CHAVE_IMAGENS, JSON.stringify({ em: Date.now(), mapa })); }catch(e){}
  }catch(e){}
}
// A foto pode ser um link completo (enviada pelo painel) ou o nome de um arquivo da pasta imagens/.
function resolverImagem(valor){
  valor = String(valor || "").trim();
  if(!valor) return "";
  if(/^(https?:|data:)/i.test(valor)) return valor;
  const nome = valor.replace(/^imagens\//i, "");
  const achado = mapaImagens && mapaImagens[nome.toLowerCase()];
  const arquivo = achado || (/\.[a-z0-9]{3,4}$/i.test(nome) ? nome : nome + ".png");
  return (C.pastaImagens || "") + encodeURIComponent(arquivo);
}
function semImagem(){
  return `<div class="sem-imagem">${icon("image")}<span>Imagem em atualização</span></div>`;
}
// Sem a lista da pasta, tenta outras extensões antes de desistir da foto.
document.addEventListener("error", ev => {
  const img = ev.target;
  if(!(img instanceof HTMLImageElement) || !img.dataset.produto) return;
  const base = C.pastaImagens || "";
  const exts = [".png", ".jpg", ".jpeg", ".webp"];
  const atual = (img.src.match(/\.(png|jpg|jpeg|webp)$/i) || [""])[0].toLowerCase();
  const prox = exts[exts.indexOf(atual) + 1];
  if(atual && prox && img.src.startsWith(base) && !img.dataset.tentou){
    img.src = img.src.replace(/\.(png|jpg|jpeg|webp)$/i, prox);
    return;
  }
  img.dataset.tentou = "1";
  const caixa = document.createElement("div");
  caixa.innerHTML = semImagem();
  img.replaceWith(caixa.firstChild);
}, true);
function imgProduto(url, alt, extra = ""){
  return url ? `<img src="${esc(url)}" alt="${esc(alt)}" data-produto="1" ${extra}>` : semImagem();
}

// ===== Catálogo =====
// Produto no site = um grupo do programa (as variações do mesmo item juntas).
// Cada variação tem o código do programa, que é o que vai para a solicitação.
let catalogo = { estado: "carregando", produtos: [], porCodigo: new Map(), categorias: [] };

function montarProdutos(linhas){
  const grupos = new Map();
  linhas.forEach(l => {
    if(!l.nome || l.codigo === undefined || l.codigo === null || l.codigo === "") return;
    const chave = norm(l.grupo) || `#${l.codigo}`;
    if(!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(l);
  });
  const slugs = new Set();
  const produtos = [...grupos.values()].map(lista => {
    lista.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "pt-BR", { numeric: true }));
    const nome = (lista[0].grupo || "").trim() || lista[0].nome;
    let slug = slugify(nome);
    if(slugs.has(slug)) slug += "-" + slugify(lista[0].codigo);
    slugs.add(slug);
    const variacoes = lista.map(l => {
      const fotos = String(l.fotos || "").split(",").map(f => resolverImagem(f)).filter(Boolean);
      const rotulo = [l.cor, l.tamanho, l.voltagem].map(v => String(v || "").trim()).filter(Boolean).join(" · ");
      return { codigo: String(l.codigo), nome: l.nome, rotulo, cor: l.cor || "", tamanho: l.tamanho || "", voltagem: l.voltagem || "", fotos, disponivel: l.disponivel !== false };
    });
    const produto = {
      slug, nome,
      categoria: (lista[0].categoria || "").trim() || "Outros",
      descricao: (lista.find(l => (l.descricao || "").trim()) || {}).descricao || "",
      variacoes,
      fotos: [...new Set(variacoes.flatMap(v => v.fotos))],
      disponivel: variacoes.some(v => v.disponivel),
    };
    produto.temVariacao = variacoes.length > 1 || variacoes.some(v => v.rotulo);
    produto.textoBusca = norm([nome, produto.categoria, produto.descricao, ...variacoes.flatMap(v => [v.codigo, v.nome, v.rotulo])].join(" "));
    return produto;
  });
  return produtos;
}
function aplicarCatalogo(produtos, estado){
  const porCodigo = new Map();
  produtos.forEach(p => p.variacoes.forEach(v => porCodigo.set(v.codigo, { produto: p, variacao: v })));
  const contagem = {};
  produtos.forEach(p => { contagem[p.categoria] = (contagem[p.categoria] || 0) + 1; });
  const categorias = Object.keys(contagem)
    .sort((a, b) => contagem[b] - contagem[a] || a.localeCompare(b, "pt-BR"))
    .map(nome => ({ nome, slug: slugify(nome), total: contagem[nome], foto: (produtos.find(p => p.categoria === nome && p.fotos.length) || {}).fotos?.[0] || "" }));
  catalogo = { estado, produtos, porCodigo, categorias };
}
async function buscarDoBanco(){
  if(!C.supabaseUrl || !C.supabaseChavePublica) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try{
    const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/catalogo_publico`, {
      method: "POST", headers: { apikey: C.supabaseChavePublica, "Content-Type": "application/json" }, body: "{}", signal: ctrl.signal,
    });
    if(!r.ok) return [];
    const itens = await r.json();
    return Array.isArray(itens) ? itens.map(i => ({ codigo: i.codigo, nome: i.nome, categoria: i.categoria, descricao: i.descricao, grupo: i.grupo, cor: i.cor, tamanho: i.tamanho, voltagem: i.voltagem, fotos: i.fotos, disponivel: !!i.disponivel })) : [];
  }catch(e){ return []; }
  finally{ clearTimeout(t); }
}
function lerCSV(texto){
  const linhas = []; let campo = "", linha = [], aspas = false;
  for(let i = 0; i < texto.length; i++){
    const c = texto[i];
    if(aspas){
      if(c === '"' && texto[i + 1] === '"'){ campo += '"'; i++; }
      else if(c === '"') aspas = false;
      else campo += c;
    }else if(c === '"') aspas = true;
    else if(c === ","){ linha.push(campo); campo = ""; }
    else if(c === "\n" || c === "\r"){
      if(c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = ""; linhas.push(linha); linha = [];
    }else campo += c;
  }
  if(campo || linha.length){ linha.push(campo); linhas.push(linha); }
  const iCab = linhas.findIndex(l => l.some(c => norm(c) === "produto") && l.some(c => norm(c) === "categoria"));
  if(iCab < 0) return [];
  const cab = linhas[iCab].map(c => norm(c));
  return linhas.slice(iCab + 1).map(l => Object.fromEntries(cab.map((c, i) => [c, (l[i] || "").trim()])));
}
async function buscarDaPlanilha(){
  if(!C.planilhaCsv) return null;
  try{
    const r = await fetch(C.planilhaCsv, { cache: "no-store" });
    if(!r.ok) return null;
    return lerCSV(await r.text()).filter(l => l.produto).map((l, i) => ({
      codigo: l.id || String(i + 1),
      nome: l.produto,
      categoria: l.categoria,
      descricao: l["descricao"] || "",
      fotos: [l["imagem (url)"] || l.imagem, l["imagem 2 (url)"], l["imagem 3 (url)"], l["imagem 4 (url)"], l["imagem 5 (url)"]].filter(Boolean).join(","),
      disponivel: true,
    }));
  }catch(e){ return null; }
}
async function carregarCatalogo(){
  // Mostra a última versão guardada enquanto busca a atual.
  try{
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CATALOGO) || "null");
    if(salvo && Array.isArray(salvo.linhas) && salvo.linhas.length && catalogo.estado === "carregando"){
      aplicarCatalogo(montarProdutos(salvo.linhas), "pronto");
      render(false);
    }
  }catch(e){}
  const [banco] = await Promise.all([buscarDoBanco(), carregarMapaImagens(), buscarEmpresa()]);
  let linhas = banco;
  if(!linhas.length){
    const planilha = await buscarDaPlanilha();
    if(planilha === null && catalogo.estado !== "pronto"){
      aplicarCatalogo([], "falha");
      render(false);
      return;
    }
    linhas = planilha || [];
  }
  if(!linhas.length && catalogo.estado === "pronto"){ render(false); return; } // mantém a versão guardada
  aplicarCatalogo(montarProdutos(linhas), "pronto");
  try{ localStorage.setItem(CHAVE_CATALOGO, JSON.stringify({ em: Date.now(), linhas })); }catch(e){}
  reconciliarSolicitacao();
  render(false);
}

// ===== Solicitação (guarda só códigos e quantidades) =====
let solicitacao = {};
let persistenciaOk = true;
try{
  const salvo = JSON.parse(localStorage.getItem(CHAVE_SOLICITACAO) || "{}");
  if(salvo && typeof salvo === "object" && !Array.isArray(salvo)){
    for(const [k, v] of Object.entries(salvo)) if(Number.isInteger(v) && v >= 1 && v <= 999) solicitacao[k] = v;
  }
}catch(e){ persistenciaOk = false; }
let removidosDoCatalogo = [];
let formulario = { nome: "", empresa: "", obs: "" }; // só em memória, nunca no navegador
function salvarSolicitacao(){
  try{ localStorage.setItem(CHAVE_SOLICITACAO, JSON.stringify(solicitacao)); persistenciaOk = true; }
  catch(e){ persistenciaOk = false; }
  const n = Object.keys(solicitacao).length;
  $("#cartCount").textContent = n;
  $("#cartLink").setAttribute("aria-label", `Ver sua solicitação, ${n} ${n === 1 ? "produto" : "produtos"}`);
}
function reconciliarSolicitacao(){
  if(catalogo.estado !== "pronto") return;
  const fora = Object.keys(solicitacao).filter(k => !catalogo.porCodigo.has(k));
  if(fora.length){
    fora.forEach(k => delete solicitacao[k]);
    removidosDoCatalogo = fora;
    salvarSolicitacao();
  }
}
function adicionar(codigo, qtd = 1){
  qtd = Number(qtd);
  if(!Number.isInteger(qtd) || qtd < 1 || qtd > 999){ aviso("Informe uma quantidade entre 1 e 999."); return; }
  solicitacao[codigo] = Math.min(999, (solicitacao[codigo] || 0) + qtd);
  salvarSolicitacao();
  const n = Object.keys(solicitacao).length;
  aviso(`Produto adicionado à solicitação (${n} ${n === 1 ? "item" : "itens"}).`, { texto: "Ver solicitação", acao: () => navegar("/solicitacao") });
  if(!persistenciaOk) setTimeout(() => aviso("Seu navegador não deixou guardar a lista. Ela fica disponível até você fechar esta página."), 3600);
}

// ===== Avisos, menu e diálogo =====
let timerAviso;
function aviso(texto, botao){
  const el = $("#toast");
  el.replaceChildren(document.createTextNode(texto));
  if(botao){
    const b = document.createElement("button");
    b.type = "button"; b.textContent = botao.texto;
    b.addEventListener("click", () => { el.classList.remove("show"); botao.acao(); });
    el.append(b);
  }
  el.classList.add("show");
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => el.classList.remove("show"), botao ? 6000 : 3500);
}
function alternarMenu(forcar){
  const m = $("#mobileMenu"), b = $("#menuToggle");
  const aberto = forcar === undefined ? !m.classList.contains("open") : forcar;
  m.classList.toggle("open", aberto);
  b.setAttribute("aria-expanded", String(aberto));
  b.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
  document.body.style.overflow = aberto ? "hidden" : "";
}
function abrirDialogo(html, classe = ""){
  const d = $("#dialog");
  if(d.open) d.close();
  d.className = classe;
  $("#dialogContent").innerHTML = html;
  d.showModal();
}
function fecharDialogo(){ const d = $("#dialog"); if(d.open) d.close(); }

// ===== Componentes =====
// Caminho clicável, como a barra de endereço de pastas: cada parte leva até ela.
function crumb(partes){
  const pedacos = ['<a href="/">Início</a>', ...partes.split(" / ")];
  return `<nav class="wrap crumb" aria-label="Caminho"><ol>${pedacos.map((p, i) => `<li>${i === pedacos.length - 1 && !p.startsWith("<a") ? `<span aria-current="page">${p}</span>` : p}</li>`).join("")}</ol></nav>`;
}
function rotuloCodigos(p){
  return p.variacoes.length > 1 ? `${p.variacoes.length} opções` : `Cód. ${esc(p.variacoes[0].codigo)}`;
}
function card(p){
  const v = p.variacoes[0];
  const acao = !p.disponivel
    ? `<a class="btn consulta" href="${esc(linkWhatsApp(`Olá! Gostaria de saber a disponibilidade do produto ${p.nome} (cód. ${p.variacoes.map(x => x.codigo).join(", ")}).\n${urlDoProduto(p)}`))}" target="_blank" rel="noopener">Consultar disponibilidade<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>`
    : p.variacoes.length > 1
      ? `<a class="btn green" href="/produtos/${esc(p.slug)}">Escolher opção ${icon("arrow")}</a>`
      : `<button class="btn green" type="button" data-adicionar="${esc(v.codigo)}">Adicionar à solicitação +</button>`;
  return `<article class="product">
    <a class="product-visual" href="/produtos/${esc(p.slug)}" tabindex="-1" aria-hidden="true">${imgProduto(p.fotos[0], "", 'loading="lazy" width="260" height="250"')}</a>
    <div class="product-body">
      <span class="code">${esc(p.categoria)} / ${rotuloCodigos(p)}</span>
      <h3><a href="/produtos/${esc(p.slug)}">${esc(p.nome)}</a></h3>
      <div class="detail">${p.temVariacao ? esc(p.variacoes.map(x => x.rotulo).filter(Boolean).slice(0, 4).join(", ")) || "Informações na ficha" : "Informações na ficha"}</div>
      <span class="availability${p.disponivel ? "" : " indisponivel"}">${p.disponivel ? "Consulte as condições" : "Sem disponibilidade no momento"}</span>
      ${acao}
    </div>
  </article>`;
}
function cardsCarregando(n){
  return Array.from({ length: n }, () => `<article class="product skeleton" aria-hidden="true"><div class="product-visual"></div><div class="product-body"><div class="linha" style="width:60%"></div><div class="linha"></div><div class="linha" style="width:40%"></div></div></article>`).join("");
}
function cta(){
  return `<section class="cta"><div class="wrap"><div><span class="eyebrow" style="color:#d1ad7c">O PRÓXIMO PASSO É UMA CONVERSA</span><h2>Vamos seguir<br>em movimento?</h2><p>Conte para nossa equipe o que você procura.</p></div><div class="actions"><a class="btn primary" href="${esc(linkWhatsApp(MENSAGEM_GERAL))}" target="_blank" rel="noopener">Conversar no WhatsApp ${icon("arrow")}</a>${C.email ? `<a class="btn outline" href="mailto:${esc(C.email)}">${icon("mail")} Enviar um e-mail</a>` : ""}</div></div></section>`;
}
function destaques(){
  const prontos = catalogo.produtos;
  const escolhidos = (C.destaques || []).map(c => catalogo.porCodigo.get(String(c))?.produto).filter(Boolean);
  const lista = escolhidos.length ? [...new Set(escolhidos)] : prontos.filter(p => p.disponivel && p.fotos.length);
  return lista.slice(0, 8);
}

// ===== Páginas =====
function picEstrada(alt, attrs){
  return `<picture><source type="image/webp" srcset="/assets/img/estrada-800.webp 800w, /assets/img/estrada-1280.webp 1280w, /assets/img/estrada-1672.webp 1672w" sizes="100vw"><img src="/assets/img/estrada-1280.jpg" srcset="/assets/img/estrada-800.jpg 800w, /assets/img/estrada-1280.jpg 1280w, /assets/img/estrada-1672.jpg 1672w" sizes="100vw" alt="${esc(alt)}" ${attrs}></picture>`;
}
function home(){
  const carregando = catalogo.estado === "carregando";
  const cats = catalogo.categorias.slice(0, 5);
  const lista = destaques();
  const blocoCategorias = carregando
    ? `<div class="category-grid">${Array.from({ length: 3 }, () => `<div class="category" aria-hidden="true"><div style="width:100%"><div class="linha" style="height:14px;background:#e3e7df;width:50%;margin-bottom:8px"></div><div class="linha" style="height:10px;background:#e8ebe4;width:70%"></div></div></div>`).join("")}</div>`
    : `<div class="category-grid reveal">${cats.map(c => `<a class="category" href="/produtos?categoria=${esc(c.slug)}">${icon(iconeCategoria(c.nome))}<div><h3>${esc(c.nome)}</h3><small>${c.total} ${c.total === 1 ? "produto" : "produtos"}</small></div><span class="arrow"><svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></span></a>`).join("")}<a class="category" href="/produtos">${icon("tool")}<div><h3>Todos os acessórios</h3><small>Seu próximo passo está aqui</small></div><span class="arrow"><svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></span></a></div>`;
  const blocoDestaques = carregando
    ? `<div class="grid">${cardsCarregando(4)}</div>`
    : `<div class="grid reveal">${lista.map(card).join("")}</div>`;
  const pontes = catalogo.categorias.slice(0, 2);
  return `<section class="hero-cinema">
    <div class="hero-scene">${picEstrada("Caminhão com a marca VERDAN numa estrada ao entardecer. Cena conceitual.", 'width="1672" height="941" fetchpriority="high"')}</div>
    <div class="hero-shade"></div>
    <div class="wrap"><div class="hero-copy">
      <span class="eyebrow">ACESSÓRIOS PARA LINHA PESADA</span>
      <h1>Acessórios de <br>qualidade para <br>quem <em>move o Brasil.</em></h1>
      <p>Encontre acessórios para o trabalho na estrada e conte com nossa equipe para orientar sua escolha.</p>
      <div class="actions"><a class="btn primary" href="/produtos">Explorar produtos ${icon("arrow")}</a><a class="btn outline" href="${esc(linkWhatsApp(MENSAGEM_GERAL))}" target="_blank" rel="noopener">Falar com a VERDAN<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div>
    </div></div>
    <span class="scroll-cue" aria-hidden="true">CONTINUE A JORNADA</span>
    <nav class="chapter-nav" aria-label="Capítulos da página">
      <a href="#estrada" data-capitulo="estrada"><b>01 / A ESTRADA</b><strong>Cada detalhe importa</strong>${icon("arrow")}</a>
      <a href="#detalhes" data-capitulo="detalhes"><b>02 / A ESCOLHA</b><strong>Encontre seu acessório</strong>${icon("arrow")}</a>
      <a href="#parceria" data-capitulo="parceria"><b>03 / A PARCERIA</b><strong>Conte com a VERDAN</strong>${icon("arrow")}</a>
    </nav>
  </section>
  <section class="story-intro chapter-anchor" id="estrada"><div class="wrap">
    <div class="chapter-label"><b>01</b> A estrada começa nos detalhes</div>
    <div class="intro-grid reveal"><h2>Quem move o Brasil<br>sabe: <span>cada detalhe conta.</span></h2><p class="muted">Na escolha de um acessório, informação faz diferença. Encontre um caminho claro entre o que você precisa e a próxima conversa com nossa equipe.</p></div>
    <form class="searchbox reveal" style="margin-top:40px" data-form-busca role="search">${icon("search")}<input name="q" aria-label="Buscar por nome ou código do produto" placeholder="Buscar por nome ou código do produto"><button class="btn green">Buscar</button></form>
    ${blocoCategorias}
  </div></section>
  ${!carregando && !lista.length ? "" : `<section class="section chapter-anchor" id="detalhes"><div class="wrap">
    <div class="section-head reveal"><div><span class="eyebrow">02 / ENCONTRE SUA ESCOLHA</span><h2>O detalhe certo.<br>Um caminho mais claro.</h2><p class="muted">Explore os acessórios e leve sua seleção ao atendimento.</p></div><a class="text-link" href="/produtos">Ver catálogo completo<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div>
    ${blocoDestaques}
  </div></section>`}
  <section class="section story-bridge"><div class="wrap">
    <div class="chapter-label"><b>ESCOLHA COM CONTEXTO</b> Da necessidade ao produto</div>
    <div class="app-layout">
      <div class="reveal"><h2>O que você<br>precisa para<br><span style="color:#92a482">seguir em frente?</span></h2><p>Você pode começar pelo produto. Ou pela necessidade.<br>Nós ajudamos a conectar os dois.</p></div>
      <div class="reveal">
        ${pontes.map((c, i) => `<a class="application" href="/produtos?categoria=${esc(c.slug)}"><b>0${i + 1}</b><div><h3>${esc(c.nome)}</h3><p>Conheça os acessórios desta categoria.</p></div>${icon("arrow")}</a>`).join("")}
        <a class="application" href="${esc(linkWhatsApp("Olá! Vim pelo site da VERDAN e gostaria de uma orientação para escolher um acessório."))}" target="_blank" rel="noopener"><b>0${pontes.length + 1}</b><div><h3>Uma orientação para escolher</h3><p>Conte o que você procura para nossa equipe.</p></div>${icon("arrow")}</a>
      </div>
    </div>
  </div></section>
  <section class="section brand-story chapter-anchor" id="parceria"><div class="wrap manifest">
    <div class="editorial-scene reveal">${picEstrada("Cena conceitual de caminhão com a identidade VERDAN", 'loading="lazy" width="600" height="500"')}<div class="scene-caption"><strong>Uma marca que<br>acompanha a jornada.</strong>VERDAN / ACESSÓRIOS PARA LINHA PESADA</div></div>
    <div class="reveal"><span class="eyebrow">03 / MAIS PERTO DE VOCÊ</span><h2>Presença na marca.<br>Proximidade<br>na conversa.</h2><p class="muted">Nosso trabalho é facilitar a escolha de acessórios para linha pesada com informação clara e atendimento próximo.</p><a class="text-link" href="/a-verdan">Conheça a VERDAN<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a><div class="brand-values"><span>FUNCIONAL.</span><span>CONFIÁVEL.</span><span>FORTE.</span></div></div>
  </div></section>
  <section class="section process"><div class="wrap">
    <div class="section-head reveal"><div><span class="eyebrow">SEM COMPLICAÇÃO, PASSO A PASSO</span><h2>Do catálogo ao atendimento,<br>com clareza.</h2></div><a href="/como-comprar" class="text-link">Entenda como comprar<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div>
    <div class="steps reveal">
      <div class="step"><span>01 / EXPLORE</span><h3>Escolha os produtos</h3><p>Conheça as opções e consulte as informações de cada acessório.</p></div>
      <div class="step"><span>02 / ORGANIZE</span><h3>Informe as quantidades</h3><p>Adicione os itens à solicitação, sem precisar criar conta.</p></div>
      <div class="step"><span>03 / REVISE</span><h3>Revise sua solicitação</h3><p>Confira a lista e conte o que precisamos saber.</p></div>
      <div class="step"><span>04 / CONVERSE</span><h3>Continue com o comercial</h3><p>Nossa equipe confirma disponibilidade, aplicação e condições comerciais com você.</p></div>
    </div>
  </div></section>
  <section class="section paper"><div class="wrap faq reveal">
    <span class="eyebrow">CLAREZA EM CADA PASSO</span><h2>Antes de solicitar.</h2>
    <details><summary>Como confirmar se o produto serve para minha aplicação?</summary><p>Confira as informações da ficha e envie ao comercial os dados do veículo ou da aplicação para orientação.</p></details>
    <details><summary>Enviar a solicitação confirma a compra?</summary><p>Não. A solicitação inicia o atendimento para confirmação de disponibilidade e condições comerciais.</p></details>
    <details><summary>Preciso criar uma conta?</summary><p>Não. Você monta a solicitação aqui no site e continua a conversa pelo WhatsApp.</p></details>
  </div></section>
  ${cta()}`;
}

// --- Catálogo ---
let estadoBusca = { q: "", cats: [], ordem: "destaques", pagina: 1 };
function lerEstadoDaUrl(params){
  const slugsValidos = new Set(catalogo.categorias.map(c => c.slug));
  const cats = (params.get("categoria") || "").split(",").map(s => s.trim()).filter(Boolean);
  estadoBusca = {
    q: (params.get("q") || "").slice(0, 80),
    cats: catalogo.estado === "pronto" ? cats.filter(s => slugsValidos.has(s)) : cats,
    ordem: ["nome-asc", "nome-desc"].includes(params.get("ordem")) ? params.get("ordem") : "destaques",
    pagina: Math.max(1, parseInt(params.get("pagina"), 10) || 1),
  };
}
function urlDaBusca(){
  const p = new URLSearchParams();
  if(estadoBusca.q) p.set("q", estadoBusca.q);
  if(estadoBusca.cats.length) p.set("categoria", estadoBusca.cats.join(","));
  if(estadoBusca.ordem !== "destaques") p.set("ordem", estadoBusca.ordem);
  if(estadoBusca.pagina > 1) p.set("pagina", estadoBusca.pagina);
  const s = p.toString();
  return "/produtos" + (s ? "?" + s : "");
}
function filtrar(){
  const termo = norm(estadoBusca.q);
  const nomesCats = new Set(catalogo.categorias.filter(c => estadoBusca.cats.includes(c.slug)).map(c => c.nome));
  let lista = catalogo.produtos.filter(p => !nomesCats.size || nomesCats.has(p.categoria));
  if(termo){
    const palavras = termo.split(/\s+/);
    lista = lista
      .map(p => {
        let peso = 0;
        if(p.variacoes.some(v => norm(v.codigo) === termo)) peso = 3;
        else if(norm(p.nome).startsWith(termo)) peso = 2;
        else if(palavras.every(w => p.textoBusca.includes(w))) peso = 1;
        return { p, peso };
      })
      .filter(x => x.peso > 0)
      .sort((a, b) => b.peso - a.peso)
      .map(x => x.p);
  }
  if(estadoBusca.ordem === "nome-asc") lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  else if(estadoBusca.ordem === "nome-desc") lista = [...lista].sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
  else if(!termo) lista = [...lista].sort((a, b) => (b.disponivel - a.disponivel) || ((b.fotos.length > 0) - (a.fotos.length > 0)) || a.categoria.localeCompare(b.categoria, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
  return lista;
}
function catalogPage(){
  const filtros = catalogo.categorias.map(c => `<label><input type="checkbox" name="categoria" value="${esc(c.slug)}" ${estadoBusca.cats.includes(c.slug) ? "checked" : ""}>${esc(c.nome)}<small>${c.total}</small></label>`).join("");
  return `${crumb("Produtos")}<section class="paper"><div class="wrap page-title">
    <span class="eyebrow">CATÁLOGO VERDAN</span><h1>Produtos</h1><p class="muted">Encontre acessórios por categoria, nome ou código.</p>
    <form class="searchbox" data-form-catalogo role="search">${icon("search")}<input id="catalogSearch" name="q" value="${esc(estadoBusca.q)}" aria-label="Buscar por nome ou código" placeholder="Buscar por nome ou código" autocomplete="off"><button class="btn green">Buscar</button></form>
  </div></section>
  <div class="wrap catalog-layout">
    <aside class="filters" id="filters" aria-label="Filtros"><div class="filterbox"><h3>Categorias</h3>${filtros || '<p class="muted" style="font-size:13px">Carregando...</p>'}</div><button class="btn outline-dark" type="button" data-limpar-filtros>Limpar filtros</button></aside>
    <section aria-labelledby="resultCount">
      <div class="results-top"><button class="filters-toggle" type="button" aria-expanded="false" aria-controls="filters" data-alternar-filtros>${icon("list")} Filtros</button><span id="resultCount" aria-live="polite"></span><label>Ordenar: <select id="sort"><option value="destaques">Destaques</option><option value="nome-asc">Nome: A–Z</option><option value="nome-desc">Nome: Z–A</option></select></label></div>
      <div id="chips" class="filterchips"></div>
      <div class="grid catalog-grid" id="results"></div>
      <nav class="paginacao" id="paginacao" aria-label="Páginas"></nav>
    </section>
  </div>${cta()}`;
}
function atualizarResultados(){
  const res = $("#results");
  if(!res) return;
  $("#sort").value = estadoBusca.ordem;
  if(catalogo.estado === "carregando"){
    $("#resultCount").textContent = "Carregando produtos...";
    res.innerHTML = cardsCarregando(6);
    return;
  }
  if(catalogo.estado === "falha"){
    $("#resultCount").textContent = "";
    res.innerHTML = `<div class="aviso-carga"><h3>Não foi possível carregar os produtos.</h3><p>Verifique sua conexão e tente de novo. Sua busca e seus filtros continuam salvos.</p><button class="btn green" type="button" data-tentar>Tentar novamente</button></div>`;
    $("#paginacao").innerHTML = "";
    return;
  }
  const lista = filtrar();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  if(estadoBusca.pagina > paginas) estadoBusca.pagina = paginas;
  const inicio = (estadoBusca.pagina - 1) * POR_PAGINA;
  $("#resultCount").textContent = `${lista.length} ${lista.length === 1 ? "produto encontrado" : "produtos encontrados"}${estadoBusca.q ? ` para “${estadoBusca.q}”` : ""}`;
  res.innerHTML = lista.length
    ? lista.slice(inicio, inicio + POR_PAGINA).map(card).join("")
    : `<div class="empty"><h3>Nenhum produto encontrado${estadoBusca.q ? ` para “${esc(estadoBusca.q)}”` : ""}.</h3><p class="muted">Tente outro termo ou limpe os filtros. Se preferir, conte para nossa equipe o que você procura.</p><div class="actions" style="justify-content:center"><button class="btn green" type="button" data-limpar-tudo>Limpar busca e filtros</button><a class="btn outline-dark" href="${esc(linkWhatsApp(`Olá! Procurei${estadoBusca.q ? ` “${estadoBusca.q}”` : ""} no site da VERDAN e não encontrei. Podem me ajudar?`))}" target="_blank" rel="noopener">Pedir ajuda ao comercial<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div></div>`;
  const chips = $("#chips");
  chips.innerHTML = [
    ...catalogo.categorias.filter(c => estadoBusca.cats.includes(c.slug)).map(c => `<span class="chip">${esc(c.nome)}<button type="button" aria-label="Remover filtro ${esc(c.nome)}" data-tirar-cat="${esc(c.slug)}">×</button></span>`),
    estadoBusca.q ? `<span class="chip">Busca: ${esc(estadoBusca.q)}<button type="button" aria-label="Limpar busca" data-tirar-busca>×</button></span>` : "",
  ].join("");
  $("#paginacao").innerHTML = paginas > 1
    ? Array.from({ length: paginas }, (_, i) => `<button type="button" data-pagina="${i + 1}" ${i + 1 === estadoBusca.pagina ? 'aria-current="page"' : ""} aria-label="Página ${i + 1}">${i + 1}</button>`).join("")
    : "";
}
function aplicarBusca(mudancas, resetarPagina = true){
  Object.assign(estadoBusca, mudancas);
  if(resetarPagina) estadoBusca.pagina = 1;
  history.replaceState(null, "", urlDaBusca());
  rotaAnterior = location.pathname + location.search;
  atualizarResultados();
}

// --- Ficha do produto ---
let produtoAtual = null, variacaoAtual = null, fotoAtual = 0;
function productPage(slug){
  if(catalogo.estado === "carregando") return `${crumb('<a href="/produtos">Produtos</a>')}<div class="wrap"><section class="product-layout" aria-busy="true"><div class="bigimage skeleton"><div class="product-visual" style="width:100%;height:320px"></div></div><div class="product-info"><div class="linha" style="height:14px;background:#eef1ec;width:30%;margin-bottom:20px"></div><div class="linha" style="height:34px;background:#eef1ec;width:80%;margin-bottom:20px"></div><div class="linha" style="height:12px;background:#eef1ec;width:60%"></div></div></section></div>`;
  const p = catalogo.produtos.find(x => x.slug === slug);
  if(!p) return notfound("Produto não encontrado.", "Ele pode ter saído do catálogo.");
  produtoAtual = p;
  variacaoAtual = p.variacoes.find(v => v.disponivel) || p.variacoes[0];
  fotoAtual = 0;
  const relacionados = catalogo.produtos.filter(x => x !== p && x.categoria === p.categoria).slice(0, 4);
  const linhasEspec = [
    ["Código", p.variacoes.length > 1 ? p.variacoes.map(v => `${v.codigo}${v.rotulo ? ` (${v.rotulo})` : ""}`).join("; ") : p.variacoes[0].codigo],
    ["Categoria", p.categoria],
    ...["cor", "tamanho", "voltagem"].map(k => {
      const vals = [...new Set(p.variacoes.map(v => String(v[k] || "").trim()).filter(Boolean))];
      return vals.length ? [k === "cor" ? "Cor" : k === "tamanho" ? "Tamanho" : "Tensão", vals.join(", ")] : null;
    }).filter(Boolean),
  ];
  return `${crumb(`<a href="/produtos">Produtos</a> / <a href="/produtos?categoria=${esc(slugify(p.categoria))}">${esc(p.categoria)}</a> / ${esc(p.nome)}`)}
  <div class="wrap"><section class="product-layout">
    <div id="galeria"></div>
    <div class="product-info">
      <span class="eyebrow">${esc(p.categoria)}</span>
      <h1>${esc(p.nome)}</h1>
      <span class="code" id="codigoAtual"></span>
      ${p.descricao ? `<p style="margin-top:22px">${esc(p.descricao)}</p>` : `<p style="margin-top:22px">Confira as opções e fale com nossa equipe para confirmar a aplicação antes de solicitar.</p>`}
      ${p.temVariacao ? `<div class="variacao-grupo"><span class="code">ESCOLHA A OPÇÃO</span><div class="variacao-opcoes" role="group" aria-label="Opções do produto">${p.variacoes.map(v => `<button type="button" data-variacao="${esc(v.codigo)}" class="${v.disponivel ? "" : "esgotada"}" aria-pressed="false">${esc(v.rotulo || v.nome)}${v.disponivel ? "" : " (sem disponibilidade)"}</button>`).join("")}</div></div>` : ""}
      <hr style="border:0;border-top:1px solid var(--line);margin:25px 0">
      <strong id="disponibilidade"></strong>
      <p>Condições, disponibilidade e unidade de venda são confirmadas pela equipe.</p>
      <div id="acaoProduto"></div>
      <a class="btn outline-dark" id="duvidaProduto" target="_blank" rel="noopener" href="#">Tirar dúvida sobre este produto<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>
      <p style="font-size:12px;margin-top:18px">A inclusão organiza sua seleção. A compra depende de confirmação com o comercial.</p>
    </div>
  </section>
  <section class="section" style="padding-top:15px"><div class="twocol">
    <div>${p.descricao ? `<span class="eyebrow">DESCRIÇÃO</span><h2>Conheça o produto.</h2><p class="muted">${esc(p.descricao)}</p>` : `<span class="eyebrow">CONHEÇA O PRODUTO</span><h2>Informações para escolher.</h2>`}
      <h3>Aplicação e compatibilidade</h3><p class="muted">Confirme a aplicação com nossa equipe antes de solicitar.</p>
      <h3>Dúvidas sobre este produto</h3><p class="muted">Envie o modelo do veículo ou a aplicação e a equipe orienta sua escolha.</p></div>
    <div><h3>Especificações</h3><table class="spec-table"><tbody>${linhasEspec.map(([r, v]) => `<tr><td>${esc(r)}</td><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
  </div></section>
  ${relacionados.length ? `<section class="section paper" style="padding:35px 0"><div class="section-head"><h2>Continue explorando.</h2><a class="text-link" href="/produtos?categoria=${esc(slugify(p.categoria))}">Mais em ${esc(p.categoria)}<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div><div class="grid">${relacionados.map(card).join("")}</div></section>` : ""}
  </div><div style="height:50px"></div>${cta()}`;
}
function fotosDaFicha(){
  const p = produtoAtual;
  return [...new Set([...(variacaoAtual?.fotos || []), ...p.fotos])];
}
function atualizarFicha(){
  const p = produtoAtual, v = variacaoAtual;
  if(!p || !$("#galeria")) return;
  const fotos = fotosDaFicha();
  if(fotoAtual >= fotos.length) fotoAtual = 0;
  $("#galeria").innerHTML = `<button type="button" class="bigimage" data-ampliar ${fotos.length ? `aria-label="Ampliar foto de ${esc(p.nome)}"` : 'disabled aria-label="Imagem em atualização"'}>${imgProduto(fotos[fotoAtual], `${p.nome}${v.rotulo ? `, ${v.rotulo}` : ""}`, 'width="450" height="360"')}${fotos.length ? `<span class="ampliar" aria-hidden="true">${icon("zoom")}</span>` : ""}</button>
    ${fotos.length > 1 ? `<div class="galeria-miniaturas" role="group" aria-label="Fotos do produto">${fotos.map((f, i) => `<button type="button" data-foto="${i}" aria-label="Foto ${i + 1} de ${fotos.length}" aria-current="${i === fotoAtual}"><img src="${esc(f)}" alt="" data-produto="1" loading="lazy"></button>`).join("")}</div>` : ""}`;
  $("#codigoAtual").textContent = `Cód. ${v.codigo}${v.rotulo ? ` · ${v.rotulo}` : ""}`;
  $$("[data-variacao]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.variacao === v.codigo)));
  $("#disponibilidade").textContent = v.disponivel ? "Consulte as condições" : "Sem disponibilidade no momento";
  const textoDuvida = `Olá! Tenho uma dúvida sobre o produto ${p.nome}${v.rotulo ? ` (${v.rotulo})` : ""}, cód. ${v.codigo}.\n${urlDoProduto(p)}`;
  $("#duvidaProduto").href = linkWhatsApp(textoDuvida);
  $("#acaoProduto").innerHTML = v.disponivel
    ? `<label for="qty" class="code">QUANTIDADE</label><div class="order-action"><div class="quantity"><button type="button" aria-label="Diminuir quantidade" data-qtd="-1">−</button><input id="qty" aria-label="Quantidade" type="number" inputmode="numeric" value="1" min="1" max="999" step="1"><button type="button" aria-label="Aumentar quantidade" data-qtd="1">+</button></div><button class="btn primary" type="button" data-adicionar-ficha>Adicionar à solicitação +</button></div>`
    : `<div class="order-action"><a class="btn primary" href="${esc(linkWhatsApp(`Olá! Gostaria de saber a disponibilidade do produto ${p.nome}${v.rotulo ? ` (${v.rotulo})` : ""}, cód. ${v.codigo}.\n${urlDoProduto(p)}`))}" target="_blank" rel="noopener">Consultar disponibilidade<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div>`;
}
function abrirLightbox(){
  const fotos = fotosDaFicha();
  if(!fotos.length) return;
  abrirDialogo(`<h2 id="dialogTitulo" class="sr" style="position:absolute;left:-9999px">${esc(produtoAtual.nome)}</h2><img id="fotoAmpliada" src="${esc(fotos[fotoAtual])}" alt="${esc(produtoAtual.nome)}, foto ${fotoAtual + 1} de ${fotos.length}" data-produto="1">${fotos.length > 1 ? `<div class="navegar"><button type="button" data-lb="-1" aria-label="Foto anterior">←</button><span id="lbContador">${fotoAtual + 1} de ${fotos.length}</span><button type="button" data-lb="1" aria-label="Próxima foto">→</button></div>` : ""}`, "lightbox");
}
function moverLightbox(passo){
  const fotos = fotosDaFicha();
  fotoAtual = (fotoAtual + passo + fotos.length) % fotos.length;
  const img = $("#fotoAmpliada");
  if(img){ img.src = fotos[fotoAtual]; img.alt = `${produtoAtual.nome}, foto ${fotoAtual + 1} de ${fotos.length}`; }
  if($("#lbContador")) $("#lbContador").textContent = `${fotoAtual + 1} de ${fotos.length}`;
  atualizarFicha();
}

// --- Solicitação ---
let desfazer = null;
function cartPage(){
  const carregando = catalogo.estado === "carregando";
  const itens = Object.entries(solicitacao).map(([codigo, qtd]) => ({ codigo, qtd, ...(catalogo.porCodigo.get(codigo) || {}) }));
  const avisoRemovidos = removidosDoCatalogo.length ? `<div class="rascunho" role="status">${removidosDoCatalogo.length === 1 ? "Um produto saiu do catálogo e foi retirado" : `${removidosDoCatalogo.length} produtos saíram do catálogo e foram retirados`} da sua solicitação.</div>` : "";
  removidosDoCatalogo = [];
  const corpo = !itens.length
    ? `<div class="empty"><h2>Sua solicitação está vazia.</h2><p class="muted">Explore o catálogo e adicione os produtos que deseja consultar.</p><a class="btn green" href="/produtos">Explorar produtos ${icon("arrow")}</a></div>`
    : `<div class="cart-layout"><div>${avisoRemovidos}${itens.map(i => {
        const p = i.produto, v = i.variacao;
        const nome = p ? p.nome : `Produto cód. ${i.codigo}`;
        return `<article class="cart-row">${p ? `<a href="/produtos/${esc(p.slug)}" tabindex="-1" aria-hidden="true">${(v.fotos[0] || p.fotos[0]) ? `<img src="${esc(v.fotos[0] || p.fotos[0])}" alt="" data-produto="1" loading="lazy">` : `<div style="width:75px;height:75px">${semImagem()}</div>`}</a>` : `<div style="width:75px;height:75px">${semImagem()}</div>`}
          <div><h3>${p ? `<a href="/produtos/${esc(p.slug)}">${esc(nome)}</a>` : esc(nome)}</h3><span class="code">Cód. ${esc(i.codigo)}${v && v.rotulo ? ` · ${esc(v.rotulo)}` : ""}</span>${v && !v.disponivel ? '<span class="alerta">Sem disponibilidade no momento. A equipe pode confirmar uma alternativa.</span>' : ""}<br><button class="remove" type="button" data-remover="${esc(i.codigo)}">Remover produto</button></div>
          <div class="quantity"><button type="button" aria-label="Diminuir ${esc(nome)}" data-qtd-item="${esc(i.codigo)}" data-passo="-1">−</button><input aria-label="Quantidade de ${esc(nome)}" type="number" inputmode="numeric" min="1" max="999" value="${i.qtd}" data-qtd-input="${esc(i.codigo)}"><button type="button" aria-label="Aumentar ${esc(nome)}" data-qtd-item="${esc(i.codigo)}" data-passo="1">+</button></div>
        </article>`;
      }).join("")}
      <div class="carrinho-acoes"><a class="text-link" href="/produtos">← Continuar explorando</a><button class="remove" type="button" data-esvaziar>Esvaziar solicitação</button></div></div>
      <form class="summarybox" id="requestForm" novalidate>
        <h3>Continue com o comercial.</h3>
        <p class="muted" style="font-size:13px">${itens.length} ${itens.length === 1 ? "produto" : "produtos diferentes"} na sua seleção.</p>
        <label for="name">Nome (opcional)</label><input id="name" name="nome" maxlength="100" autocomplete="name" value="${esc(formulario.nome)}">
        <label for="company">Empresa (opcional)</label><input id="company" name="empresa" maxlength="120" autocomplete="organization" value="${esc(formulario.empresa)}">
        <label for="note">Observações (opcional)</label><textarea id="note" name="obs" rows="3" maxlength="1000" placeholder="Modelo do veículo, aplicação ou outra informação útil" aria-describedby="noteCount">${esc(formulario.obs)}</textarea><div class="contador" id="noteCount">${formulario.obs.length}/1000</div>
        <button class="btn primary" type="submit">Revisar mensagem ${icon("arrow")}</button>
        <small>Os dados incluídos serão compartilhados com a VERDAN pelo WhatsApp para atendimento desta solicitação. <a href="/privacidade" style="text-decoration:underline">Privacidade</a>.</small>
        ${persistenciaOk ? "" : "<small>Seu navegador não permite guardar a lista. Ela fica disponível até você fechar esta página.</small>"}
      </form></div>`;
  return `${crumb("Sua solicitação")}<section class="paper"><div class="wrap page-title"><span class="eyebrow">REVISE SUA ESCOLHA</span><h1>Sua solicitação</h1><p class="muted">Revise os produtos e continue o atendimento pelo WhatsApp. A equipe confirmará as condições antes da compra.</p></div></section><section class="section" style="padding-top:50px"><div class="wrap">${corpo}</div></section>`;
}
function montarMensagem(){
  const linhas = ["Olá! Gostaria de solicitar um orçamento na VERDAN.", ""];
  if(formulario.nome.trim()) linhas.push(`Nome: ${formulario.nome.trim()}`);
  if(formulario.empresa.trim()) linhas.push(`Empresa: ${formulario.empresa.trim()}`);
  if(formulario.nome.trim() || formulario.empresa.trim()) linhas.push("");
  linhas.push("Produtos:");
  let n = 0;
  for(const [codigo, qtd] of Object.entries(solicitacao)){
    const achado = catalogo.porCodigo.get(codigo);
    n++;
    if(achado){
      const { produto: p, variacao: v } = achado;
      linhas.push(`${n}. ${p.nome}${v.rotulo ? ` (${v.rotulo})` : ""} | Cód. ${codigo} | Quantidade: ${qtd}`);
      linhas.push(`   ${urlDoProduto(p)}`);
    }else{
      linhas.push(`${n}. Cód. ${codigo} | Quantidade: ${qtd}`);
    }
  }
  if(formulario.obs.trim()) linhas.push("", `Observações: ${formulario.obs.trim()}`);
  linhas.push("", "Podem confirmar disponibilidade, aplicação e condições comerciais?");
  return linhas.join("\n");
}
function abrirPrevia(){
  const msg = montarMensagem();
  abrirDialogo(`<span class="eyebrow">PRÉVIA DA MENSAGEM</span><h2 id="dialogTitulo">Confira antes de continuar.</h2><p>Você pode ajustar o texto. Ele abre no seu WhatsApp, pronto para enviar.</p>
    <label for="mensagemFinal" class="code">MENSAGEM</label><textarea id="mensagemFinal" class="mensagem">${esc(msg)}</textarea>
    <div class="actions">${temWhatsApp ? `<a class="btn primary" id="continuarZap" href="${esc(linkWhatsApp(msg))}" target="_blank" rel="noopener">Continuar no WhatsApp ${icon("arrow")}</a>` : `<span class="muted">Contato indisponível no momento.</span>`}<button class="btn outline-dark" type="button" data-copiar>Copiar mensagem</button><button class="btn outline-dark" type="button" data-fechar>Voltar</button></div>
    <p style="font-size:12px;margin-top:14px">Abrir o WhatsApp não envia nada sozinho: a mensagem só vai quando você tocar em enviar lá.</p>`);
}
async function copiarMensagem(){
  const campo = $("#mensagemFinal");
  const texto = campo ? campo.value : montarMensagem();
  try{
    if(!navigator.clipboard) throw new Error("sem clipboard");
    await navigator.clipboard.writeText(texto);
    aviso("Mensagem copiada.");
  }catch(e){
    if(campo){ campo.focus(); campo.select(); }
    aviso("Selecionei a mensagem. Use Copiar no seu aparelho.");
  }
}

// --- Páginas institucionais ---
function pageTitle(eyebrow, h1, texto){
  return `<section class="paper"><div class="wrap page-title"><span class="eyebrow">${eyebrow}</span><h1>${h1}</h1><p class="muted">${texto}</p></div></section>`;
}
function empresaPage(){
  return `${crumb("A VERDAN")}${pageTitle("A VERDAN", "Conheça a VERDAN", "Nosso trabalho é facilitar a escolha de acessórios para linha pesada com informação clara e atendimento próximo.")}
  <section class="section"><div class="wrap manifest">
    <div class="editorial-scene reveal">${picEstrada("Cena conceitual de caminhão com a identidade VERDAN", 'loading="lazy" width="600" height="500"')}<div class="scene-caption"><strong>Funcional. Confiável.<br>Forte.</strong>QUALIDADE · CONFIANÇA · PARCERIA</div></div>
    <div class="reveal"><span class="eyebrow">NOSSO PROPÓSITO</span><h2>Facilitar o dia a dia de quem trabalha com linha pesada.</h2>
      <p class="muted">Somos uma distribuidora de acessórios para linha pesada${C.endereco ? ` em ${esc(C.endereco)}` : ""}. Atendemos quem precisa de produto certo, informação objetiva e uma conversa direta para fechar o pedido.</p>
      <p class="muted">Você escolhe no catálogo, monta sua solicitação e fala com a nossa equipe, que confirma disponibilidade, aplicação e condições.</p>
      <div class="brand-values"><span>FUNCIONAL.</span><span>CONFIÁVEL.</span><span>FORTE.</span></div>
      <div class="actions" style="margin-top:30px"><a class="btn green" href="/produtos">Conheça nossos produtos ${icon("arrow")}</a><a class="btn outline-dark" href="/contato">Fale com a VERDAN</a></div>
    </div>
  </div></section>${cta()}`;
}
function comoComprarPage(){
  const passos = [
    ["01", "Explore o catálogo", "Use categorias e busca para encontrar o produto. Abra a ficha e consulte as informações."],
    ["02", "Escolha as quantidades", "Adicione os produtos à solicitação. Você pode continuar explorando sem perder sua seleção."],
    ["03", "Revise os detalhes", "Confira os itens e registre observações que ajudem a equipe a entender a necessidade."],
    ["04", "Continue no WhatsApp", "A mensagem abre pronta no seu WhatsApp. O atendimento confirma disponibilidade, aplicação e condições."],
  ];
  return `${crumb("Como comprar")}${pageTitle("COMO COMPRAR", "Como solicitar seu orçamento", "Organize sua escolha e continue a conversa com o atendimento. A solicitação não conclui a compra: ela começa o atendimento.")}
  <section class="section"><div class="wrap"><div class="infonarrow">
    ${passos.map(([n, t, d]) => `<div class="application reveal" style="border-color:var(--line)"><span class="eyebrow" style="margin:0">${n}</span><div><h3>${t}</h3><p style="color:var(--muted)">${d}</p></div></div>`).join("")}
    <div class="faq" style="margin-top:50px"><h2 style="font-size:28px">Perguntas frequentes</h2>
      <details><summary>Preciso criar uma conta?</summary><p>Não é necessário criar conta para montar sua solicitação.</p></details>
      <details><summary>Enviar a solicitação confirma a compra?</summary><p>Não. A equipe confirma disponibilidade e condições comerciais com você antes de qualquer compra.</p></details>
      <details><summary>Como sei se o produto serve no meu veículo?</summary><p>Envie o modelo do veículo ou a aplicação nas observações, ou use “Tirar dúvida sobre este produto” na ficha.</p></details>
      <details><summary>Pagamento e entrega</summary><p>Formas de pagamento, prazos e entrega são combinados com a equipe no atendimento.</p></details>
    </div>
    <div class="actions" style="margin-top:30px"><a class="btn green" href="/produtos">Explorar produtos</a><a class="btn outline-dark" href="/solicitacao">Ver minha solicitação</a></div>
  </div></div></section>${cta()}`;
}
function contatoPage(){
  const tel = telefoneFormatado();
  return `${crumb("Contato")}${pageTitle("CONTATO", "Fale com a VERDAN", "Converse com nossa equipe sobre o produto e a aplicação que você procura.")}
  <section class="section"><div class="wrap"><div class="contact-grid">
    <div class="contact-card email-card">${icon("chat")}<h3>WhatsApp comercial</h3><p>Ajuda para escolher produtos e confirmar as condições da sua solicitação.${tel ? `<br><strong style="color:white;font-size:18px">${tel}</strong>` : ""}${C.horario ? `<br>${esc(C.horario)}` : ""}</p>${temWhatsApp ? `<a class="btn" href="${esc(linkWhatsApp(MENSAGEM_GERAL))}" target="_blank" rel="noopener">Conversar no WhatsApp<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>` : '<p>Contato indisponível no momento.</p>'}</div>
    <div class="contact-card">${icon("pin")}<h3>Onde estamos</h3><p>${C.endereco ? esc(C.endereco) : "Endereço em atualização."}${C.cnpj ? `<br>CNPJ ${esc(C.cnpj)}` : ""}</p>${C.endereco ? `<a class="text-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("VERDAN " + C.endereco)}" target="_blank" rel="noopener">Abrir no mapa<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>` : ""}</div>
    ${C.email ? `<div class="contact-card">${icon("mail")}<h3>E-mail</h3><p><a href="mailto:${esc(C.email)}" style="text-decoration:underline">${esc(C.email)}</a></p></div>` : ""}
    ${C.instagram ? `<div class="contact-card">${icon("insta")}<h3>Instagram</h3><p>Novidades e produtos no nosso perfil.</p><a class="text-link" href="${esc(C.instagram)}" target="_blank" rel="noopener">Abrir o Instagram<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div>` : ""}
    <div class="contact-card">${icon("list")}<h3>Atalhos</h3><p>Dúvida sobre um produto? Abra a ficha e toque em “Tirar dúvida sobre este produto”.</p><div class="actions"><a class="btn green" href="/produtos">Explorar produtos</a><a class="btn outline-dark" href="/solicitacao">Sua solicitação</a></div></div>
  </div></div></section>`;
}
function privacidadePage(){
  return `${crumb("Privacidade")}${pageTitle("PRIVACIDADE", "Como este site trata seus dados", "Um resumo direto do que acontece com as informações que você digita aqui.")}
  <section class="section"><div class="wrap infonarrow texto-legal">
    <h2>O que fica no seu aparelho</h2><p>A lista da sua solicitação (códigos dos produtos e quantidades) fica guardada só no seu navegador, para você não perder a seleção. Nome, empresa e observações não são guardados.</p>
    <h2>O que vai para a VERDAN</h2><p>Quando você toca em “Continuar no WhatsApp”, a mensagem abre no seu WhatsApp. Ela só chega à VERDAN se você enviar. Nome, empresa e observações são opcionais e servem apenas para o atendimento desta solicitação.</p>
    <h2>Rastreamento</h2><p>Este site não usa ferramentas de análise, anúncios ou rastreadores.</p>
    <h2>Dúvidas</h2><p>Fale com a nossa equipe pelo WhatsApp${telefoneFormatado() ? ` ${telefoneFormatado()}` : ""}.</p>
  </div></section>`;
}
function linksPage(){
  return `<div class="links-page"><div class="caixa">
    <img class="logo" src="/assets/img/verdan-logo.png" alt="VERDAN" width="480" height="97">
    <p>Acessórios para linha pesada, com informação clara e atendimento próximo.</p>
    ${temWhatsApp ? `<a class="link primary" href="${esc(linkWhatsApp("Olá! Vim pelo Instagram da VERDAN e gostaria de falar com o comercial."))}" target="_blank" rel="noopener"><span>Falar com o comercial</span>${icon("chat")}</a>` : ""}
    <a class="link" href="/produtos"><span>Ver produtos</span>${icon("arrow")}</a>
    <a class="link" href="/a-verdan"><span>Conhecer a VERDAN</span>${icon("arrow")}</a>
    ${C.instagram ? `<a class="link" href="${esc(C.instagram)}" target="_blank" rel="noopener"><span>Instagram</span>${icon("insta")}</a>` : ""}
    <small>VERDAN · Funcional. Confiável. Forte.</small>
  </div></div>`;
}
function notfound(titulo = "Página não encontrada.", texto = "Continue explorando os produtos da VERDAN."){
  return `<section class="section"><div class="wrap empty"><h1>${esc(titulo)}</h1><p class="muted">${esc(texto)}</p><a class="btn green" href="/produtos">Voltar aos produtos</a></div></section>`;
}

// ===== Rotas =====
const TITULOS = {
  inicio: ["Acessórios para quem move o Brasil", "Acessórios para linha pesada com informação clara e atendimento próximo."],
  produtos: ["Produtos", "Encontre acessórios para linha pesada por categoria, nome ou código."],
  solicitacao: ["Sua solicitação", "Revise os produtos e continue o atendimento pelo WhatsApp."],
  empresa: ["A VERDAN", "Conheça a VERDAN, distribuidora de acessórios para linha pesada."],
  "como-comprar": ["Como comprar", "Como montar sua solicitação de orçamento e falar com o comercial."],
  contato: ["Contato", "Fale com a VERDAN pelo WhatsApp."],
  privacidade: ["Privacidade", "Como o site da VERDAN trata seus dados."],
  links: ["Links", "Canais oficiais da VERDAN."],
};
const posicoes = {};
let rotaAnterior = null;
// Endereços normais: /produtos, /produtos/<nome>, /a-verdan... (o GitHub Pages entrega o 404.html,
// que é uma cópia desta página, para qualquer endereço que não tenha arquivo próprio).
function rotaAtual(){
  const partes = location.pathname.replace(/\/index\.html$/, "/").split("/").filter(Boolean).map(p => { try{ return decodeURIComponent(p).replace(/\.html$/, ""); }catch(e){ return p; } });
  let rota = "404";
  if(!partes.length) rota = "inicio";
  else if(partes.length === 2 && partes[0] === "produtos") rota = "produto/" + partes[1];
  else if(partes.length === 1) rota = { "a-verdan": "empresa", inicio: "404", empresa: "404", "404": "404", "404.html": "404" }[partes[0]] || partes[0];
  return { rota, params: new URLSearchParams(location.search), chave: location.pathname + location.search };
}
function navegar(url){
  if(url === location.pathname + location.search) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  render(true);
}
// Links antigos com # (ex.: /#produtos, /#produto/refletor) continuam funcionando.
function converterEnderecoAntigo(){
  const m = location.hash.match(/^#(inicio|produtos|produto\/|solicitacao|empresa|como-comprar|contato|privacidade|links)(.*)$/);
  if(!m) return false;
  const novo = { inicio: "/", produtos: "/produtos", "produto/": "/produtos/", empresa: "/a-verdan" }[m[1]] ?? "/" + m[1];
  history.replaceState(null, "", novo + m[2]);
  return true;
}
const CAMINHO_INICIAL = location.pathname; // endereço em que esta página foi carregada (antes de converter links antigos com #)
function render(rolar = true){
  const { rota, params, chave: endereco } = rotaAtual();
  const main = $("#main");
  let html, chave = rota;
  if(rota === "inicio") html = home();
  else if(rota === "produtos"){ lerEstadoDaUrl(params); html = catalogPage(); }
  else if(rota.startsWith("produto/")){ html = productPage(rota.slice(8)); chave = "produto"; }
  else if(rota === "solicitacao") html = cartPage();
  else if(rota === "empresa") html = empresaPage();
  else if(rota === "como-comprar") html = comoComprarPage();
  else if(rota === "contato") html = contatoPage();
  else if(rota === "privacidade") html = privacidadePage();
  else if(rota === "links" && !/^\/links(\.html)?$/.test(CAMINHO_INICIAL)){ location.replace("/links"); return; } // a bio do Instagram é uma página própria (links.html)
  else { html = notfound(); chave = "404"; }
  // Re-render do mesmo lugar (catálogo chegou): mantém a rolagem e o que foi digitado.
  const yAntes = scrollY;
  main.innerHTML = html;
  document.body.classList.toggle("pagina-links", rota === "links");
  $(".header").hidden = rota === "links";
  $(".footer").hidden = rota === "links";
  document.body.classList.toggle("sem-zap", ["solicitacao", "links"].includes(rota));
  if(rota === "produtos") atualizarResultados();
  if(chave === "produto" && produtoAtual && catalogo.estado === "pronto") atualizarFicha();
  $$("[data-nav]").forEach(a => {
    const ativo = a.dataset.nav === rota || (a.dataset.nav === "produtos" && chave === "produto");
    a.classList.toggle("active", ativo);
    if(ativo) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  alternarMenu(false);
  const [t, d] = chave === "produto" && produtoAtual && catalogo.estado === "pronto"
    ? [produtoAtual.nome, produtoAtual.descricao || `${produtoAtual.nome}: acessório para linha pesada. Solicite seu orçamento à VERDAN.`]
    : (TITULOS[rota] || ["Página não encontrada", TITULOS.inicio[1]]);
  document.title = rota === "inicio" ? `VERDAN | ${t}` : `${t} | VERDAN`;
  $('meta[name="description"]').setAttribute("content", d.slice(0, 160));
  const canonico = (C.siteUrl || location.origin).replace(/\/$/, "") + (location.pathname.replace(/(\/index)?(\.html)?\/*$/, "") || "/");
  $('link[rel="canonical"]')?.setAttribute("href", canonico);
  $('meta[property="og:url"]')?.setAttribute("content", canonico);
  let robos = $('meta[name="robots"]');
  if(!robos){ robos = document.createElement("meta"); robos.name = "robots"; document.head.append(robos); }
  robos.content = chave === "404" || rota === "links" || rota === "solicitacao" ? "noindex" : "index,follow";
  iniciarVisuais();
  if(rolar){
    const voltar = posicoes[endereco];
    window.scrollTo({ top: voltar || 0, behavior: "instant" });
    if(!voltar) main.focus({ preventScroll: true });
  }else{
    window.scrollTo({ top: yAntes, behavior: "instant" });
  }
  rotaAnterior = endereco;
  atualizarProgresso();
}

// ===== Movimento =====
let observador;
function iniciarVisuais(){
  if(observador) observador.disconnect();
  if(typeof IntersectionObserver === "undefined" || reduzMovimento){ document.body.classList.remove("motion-ready"); return; }
  document.body.classList.add("motion-ready");
  observador = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("visible"); observador.unobserve(e.target); } }), { threshold: 0.08 });
  $$(".reveal").forEach(el => observador.observe(el));
}
let pedidoQuadro = false;
function atualizarProgresso(){
  const disponivel = document.documentElement.scrollHeight - innerHeight;
  const barra = $(".scroll-progress");
  if(barra) barra.style.width = (disponivel > 0 ? Math.min(100, scrollY / disponivel * 100) : 0) + "%";
  // A estrada se move devagar enquanto a página desce.
  const cena = $(".hero-scene");
  if(cena && !reduzMovimento && scrollY < innerHeight * 1.2) cena.style.transform = `translate3d(0, ${Math.round(scrollY * 0.18)}px, 0)`;
}
addEventListener("scroll", () => {
  if(rotaAnterior) posicoes[rotaAnterior] = scrollY;
  if(pedidoQuadro) return;
  pedidoQuadro = true;
  requestAnimationFrame(() => { pedidoQuadro = false; atualizarProgresso(); });
}, { passive: true });
addEventListener("resize", atualizarProgresso, { passive: true });

// ===== Eventos =====
let timerBusca;
document.addEventListener("click", ev => {
  const t = ev.target.closest("a,button");
  if(!t) return;
  if(t.matches(".skip")){ ev.preventDefault(); $("#main").focus(); return; }
  // Link interno: troca a página sem recarregar. Link novo (não é "voltar") começa no topo.
  const href = t.tagName === "A" ? t.getAttribute("href") || "" : "";
  if(href.startsWith("/") && !href.startsWith("//") && !/^\/links(\.html)?([?#]|$)/.test(href) && !t.target && !t.hasAttribute("download") && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && !ev.altKey && ev.button === 0){
    ev.preventDefault();
    delete posicoes[href];
    if(t.dataset.busca !== undefined && rotaAtual().rota === "produtos"){ $("#catalogSearch")?.focus(); return; }
    navegar(href);
    if(t.dataset.busca !== undefined) $("#catalogSearch")?.focus();
    return;
  }
  if(t.dataset.capitulo){
    ev.preventDefault();
    document.getElementById(t.dataset.capitulo)?.scrollIntoView({ behavior: reduzMovimento ? "instant" : "smooth", block: "start" });
    return;
  }
  if(t.id === "menuToggle") return alternarMenu();
  if(t.matches("#dialog .close") || t.dataset.fechar !== undefined) return fecharDialogo();
  if(t.dataset.adicionar) return adicionar(t.dataset.adicionar, 1);
  if(t.dataset.adicionarFicha !== undefined) return adicionar(variacaoAtual.codigo, $("#qty").value);
  if(t.dataset.qtd){ const e = $("#qty"); e.value = Math.max(1, Math.min(999, (parseInt(e.value, 10) || 1) + Number(t.dataset.qtd))); return; }
  if(t.dataset.variacao){ variacaoAtual = produtoAtual.variacoes.find(v => v.codigo === t.dataset.variacao); fotoAtual = 0; atualizarFicha(); return; }
  if(t.dataset.foto){ fotoAtual = Number(t.dataset.foto); atualizarFicha(); $(`[data-foto="${fotoAtual}"]`)?.focus(); return; }
  if(t.dataset.ampliar !== undefined) return abrirLightbox();
  if(t.dataset.lb) return moverLightbox(Number(t.dataset.lb));
  if(t.dataset.alternarFiltros !== undefined){ const f = $("#filters"); f.classList.toggle("open"); t.setAttribute("aria-expanded", f.classList.contains("open")); return; }
  if(t.dataset.limparFiltros !== undefined){ $$('#filters input[name=categoria]').forEach(i => { i.checked = false; }); return aplicarBusca({ cats: [] }); }
  if(t.dataset.limparTudo !== undefined){ $("#catalogSearch").value = ""; $$('#filters input[name=categoria]').forEach(i => { i.checked = false; }); return aplicarBusca({ q: "", cats: [] }); }
  if(t.dataset.tirarCat){ const s = t.dataset.tirarCat; const i = $(`#filters input[value="${CSS.escape(s)}"]`); if(i) i.checked = false; return aplicarBusca({ cats: estadoBusca.cats.filter(c => c !== s) }); }
  if(t.dataset.tirarBusca !== undefined){ $("#catalogSearch").value = ""; return aplicarBusca({ q: "" }); }
  if(t.dataset.pagina){ aplicarBusca({ pagina: Number(t.dataset.pagina) }, false); $("#resultCount").scrollIntoView({ block: "center" }); return; }
  if(t.dataset.tentar !== undefined){ catalogo.estado = "carregando"; atualizarResultados(); return carregarCatalogo(); }
  if(t.dataset.remover){
    const codigo = t.dataset.remover, qtd = solicitacao[codigo];
    delete solicitacao[codigo]; salvarSolicitacao(); render(false);
    desfazer = { [codigo]: qtd };
    return aviso("Produto removido.", { texto: "Desfazer", acao: () => { Object.assign(solicitacao, desfazer); salvarSolicitacao(); render(false); } });
  }
  if(t.dataset.qtdItem){ const c = t.dataset.qtdItem; solicitacao[c] = Math.max(1, Math.min(999, solicitacao[c] + Number(t.dataset.passo))); salvarSolicitacao(); const i = $(`[data-qtd-input="${CSS.escape(c)}"]`); if(i) i.value = solicitacao[c]; return; }
  if(t.dataset.esvaziar !== undefined){
    return abrirDialogo(`<span class="eyebrow">ESVAZIAR SOLICITAÇÃO</span><h2 id="dialogTitulo">Remover todos os produtos?</h2><p>Sua lista ficará vazia. Esta ação não pode ser desfeita.</p><div class="actions"><button class="btn primary" type="button" data-confirmar-esvaziar>Remover todos</button><button class="btn outline-dark" type="button" data-fechar>Cancelar</button></div>`);
  }
  if(t.dataset.confirmarEsvaziar !== undefined){ solicitacao = {}; salvarSolicitacao(); fecharDialogo(); render(false); return aviso("Solicitação esvaziada."); }
  if(t.dataset.copiar !== undefined) return copiarMensagem();
  if(t.id === "continuarZap") setTimeout(() => { fecharDialogo(); aviso("Continue o envio no WhatsApp. Sua lista continua aqui."); }, 300);
});
document.addEventListener("submit", ev => {
  const f = ev.target;
  if(f.matches("[data-form-busca]")){ ev.preventDefault(); const q = new FormData(f).get("q").trim(); navegar("/produtos" + (q ? "?q=" + encodeURIComponent(q) : "")); }
  else if(f.matches("[data-form-catalogo]")){ ev.preventDefault(); clearTimeout(timerBusca); aplicarBusca({ q: new FormData(f).get("q").trim() }); }
  else if(f.id === "requestForm"){ ev.preventDefault(); abrirPrevia(); }
});
document.addEventListener("input", ev => {
  const e = ev.target;
  if(e.id === "catalogSearch"){ clearTimeout(timerBusca); timerBusca = setTimeout(() => aplicarBusca({ q: e.value.trim() }), 300); }
  else if(e.closest("#requestForm") && e.name){ formulario[e.name] = e.value; if(e.name === "obs") $("#noteCount").textContent = `${e.value.length}/1000`; }
  else if(e.id === "mensagemFinal" && $("#continuarZap")) $("#continuarZap").href = linkWhatsApp(e.value);
});
document.addEventListener("change", ev => {
  const e = ev.target;
  if(e.name === "categoria" && e.closest("#filters")) aplicarBusca({ cats: $$('#filters input[name=categoria]:checked').map(i => i.value) });
  else if(e.id === "sort") aplicarBusca({ ordem: e.value });
  else if(e.dataset.qtdInput){
    const c = e.dataset.qtdInput, n = Number(e.value);
    if(!Number.isInteger(n) || n < 1 || n > 999){ e.value = solicitacao[c]; aviso("Informe uma quantidade entre 1 e 999."); return; }
    solicitacao[c] = n; salvarSolicitacao();
  }
  else if(e.id === "qty"){ const n = parseInt(e.value, 10); if(!Number.isInteger(n) || n < 1 || n > 999){ e.value = Math.max(1, Math.min(999, n || 1)); aviso("Informe uma quantidade entre 1 e 999."); } }
});
document.addEventListener("keydown", ev => {
  if(ev.key === "Escape" && $("#mobileMenu").classList.contains("open")){ alternarMenu(false); $("#menuToggle").focus(); }
  if($("#dialog").open && $("#dialog").classList.contains("lightbox") && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) moverLightbox(ev.key === "ArrowRight" ? 1 : -1);
});
$("#dialog").addEventListener("click", ev => { if(ev.target === $("#dialog")) fecharDialogo(); });
addEventListener("popstate", () => render(true));
addEventListener("hashchange", () => { if(converterEnderecoAntigo()) render(true); });
addEventListener("storage", ev => { if(ev.key === CHAVE_SOLICITACAO){ try{ solicitacao = JSON.parse(ev.newValue || "{}"); }catch(e){} salvarSolicitacao(); if(rotaAtual().rota === "solicitacao") render(false); } });

// ===== Início =====
if("scrollRestoration" in history) history.scrollRestoration = "manual";
converterEnderecoAntigo();
prepararLinksFixos();
salvarSolicitacao();
render(false);
carregarCatalogo();
})();
