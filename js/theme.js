// ════════════════════════════════════════════════════════
// theme.js — 다크/라이트 모드 토글
// 전역 함수로 노출됨. import/export 안 씀.
// ════════════════════════════════════════════════════════

(function () {
  var KEY = 'tg_theme';

  // 페이지 로드 즉시 저장된 테마 복원
  if (localStorage.getItem(KEY) === 'light') {
    document.body.classList.add('light');
  }

  // 전역으로 노출 — 다른 스크립트와 onclick에서 쓸 수 있게
  window.tgToggleTheme = function () {
    document.body.classList.toggle('light');
    localStorage.setItem(
      KEY,
      document.body.classList.contains('light') ? 'light' : 'dark'
    );
  };
})();
