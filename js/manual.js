// ════════════════════════════════════════════════════════
// manual.js — 매뉴얼 스크롤 스파이
// 현재 뷰포트의 섹션을 사이드바/TOC에 active 표시
// ════════════════════════════════════════════════════════

(function () {
  var headings = Array.prototype.slice.call(
    document.querySelectorAll('.manual-main h2[id], .manual-main h3[id]')
  );
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.manual-toc a[href^="#"], .manual-side a[href^="#"]')
  );

  if (!headings.length || !('IntersectionObserver' in window)) return;

  function setActive(id) {
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  var obs = new IntersectionObserver(
    function (entries) {
      var visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.target.offsetTop - b.target.offsetTop; });
      if (visible.length) setActive(visible[0].target.id);
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
  );
  headings.forEach(function (h) { obs.observe(h); });
})();
