// ════════════════════════════════════════════════════════
// nav.js — 3페이지 공통 상단 네비
// 사용법: <body data-page="landing"> 처럼 data 속성에 현재 페이지 적어두면 자동으로 active 표시
// ════════════════════════════════════════════════════════

(function () {
  var current = document.body.getAttribute('data-page') || '';

  // app 페이지는 자체 사이드바가 있으므로 탑바 생략
  if (current === 'app') return;

  document.body.classList.add('has-topnav');

  var nav = document.createElement('nav');
  nav.className = 'tg-topnav';
  nav.innerHTML =
    '<div class="brand">TOPOL<span>GUARD</span></div>' +
    '<div class="links">' +
      '<a href="index.html"  data-link="landing">HOME</a>' +
      '<a href="manual.html" data-link="manual">MANUAL</a>' +
      '<a href="app.html"    data-link="app">INSPECTOR</a>' +
    '</div>' +
    '<div class="sys">' +
      '<span class="dot"></span>' +
      '<span>SYS.ONLINE // OP.READY</span>' +
      '<button class="theme-btn" onclick="tgToggleTheme()" title="Toggle theme">◐</button>' +
    '</div>';

  document.body.insertBefore(nav, document.body.firstChild);

  var active = nav.querySelector('[data-link="' + current + '"]');
  if (active) active.classList.add('active');
})();
