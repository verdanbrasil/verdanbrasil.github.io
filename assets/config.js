// Dados da VERDAN usados pelo site. Preencha só com informação confirmada:
// campo vazio = o site esconde aquele item (nada de dado inventado).
window.VERDAN_CONFIG = {
  // Endereço do site no ar (vai nos links de produto da mensagem e para o Google).
  siteUrl: "https://verdanbrasil.com.br",

  // WhatsApp comercial: 55 + DDD + número, só dígitos.
  whatsapp: "5579998390222",
  // E-mail principal (contato@). O do programa (Cadastros › Empresa › E-mail) vale mais que este.
  email: "contato@verdanbrasil.com.br",
  // E-mails por setor, mostrados no Contato, na bio do Instagram e no site de vendas.
  emails: {
    comercial: "comercial@verdanbrasil.com.br",     // vendas, orçamentos e negociação
    atendimento: "atendimento@verdanbrasil.com.br", // dúvidas gerais, como comprar, horário
    suporte: "suporte@verdanbrasil.com.br",         // trocas, garantias, peça com defeito ou incompatível
  },
  horario: "",      // ex.: "Segunda a sexta, das 8h às 18h"
  endereco: "Itabaiana, Sergipe",
  instagram: "",    // ex.: "https://instagram.com/verdan" (aparece em Links e no rodapé)
  cnpj: "",

  // Produtos em destaque na página inicial: códigos do programa, na ordem desejada.
  // Vazio = o site mostra até 8 produtos com foto e disponíveis.
  destaques: [],

  // Catálogo: vem do banco do programa (só o que está marcado "No site").
  // Enquanto o banco não tiver produtos marcados, usa a planilha do site de pedidos.
  // Este site nunca mostra preço.
  supabaseUrl: "https://nyglymqlyjuyrhqslkzl.supabase.co",
  supabaseChavePublica: "sb_publishable_v9H_BO1FR9mth3eKD7l9PQ_JXYpR42j",
  planilhaCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtRoWRwGSkxz_sk4vqisYmmofT-KVdJQ5-I0YsvVOC-9EYng22lsBDFIKqqmlIbw/pub?gid=1999753351&single=true&output=csv",
  pastaImagens: "https://raw.githubusercontent.com/verdanbrasil/lojistas/main/imagens/",
  listaImagens: "https://api.github.com/repos/verdanbrasil/lojistas/contents/imagens",
};
