// Gera a versão publicada do site em uma pasta (padrão: _site):
// - uma página .html para cada endereço fixo (/produtos, /a-verdan...) e para cada produto (/produtos/<nome>),
//   com título, descrição e imagem próprios, para o Google e para a prévia do link no WhatsApp;
// - 404.html (qualquer outro endereço abre o site, que mostra "Página não encontrada");
// - sitemap.xml e robots.txt.
// O catálogo vem do banco do programa (catalogo_publico), ou da planilha se o banco estiver vazio.
// Uso: node ferramentas/gerar-paginas.mjs [pasta-de-saida]
//   Sem pasta: grava na própria pasta do site (é o que a Action do GitHub faz a cada 3 horas).
//   Com pasta: copia o site para lá e grava junto (usado nos testes).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = path.resolve(process.argv[2] || RAIZ);
const NO_LUGAR = SAIDA === RAIZ;
const janela = {};
vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "assets/config.js"), "utf8"), { window: janela });
const C = janela.VERDAN_CONFIG;
const SITE = (C.siteUrl || "").replace(/\/$/, "");

// Mesmas regras do assets/site.js (montarProdutos), para os endereços baterem.
const norm = v => String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const slugify = v => norm(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function linhasDoBanco(){
  if(!C.supabaseUrl || !C.supabaseChavePublica) return [];
  const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/catalogo_publico`, { method: "POST", headers: { apikey: C.supabaseChavePublica, "Content-Type": "application/json" }, body: "{}" });
  if(!r.ok) throw new Error(`banco respondeu ${r.status}`);
  const itens = await r.json();
  return Array.isArray(itens) ? itens : [];
}
function lerCSV(texto){
  const linhas = []; let campo = "", linha = [], aspas = false;
  for(let i = 0; i < texto.length; i++){
    const c = texto[i];
    if(aspas){ if(c === '"' && texto[i + 1] === '"'){ campo += '"'; i++; } else if(c === '"') aspas = false; else campo += c; }
    else if(c === '"') aspas = true;
    else if(c === ","){ linha.push(campo); campo = ""; }
    else if(c === "\n" || c === "\r"){ if(c === "\r" && texto[i + 1] === "\n") i++; linha.push(campo); campo = ""; linhas.push(linha); linha = []; }
    else campo += c;
  }
  if(campo || linha.length){ linha.push(campo); linhas.push(linha); }
  const iCab = linhas.findIndex(l => l.some(c => norm(c) === "produto") && l.some(c => norm(c) === "categoria"));
  if(iCab < 0) return [];
  const cab = linhas[iCab].map(c => norm(c));
  return linhas.slice(iCab + 1).map(l => Object.fromEntries(cab.map((c, i) => [c, (l[i] || "").trim()])));
}
async function linhasDaPlanilha(){
  if(!C.planilhaCsv) return [];
  const r = await fetch(C.planilhaCsv);
  if(!r.ok) throw new Error(`planilha respondeu ${r.status}`);
  return lerCSV(await r.text()).filter(l => l.produto).map((l, i) => ({
    codigo: l.id || String(i + 1), nome: l.produto, categoria: l.categoria, descricao: l["descricao"] || "",
    fotos: [l["imagem (url)"] || l.imagem].filter(Boolean).join(","),
  }));
}
function montarProdutos(linhas){
  const grupos = new Map();
  linhas.forEach(l => {
    if(!l.nome || l.codigo === undefined || l.codigo === null || l.codigo === "") return;
    const chave = Number(l.pai) ? `pai:${Number(l.pai)}` : (norm(l.grupo || l.nome_base) || `#${l.codigo}`); // variações do mesmo produto: mesmo Pai (ou Grupo)
    if(!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(l);
  });
  const slugs = new Set();
  return [...grupos.values()].map(lista => {
    lista.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "pt-BR", { numeric: true }));
    const nome = (lista[0].grupo || "").trim() || (lista.length > 1 && (lista[0].nome_base || "").trim()) || lista[0].nome;
    let slug = slugify(nome);
    if(slugs.has(slug)) slug += "-" + slugify(lista[0].codigo);
    slugs.add(slug);
    const foto = lista.flatMap(l => String(l.fotos || "").split(",")).map(f => f.trim()).find(f => /^https:\/\//i.test(f)) || "";
    return { slug, nome, categoria: (lista[0].categoria || "").trim() || "Outros", descricao: (lista.find(l => (l.descricao || "").trim()) || {}).descricao || "", foto };
  });
}

