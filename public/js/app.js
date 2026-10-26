(function () {
  'use strict';

  var app = document.getElementById('app');
  var DATA = null;
  var TIPOS = {};
  var JUEGOS = [];

  // Estado de los filtros (se conserva al ir y volver del detalle)
  var filtros = { q: '', jugadores: '', tiempo: '', tipos: [], orden: 'num' };

  var STAT_LABELS = [
    ['estrategia', 'Estrategia', '#c0392b'],
    ['suerte', 'Suerte', '#f6b93b'],
    ['interaccion', 'Interacción', '#2e86de'],
    ['risas', 'Risas', '#e84393']
  ];

  var ICO_PLAYERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M17 14.2c2.6.2 4.5 2.2 4.5 5"/></svg>';
  var ICO_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var ICO_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

  // ---------- Utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function num(n) { return '#' + String(n).padStart(3, '0'); }
  function rango(r, suf) {
    if (!r) return '—';
    return (r[0] === r[1] ? r[0] : r[0] + '–' + r[1]) + (suf || '');
  }
  function iniciales(nombre) {
    var limpio = nombre.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    var p = limpio.split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
    return limpio.slice(0, 2).toUpperCase();
  }
  function colorTipo(t) { return (TIPOS[t] && TIPOS[t].color) || '#999'; }
  function tipoChip(t) {
    return '<span class="type" style="--c:' + colorTipo(t) + '">' + esc(TIPOS[t] ? TIPOS[t].nombre : t) + '</span>';
  }
  function placeholder(j) {
    return '<div class="ph"><span class="ph__txt">' + esc(iniciales(j.nombre)) + '</span><span class="ph__sub">Sin portada</span></div>';
  }
  function arte(j, src) {
    src = src || j.imagen;
    if (!src) return placeholder(j);
    // Si la imagen falla, se reemplaza por el placeholder
    return '<img src="' + esc(src) + '" alt="Portada de ' + esc(j.nombre) + '" loading="lazy" referrerpolicy="no-referrer" ' +
      'onerror="this.outerHTML=window.__ph(' + j.id + ')">';
  }
  window.__ph = function (id) {
    var j = JUEGOS.find(function (x) { return x.id === id; });
    return j ? placeholder(j) : '';
  };

  // ---------- Tema ----------
  document.getElementById('themeBtn').addEventListener('click', function () {
    var actual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', actual);
    try { localStorage.setItem('ludoteca-tema', actual); } catch (e) {}
  });

  // ---------- Filtros ----------
  function filtrar() {
    var q = norm(filtros.q);
    var jug = parseInt(filtros.jugadores, 10);
    var tmax = parseInt(filtros.tiempo, 10);
    var lista = JUEGOS.filter(function (j) {
      if (q) {
        var hay = norm([j.nombre, j.nombreOriginal, j.editorial, (j.disenadores || []).join(' '), (j.mecanicas || []).join(' ')].join(' '));
        if (hay.indexOf(q) === -1 && String(j.id) !== q.replace('#', '').replace(/^0+/, '')) return false;
      }
      if (jug && (jug < j.jugadores[0] || jug > j.jugadores[1])) return false;
      if (tmax && j.duracion[0] > tmax) return false;
      if (filtros.tipos.length && !filtros.tipos.every(function (t) { return j.tipos.indexOf(t) !== -1; })) return false;
      return true;
    });
    var o = filtros.orden;
    lista.sort(function (a, b) {
      if (o === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
      if (o === 'duracion') return a.duracion[0] - b.duracion[0] || a.id - b.id;
      if (o === 'jugadores') return b.jugadores[1] - a.jugadores[1] || a.id - b.id;
      return a.id - b.id;
    });
    return lista;
  }

  // ---------- Vista: grilla ----------
  function renderLista() {
    document.title = 'Ludoteca';
    var tiposUsados = Object.keys(TIPOS).filter(function (t) {
      return JUEGOS.some(function (j) { return j.tipos.indexOf(t) !== -1; });
    });

    var optsJug = '<option value="">Cualquiera</option>';
    for (var n = 1; n <= 12; n++) optsJug += '<option value="' + n + '">' + n + (n === 12 ? '+' : '') + '</option>';
    var optsT = [['', 'Sin límite'], ['15', '15 min'], ['20', '20 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hora']]
      .map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');

    app.innerHTML =
      '<section class="toolbar" aria-label="Filtros">' +
        '<div class="toolbar__row">' +
          '<label class="search">' + ICO_SEARCH +
            '<span class="sr-only">Buscar</span>' +
            '<input id="fq" type="search" placeholder="Buscar por nombre, número, diseñador…" autocomplete="off">' +
          '</label>' +
          '<button class="btn btn--primary" id="random" type="button">🎲 ¿A qué jugamos hoy?</button>' +
        '</div>' +
        '<div class="toolbar__row">' +
          '<label class="field">' + ICO_PLAYERS.replace('<svg', '<svg class="stat-ico"') + ' Somos <select id="fj">' + optsJug + '</select></label>' +
          '<label class="field">' + ICO_CLOCK.replace('<svg', '<svg class="stat-ico"') + ' Tenemos <select id="ft">' + optsT + '</select></label>' +
          '<label class="field">Ordenar <select id="fo">' +
            '<option value="num">Número</option><option value="nombre">Nombre</option>' +
            '<option value="duracion">Más rápidos</option><option value="jugadores">Más jugadores</option>' +
          '</select></label>' +
          '<button class="btn btn--ghost" id="limpiar" type="button">Limpiar</button>' +
        '</div>' +
        '<div class="chips" role="group" aria-label="Tipos">' +
          tiposUsados.map(function (t) {
            return '<button type="button" class="chip" data-tipo="' + t + '" style="--c:' + colorTipo(t) + '" aria-pressed="' +
              (filtros.tipos.indexOf(t) !== -1) + '">' + esc(TIPOS[t].nombre) + '</button>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<p class="result-info" id="info"></p>' +
      '<section class="grid" id="grid" aria-live="polite"></section>';

    var fq = document.getElementById('fq'), fj = document.getElementById('fj'),
        ft = document.getElementById('ft'), fo = document.getElementById('fo');
    fq.value = filtros.q; fj.value = filtros.jugadores; ft.value = filtros.tiempo; fo.value = filtros.orden;

    fq.addEventListener('input', function () { filtros.q = fq.value; pintarGrilla(); });
    fj.addEventListener('change', function () { filtros.jugadores = fj.value; pintarGrilla(); });
    ft.addEventListener('change', function () { filtros.tiempo = ft.value; pintarGrilla(); });
    fo.addEventListener('change', function () { filtros.orden = fo.value; pintarGrilla(); });
    app.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.tipo, i = filtros.tipos.indexOf(t);
        if (i === -1) filtros.tipos.push(t); else filtros.tipos.splice(i, 1);
        b.setAttribute('aria-pressed', i === -1);
        pintarGrilla();
      });
    });
    document.getElementById('limpiar').addEventListener('click', function () {
      filtros = { q: '', jugadores: '', tiempo: '', tipos: [], orden: 'num' };
      renderLista();
    });
    document.getElementById('random').addEventListener('click', function () {
      var lista = filtrar();
      if (!lista.length) return;
      var j = lista[Math.floor(Math.random() * lista.length)];
      location.hash = '#/juego/' + j.slug + '?sugerido=1';
    });

    pintarGrilla();
  }

  function pintarGrilla() {
    var grid = document.getElementById('grid');
    var lista = filtrar();
    document.getElementById('info').textContent =
      lista.length === JUEGOS.length ? JUEGOS.length + ' juegos en la colección' : lista.length + ' de ' + JUEGOS.length + ' juegos';

    if (!lista.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Ningún juego coincide con esos filtros.<br>' +
        '<button class="btn btn--ghost" type="button" onclick="document.getElementById(\'limpiar\').click()">Limpiar filtros</button></div>';
      return;
    }
    grid.innerHTML = lista.map(function (j, i) {
      return '<a class="card" href="#/juego/' + j.slug + '" style="--c:' + colorTipo(j.tipos[0]) + ';animation-delay:' + Math.min(i * 25, 500) + 'ms">' +
        '<div class="card__art">' + arte(j) + '</div>' +
        '<div class="card__body">' +
          '<span class="num">' + num(j.id) + '</span>' +
          '<h2 class="card__name">' + esc(j.nombre) + '</h2>' +
          '<div class="types">' + j.tipos.slice(0, 2).map(tipoChip).join('') + '</div>' +
          '<div class="card__meta"><span>' + ICO_PLAYERS + rango(j.jugadores) + '</span><span>' + ICO_CLOCK + rango(j.duracion, '′') + '</span></div>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  // ---------- Vista: detalle ----------
  function renderDetalle(slug, sugerido) {
    var idx = JUEGOS.findIndex(function (j) { return j.slug === slug; });
    if (idx === -1) { location.hash = '#/'; return; }
    var j = JUEGOS[idx];
    var prev = JUEGOS[(idx - 1 + JUEGOS.length) % JUEGOS.length];
    var next = JUEGOS[(idx + 1) % JUEGOS.length];
    var c = colorTipo(j.tipos[0]);
    document.title = j.nombre + ' · Ludoteca';

    var fotos = j.fotos && j.fotos.length ? j.fotos : (j.imagen ? [j.imagen] : []);
    var facts = [
      ['Jugadores', rango(j.jugadores)],
      ['Duración', rango(j.duracion, ' min')],
      ['Edad', j.edad ? j.edad + '+' : '—'],
      ['Año', j.anio || '—'],
      ['Diseño', (j.disenadores || []).join(', ') || '—'],
      ['Editorial', j.editorial || '—']
    ];
    if (j.ilustradores) facts.push(['Ilustración', j.ilustradores.join(', ')]);

    var bggUrl = 'https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=' + encodeURIComponent(j.bgg || j.nombreOriginal || j.nombre);
    if (j.bggId) bggUrl = 'https://boardgamegeek.com/boardgame/' + j.bggId;
    var ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent('cómo jugar ' + j.nombre + ' juego de mesa');
    var base = j.expansionDe ? JUEGOS.find(function (x) { return x.slug === j.expansionDe; }) : null;

    app.innerHTML =
      '<nav class="detail-nav" aria-label="Navegación">' +
        '<a class="pn" href="#/">← Volver a la grilla</a>' +
        '<div class="detail-nav__pn">' +
          '<a class="pn" href="#/juego/' + prev.slug + '" aria-label="Anterior: ' + esc(prev.nombre) + '">‹ <span class="num">' + num(prev.id) + '</span><span class="pn__name">' + esc(prev.nombre) + '</span></a>' +
          '<a class="pn" href="#/juego/' + next.slug + '" aria-label="Siguiente: ' + esc(next.nombre) + '"><span class="num">' + num(next.id) + '</span><span class="pn__name">' + esc(next.nombre) + '</span> ›</a>' +
        '</div>' +
      '</nav>' +
      '<article class="dex" style="--c:' + c + '">' +
        '<div class="dex__left">' +
          '<div class="screen">' +
            '<div class="screen__dots"><i></i><i></i></div>' +
            '<div class="screen__view" id="view">' + arte(j, fotos[0]) + '</div>' +
            '<div class="screen__btm"><span class="big-dot"></span><span class="speaker"><i></i><i></i><i></i></span></div>' +
          '</div>' +
          (fotos.length > 1 ? '<div class="thumbs">' + fotos.map(function (f, i) {
            return '<button type="button" class="thumb" data-src="' + esc(f) + '" aria-pressed="' + (i === 0) + '" aria-label="Foto ' + (i + 1) + '"><img src="' + esc(f) + '" alt=""></button>';
          }).join('') + '</div>' : '') +
          '<div class="dpad-row">' +
            '<div class="dpad" aria-hidden="true"><span class="v"></span><span class="h"></span>' +
              '<a class="l" href="#/juego/' + prev.slug + '" tabindex="-1">◀</a><a class="r" href="#/juego/' + next.slug + '" tabindex="-1">▶</a></div>' +
            '<div class="green-pad">' + (sugerido ? '¡HOY TOCA<br>' + esc(j.nombre.toUpperCase()) + '!' :
              num(j.id) + '<br>' + rango(j.jugadores) + ' JUG · ' + rango(j.duracion) + ' MIN') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="dex__right">' +
          '<header class="dex__head">' +
            '<span class="num">' + num(j.id) + '</span>' +
            '<h1 class="dex__name">' + esc(j.nombre) + '</h1>' +
            (j.nombreOriginal && j.nombreOriginal !== j.nombre ? '<p class="dex__orig">' + esc(j.nombreOriginal) + '</p>' : '') +
            '<div class="types">' + j.tipos.map(tipoChip).join('') + '</div>' +
          '</header>' +
          '<p class="entry">' + esc(j.descripcion) + '</p>' +
          (j.premios ? '<div class="awards">' + j.premios.map(function (p) { return '<span class="award">🏆 ' + esc(p) + '</span>'; }).join('') + '</div>' : '') +
          (base ? '<p class="note">Expansión de <a href="#/juego/' + base.slug + '">' + esc(base.nombre) + '</a>: necesitas el juego base.</p>' : '') +
          '<section><h2 class="h3">Datos</h2><div class="facts">' + facts.map(function (f) {
            return '<div class="fact"><b>' + f[0] + '</b><span>' + esc(f[1]) + '</span></div>';
          }).join('') + '</div></section>' +
          '<section><h2 class="h3">Stats</h2><div class="stats">' + STAT_LABELS.map(function (s) {
            var v = (j.stats && j.stats[s[0]]) || 0;
            return '<div class="stat"><span>' + s[1] + '</span><span class="stat__val">' + v + '</span>' +
              '<div class="bar" role="meter" aria-valuemin="0" aria-valuemax="5" aria-valuenow="' + v + '" aria-label="' + s[1] + '"><i style="--bc:' + s[2] + '" data-w="' + (v * 20) + '%"></i></div></div>';
          }).join('') + '</div></section>' +
          '<section><h2 class="h3">¿Cómo se juega?</h2><p class="how">' + esc(j.comoSeJuega) + '</p></section>' +
          '<section><h2 class="h3">Mecánicas</h2><div class="tags">' + (j.mecanicas || []).map(function (m) { return '<span class="tag">' + esc(m) + '</span>'; }).join('') + '</div></section>' +
          (j.porConfirmar && j.porConfirmar.length ? '<p class="note">Datos por confirmar: ' + esc(j.porConfirmar.join(', ')) + '.</p>' : '') +
          '<div class="links">' +
            '<a class="btn btn--ghost" href="' + bggUrl + '" target="_blank" rel="noopener">Ver en BoardGameGeek ↗</a>' +
            '<a class="btn btn--ghost" href="' + ytUrl + '" target="_blank" rel="noopener">Video de reglas ↗</a>' +
          '</div>' +
        '</div>' +
      '</article>';

    // Animar barras
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        app.querySelectorAll('.bar i').forEach(function (b) { b.style.width = b.dataset.w; });
      });
    });
    // Galería de fotos propias
    app.querySelectorAll('.thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        document.getElementById('view').innerHTML = arte(j, t.dataset.src);
        app.querySelectorAll('.thumb').forEach(function (x) { x.setAttribute('aria-pressed', x === t); });
      });
    });
    window.scrollTo(0, 0);
  }

  // Flechas del teclado en el detalle
  document.addEventListener('keydown', function (e) {
    if (!/^#\/juego\//.test(location.hash) || e.target.matches('input, select, textarea')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var link = app.querySelector('.dpad .' + (e.key === 'ArrowLeft' ? 'l' : 'r'));
      if (link) location.hash = link.getAttribute('href');
    } else if (e.key === 'Escape') {
      location.hash = '#/';
    }
  });

  // ---------- Router ----------
  var ultimoScroll = 0;
  function router() {
    var h = location.hash || '#/';
    var m = h.match(/^#\/juego\/([^?]+)(\?(.*))?$/);
    if (m) {
      renderDetalle(decodeURIComponent(m[1]), /sugerido=1/.test(m[3] || ''));
    } else {
      renderLista();
      window.scrollTo(0, ultimoScroll);
    }
  }
  window.addEventListener('scroll', function () {
    if (!/^#\/juego\//.test(location.hash)) ultimoScroll = window.scrollY;
  }, { passive: true });

  fetch('data/juegos.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      DATA = d; TIPOS = d.tipos; JUEGOS = d.juegos;
      document.getElementById('contador').textContent = JUEGOS.length + ' juegos de mesa';
      window.addEventListener('hashchange', router);
      router();
    })
    .catch(function () {
      app.innerHTML = '<div class="empty">No se pudieron cargar los juegos. Si abriste el archivo directamente, usa un servidor local.</div>';
    });
})();
