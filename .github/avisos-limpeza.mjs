// =====================================================================
//  AVISOS DE LIMPEZA — corre no GitHub (tarefa "Avisos de limpeza").
//  Pergunta à base de dados quem tem limpeza amanhã (ou hoje) e envia
//  a notificação para os telemóveis que ligaram os avisos.
//  Não escreve nomes, imóveis nem endereços nos registos (só números).
// =====================================================================
import webpush from 'web-push';

const URL = process.env.SUPA_RPC_URL || 'https://xkfshzlcwiuvztfdwvjm.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_SGjww6C455tzA6wpIevT-w_t2X9lqMJ';            // chave pública do site
const VAPID_PUB = 'BOhiZZQZKL12xlwnm6sNWHuoYlzpoS5iVlBHA7FwQ5slMrZF3Fpw2w7_dWWqccQehfuzqyrBNAjg0LE-b7NOEtE';

let S;
try { S = JSON.parse(process.env.LIMPEZA_AVISOS || ''); } catch (e) { S = null; }
if (!S || !S.chave || !S.vapid_privada) {
  console.log('::error::Falta o segredo LIMPEZA_AVISOS (Settings → Secrets → Actions).');
  process.exit(1);
}
const tipo = process.env.TIPO === 'dia' ? 'dia' : 'vespera';
webpush.setVapidDetails('https://gerirmais.com', VAPID_PUB, S.vapid_privada);

async function rpc(fn, args) {
  const r = await fetch(URL + fn, { method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) throw new Error(fn + ': HTTP ' + r.status + ' ' + t.slice(0, 200));
  return JSON.parse(t);
}

const lista = await rpc('avisos_limpeza', { p_chave: S.chave, p_tipo: tipo });
console.log('Tipo:', tipo, '| aparelhos a avisar:', lista.length);
const ok = [], mortos = [];
let erros = 0;
for (const a of lista) {
  const n = Number(a.n) || 1;
  const titulo = tipo === 'vespera'
    ? (n > 1 ? '🧹 Amanhã tem ' + n + ' limpezas' : '🧹 Amanhã tem limpeza')
    : (n > 1 ? '🧹 Hoje tem ' + n + ' limpezas' : '🧹 Hoje tem limpeza');
  const payload = JSON.stringify({ titulo, corpo: a.imoveis + (tipo === 'dia' ? ' — ao chegar carregue em ▶ Comecei.' : ''),
    n, tag: 'limpeza-' + tipo, url: '/limpeza.html?aviso=1' });
  try {
    await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload,
      { TTL: 12 * 3600, urgency: 'high' });
    ok.push(a.endpoint);
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) mortos.push(a.endpoint);
    else { erros++; console.log('Falhou um envio: HTTP', e.statusCode || '?'); }
  }
}
await rpc('avisos_limpeza_feito', { p_chave: S.chave, p_ok: ok, p_mortos: mortos });
console.log('Enviados:', ok.length, '| aparelhos que já não existem (removidos):', mortos.length, '| erros:', erros);
if (erros && !ok.length) process.exit(1);