const modelo = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
function pagina({ caminho, titulo, descricao, imagem, conteudo, indexar = true }){
  const url = SITE + caminho;
  let h = modelo
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(descricao)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(titulo)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(descricao)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(url)}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${esc(url)}`);
  if(imagem) h = h.replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(imagem)}`);
  if(!indexar) h = h.replace("<meta charset=\"UTF-8\">", "<meta charset=\"UTF-8\">\n<meta name=\"robots\" content=\"noindex\">");
  // Conteúdo já escrito para quem lê sem JavaScript (o Google, prévias de link). O site troca ao abrir.
  if(conteudo) h = h.replace(/<main id="main" tabindex="-1">/, `$&\n  <section class="section"><div class="wrap">${conteudo}</div></section>`);
  return h;
}
function gravar(arquivo, texto){
  const f = path.join(SAIDA, arquivo);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, texto);
}

const FIXAS = [
  { arq: "produtos.html", caminho: "/produtos", titulo: "Produtos | VERDAN", descricao: "Encontre acessórios para linha pesada por categoria, nome ou código." },
  { arq: "a-verdan.html", caminho: "/a-verdan", titulo: "A VERDAN | VERDAN", descricao: "Conheça a VERDAN, distribuidora de acessórios para linha pesada." },
  { arq: "como-comprar.html", caminho: "/como-comprar", titulo: "Como comprar | VERDAN", descricao: "Como montar sua solicitação de orçamento e falar com o comercial." },
  { arq: "contato.html", caminho: "/contato", titulo: "Contato | VERDAN", descricao: "Fale com a VERDAN pelo WhatsApp." },
  { arq: "privacidade.html", caminho: "/privacidade", titulo: "Privacidade | VERDAN", descricao: "Como o site da VERDAN trata seus dados." },
  { arq: "solicitacao.html", caminho: "/solicitacao", titulo: "Sua solicitação | VERDAN", descricao: "Revise os produtos e continue o atendimento pelo WhatsApp.", indexar: false },
];

(async () => {
  if(!NO_LUGAR){
    fs.rmSync(SAIDA, { recursive: true, force: true });
    for(const item of ["assets", "favicon.ico", "index.html", "links.html"]) fs.cpSync(path.join(RAIZ, item), path.join(SAIDA, item), { recursive: true });
  }

  let linhas = [], falhas = 0;
  // VERDAN_CATALOGO=arquivo.json: usa um catálogo salvo (para teste), sem buscar na internet.
  if(process.env.VERDAN_CATALOGO) linhas = JSON.parse(fs.readFileSync(process.env.VERDAN_CATALOGO, "utf8"));
  else try{ linhas = await linhasDoBanco(); }catch(e){ falhas++; console.warn("Banco:", e.message); }
  if(!linhas.length){ try{ linhas = await linhasDaPlanilha(); }catch(e){ falhas++; console.warn("Planilha:", e.message); } }
  const produtos = montarProdutos(linhas);
  // Sem conseguir ler o catálogo, não mexe nas páginas de produto que já existem.
  if(!produtos.length && falhas && fs.existsSync(path.join(SAIDA, "produtos"))){ console.warn("Catálogo indisponível: páginas de produto mantidas."); return; }
  fs.rmSync(path.join(SAIDA, "produtos"), { recursive: true, force: true });

  for(const p of FIXAS) gravar(p.arq, pagina(p));
  gravar("404.html", pagina({ caminho: "/404", titulo: "VERDAN | Acessórios para quem move o Brasil", descricao: "Acessórios para linha pesada com informação clara e atendimento próximo.", indexar: false }));
  const listaProdutos = produtos.map(p => `<li><a href="/produtos/${p.slug}">${esc(p.nome)}</a></li>`).join("");
  gravar("produtos.html", pagina({ ...FIXAS[0], conteudo: `<h1>Produtos</h1><ul>${listaProdutos}</ul>` }));
  for(const p of produtos){
    const descricao = (p.descricao || `${p.nome}: acessório para linha pesada. Solicite seu orçamento à VERDAN.`).slice(0, 160);
    gravar(`produtos/${p.slug}.html`, pagina({
      caminho: `/produtos/${p.slug}`, titulo: `${p.nome} | VERDAN`, descricao, imagem: p.foto,
      conteudo: `<h1>${esc(p.nome)}</h1><p>${esc(p.categoria)}</p><p>${esc(p.descricao)}</p>`,
    }));
  }
  const urls = ["/", ...FIXAS.filter(p => p.indexar !== false).map(p => p.caminho), ...produtos.map(p => `/produtos/${p.slug}`)];
  gravar("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(SITE + u)}</loc></url>`).join("\n")}\n</urlset>\n`);
  gravar("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`Gerado em ${SAIDA}: ${FIXAS.length} páginas fixas, ${produtos.length} produtos.`);
})().catch(e => { console.error(e); process.exit(1); });
