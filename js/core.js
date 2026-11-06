/* Natural Camouflage — núcleo compartilhado (nc-core).
   Todos os repositórios de página carregam este arquivo. Como todos ficam na mesma origem
   do GitHub Pages (usuario.github.io), eles compartilham o localStorage: é assim que
   carrinho, favoritos e pedidos "viajam" de uma página/repositório para outro. */
(() => {
  /* ===== CONFIG (único lugar para ajustar) ===== */
  const API = 'https://natural-camouflage-backend.onrender.com';
  // Caminho de cada página (um repositório por página). Se a home for o repositório
  // "usuario.github.io", troque home para '/'.
  const R = {
    home: '/nc-home/', categorias: '/nc-categorias/', busca: '/nc-busca/', produto: '/nc-produto/',
    favoritos: '/nc-favoritos/', carrinho: '/nc-carrinho/', checkout: '/nc-checkout/',
    confirmacao: '/nc-confirmacao/', conta: '/nc-minha-conta/', rastreio: '/nc-rastreio/',
    institucional: '/nc-institucional/'
  };
  const CONTACT = { whatsapp: '', instagram: '', email: '' }; // TODO: preencher (ex.: whatsapp: '5553999999999')
  const FREE_SHIPPING = 25000, PIX_DISCOUNT = 0.05; // espelham o backend (ele recalcula tudo)
  const BANDS = [[90,99,1590],[80,89,2290],[1,19,2690],[20,29,2890],[30,39,2890],[70,79,3490],[40,49,3690],[50,65,3990],[66,69,4490]];

  /* ===== CATÁLOGO (ids = ids do backend/catalog.json) ===== */
  const IMG = '/nc-core/assets/products/image-';
  const COLS = { classic: 'Classic', streetwear: 'Streetwear' }; // coleções da loja
  const mk = (id, name, cor, first, col = 'classic') => ({
    id, name, cor, col, cat: 'oversized', price: 10990,
    imgs: [0, 1, 2, 3].map(k => `${IMG}${String(first + k).padStart(3, '0')}.jpg`)
  });
  const P = [
    mk(0, 'Hope · Rosa', 'Rosa', 2), mk(1, 'Win · Preta', 'Preta', 6), mk(2, 'Discipline · Verde', 'Verde', 10),
    mk(3, 'Focus · Roxa', 'Roxa', 14), mk(4, 'Conquer · Azul', 'Azul', 18), mk(5, 'Natural Camouflage · Preta', 'Preta', 22, 'streetwear')
  ];
  const VIEWS = ['Frente', 'Lado', 'Outro lado', 'Costas'];
  const SIZES = ['P', 'M', 'G', 'GG'];

  /* ===== helpers ===== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = k => new URLSearchParams(location.search).get(k);
  const url = (page, params) => R[page] + (params ? '?' + new URLSearchParams(params) : '');
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('nc.' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('nc.' + k, JSON.stringify(v)); } catch {} bump(); }
  };
  const bump = () => { paintCounts(); document.dispatchEvent(new CustomEvent('nc:update')); };
  addEventListener('storage', e => { if (e.key && e.key.startsWith('nc.')) bump(); }); // sincroniza abas

  /* ===== carrinho ===== */
  const cart = {
    all: () => store.get('cart', []).filter(l => P[l.i] && SIZES.includes(l.s) && l.q > 0),
    add(i, s, q = 1) {
      const c = cart.all(), l = c.find(x => x.i === i && x.s === s);
      l ? l.q = Math.min(20, l.q + q) : c.push({ i, s, q }); store.set('cart', c);
    },
    setQty(k, q) { const c = cart.all(); if (q < 1) c.splice(k, 1); else c[k].q = Math.min(20, q); store.set('cart', c); },
    clear: () => store.set('cart', []),
    count: () => cart.all().reduce((a, l) => a + l.q, 0),
    subtotal: () => cart.all().reduce((a, l) => a + P[l.i].price * l.q, 0)
  };
  const shipFor = (cep, sub) => {
    const d = String(cep || '').replace(/\D/g, ''); if (d.length !== 8) return null;
    if (sub >= FREE_SHIPPING) return 0;
    const p = +d.slice(0, 2); return (BANDS.find(b => p >= b[0] && p <= b[1]) || [0, 0, 4490])[2];
  };
  const totals = (method = 'pix', cep = store.get('cep', '')) => {
    const sub = cart.subtotal(), fr = sub ? shipFor(cep, sub) : 0, d = method === 'pix' ? Math.round(sub * PIX_DISCOUNT) : 0;
    return { sub, fr, d, t: sub + (fr || 0) - d };
  };

  /* ===== favoritos ===== */
  const fav = {
    all: () => store.get('fav', []),
    has: i => fav.all().includes(i),
    toggle(i) { const f = fav.all(), k = f.indexOf(i); k < 0 ? f.push(i) : f.splice(k, 1); store.set('fav', f); return k < 0; }
  };

  /* ===== pedidos locais (histórico neste aparelho) ===== */
  const orders = {
    all: () => store.get('orders', []),
    save(o) { const a = orders.all().filter(x => x.id !== o.id); a.unshift(o); store.set('orders', a.slice(0, 30)); }
  };

  /* ===== conta / login (usa /api/auth e /api/me do backend) ===== */
  const A = {
    get: () => store.get('auth', null),
    user: () => (A.get() || {}).user || null,
    logged: () => !!A.get(),
    save(d) { store.set('auth', { accessToken: d.accessToken, refreshToken: d.refreshToken, exp: Date.now() + d.expiresIn * 1000 - 30000, user: d.user }); },
    setUser(u) { const a = A.get(); if (a) { a.user = u; store.set('auth', a); } },
    clear() { try { localStorage.removeItem('nc.auth'); } catch {} bump(); },
    refresh() {
      const a = A.get(); if (!a) return Promise.resolve(false);
      if (A._p) return A._p;
      A._p = fetch(API + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: a.refreshToken }) })
        .then(async r => {
          if (r.ok) { A.save(await r.json()); return true; }
          const now = A.get(); if (now && now.refreshToken !== a.refreshToken) return true; // outra aba já renovou
          A.clear(); return false;
        })
        .catch(() => false).finally(() => { A._p = null; });
      return A._p;
    },
    async call(path, { method = 'GET', body, auth = true } = {}) {
      const go = () => {
        const h = { 'Content-Type': 'application/json' }, a = A.get();
        if (auth && a) h.Authorization = 'Bearer ' + a.accessToken;
        return fetch(API + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
      };
      if (auth && A.get() && A.get().exp < Date.now()) await A.refresh();
      let r = await go();
      if (r.status === 401 && auth && A.get() && await A.refresh()) r = await go();
      let d = null; try { d = await r.json(); } catch {}
      if (!r.ok) { const e = new Error((d && d.error) || 'Algo deu errado. Tente de novo.'); e.status = r.status; e.code = d && d.code; throw e; }
      return d;
    },
    async login(email, password) { const d = await A.call('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }); A.save(d); return d.user; },
    async register(b) { const d = await A.call('/api/auth/register', { method: 'POST', body: b, auth: false }); A.save(d); return d.user; },
    async logout() { const a = A.get(); A.clear(); if (a) { try { await fetch(API + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: a.refreshToken }) }); } catch {} } },
    forgot: email => A.call('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
    reset: (token, password) => A.call('/api/auth/reset-password', { method: 'POST', body: { token, password }, auth: false })
  };

  /* ===== UI ===== */
  const toast = msg => {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200);
  };
  const card = p => `<a class="card pc" href="${url('produto', { id: p.id })}"><div class="ph"><div class="sw">${p.imgs.map((m, k) => `<img src="${m}" alt="${esc(p.name)}${k ? ' — ' + VIEWS[k] : ''}"${k ? ' loading="lazy"' : ''} draggable="false">`).join('')}</div>
    <div class="dt" aria-hidden="true">${p.imgs.map((_, k) => `<i${k ? '' : ' class="on"'}></i>`).join('')}</div>
    <button type="button" class="fav" data-fav="${p.id}" aria-pressed="${fav.has(p.id)}" aria-label="Favoritar ${esc(p.name)}">${fav.has(p.id) ? '♥' : '♡'}</button></div>
    <div class="meta"><h3>${esc(p.name)}</h3><div class="pr">${brl(p.price)}</div><small>ou ${brl(Math.round(p.price * (1 - PIX_DISCOUNT)))} no Pix</small></div></a>`;
  // arrastar para o lado troca a foto do card (scroll-snap nativo) e atualiza os pontinhos
  document.addEventListener('scroll', e => {
    const sw = e.target; if (!sw.classList || !sw.classList.contains('sw')) return;
    const k = Math.round(sw.scrollLeft / (sw.clientWidth || 1));
    $$('.dt i', sw.parentElement).forEach((d, j) => d.classList.toggle('on', j === k));
  }, true);
  document.addEventListener('click', e => { // botão ♡ funciona em qualquer página
    const b = e.target.closest('[data-fav]'); if (!b) return; e.preventDefault(); e.stopPropagation();
    const on = fav.toggle(+b.dataset.fav); toast(on ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
  });
  document.addEventListener('nc:update', () => $$('[data-fav]').forEach(b => {
    const on = fav.has(+b.dataset.fav); b.setAttribute('aria-pressed', on); b.textContent = on ? '♥' : '♡';
  }));

  const navConta = () => A.user() ? 'Olá, ' + esc(A.user().name.split(' ')[0]) : 'Entrar';
  const NAV = () => [['home', 'Home', R.home], ['classic', 'Classic', url('categorias', { colecao: 'classic' })], ['streetwear', 'Streetwear', url('categorias', { colecao: 'streetwear' })], ['rastreio', 'Rastrear pedido', R.rastreio], ['conta', navConta(), R.conta]];
  function paintCounts() {
    $$(`.hd nav a[href="${R.conta}"]`).forEach(a => { a.innerHTML = navConta(); });
    $$('[data-count=cart]').forEach(e => { e.textContent = cart.count(); e.dataset.n = cart.count(); });
    $$('[data-count=fav]').forEach(e => { e.textContent = fav.all().length; e.dataset.n = fav.all().length; });
  }
  function layout() {
    const here = location.pathname;
    const hd = document.createElement('header'); hd.className = 'hd';
    hd.innerHTML = `<a class="logo" href="${R.home}" aria-label="Natural Camouflage — início"><img src="${IMG}001.png" alt="Natural Camouflage"></a>
      <nav aria-label="Principal">${NAV().map(([k, l, h]) => `<a href="${h}"${(COLS[k] ? here.startsWith(R.categorias) && qs('colecao') === k : here.startsWith(R[k])) ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <form role="search" action="${R.busca}"><label class="sr" for="hq">Buscar</label><input id="hq" name="q" type="search" placeholder="Buscar peças…" value="${esc(qs('q') || '')}"></form>
      <a class="ic" href="${R.favoritos}" aria-label="Favoritos">♡<b data-count="fav"></b></a>
      <a class="ic" href="${R.carrinho}" aria-label="Carrinho">Carrinho<b data-count="cart"></b></a>`;
    const ft = document.createElement('footer'); ft.className = 'ft';
    const inst = p => url('institucional', { p });
    const ct = CONTACT.whatsapp ? `<a href="https://wa.me/${CONTACT.whatsapp}">WhatsApp</a>` : '';
    ft.innerHTML = `<div><h4>NATURAL CAMOUFLAGE</h4>Gym Suits · Bagé, RS · Brasil<br>Collection Classic · Collection Streetwear</div>
      <div><h4>LOJA</h4><a href="${url('categorias', { colecao: 'classic' })}">Collection Classic</a><a href="${url('categorias', { colecao: 'streetwear' })}">Collection Streetwear</a><a href="${R.categorias}">Todas as peças</a><a href="${R.favoritos}">Favoritos</a><a href="${R.rastreio}">Rastrear pedido</a><a href="${R.conta}">Minha conta</a></div>
      <div><h4>INSTITUCIONAL</h4><a href="${inst('sobre')}">Sobre</a><a href="${inst('trocas')}">Trocas e devoluções</a><a href="${inst('privacidade')}">Privacidade</a><a href="${inst('termos')}">Termos de uso</a><a href="${inst('contato')}">Contato</a>${ct}</div>
      <div><h4>PAGAMENTO</h4>Pix com 5% off<br>Cartão de crédito<br>Pagamento processado pelo Mercado Pago</div>
      <div class="cp">© ${new Date().getFullYear()} Natural Camouflage. Todos os direitos reservados.</div>`;
    document.body.prepend(hd); document.body.append(ft); paintCounts();
  }
  document.addEventListener('DOMContentLoaded', layout);

  window.NC = { auth: A, API, R, CONTACT, P, COLS, VIEWS, SIZES, FREE_SHIPPING, PIX_DISCOUNT, $, $$, brl, esc, qs, url, store, cart, fav, orders, shipFor, totals, toast, card };
})();
