(function() {
  var revealItems = document.querySelectorAll(
    '.features .section-header, .pipeline-section .section-header, .feature-card, .pipeline-card, .cta-banner, .footer-content'
  );

  function revealVisibleItems() {
    revealItems.forEach(function(item) {
      var rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        item.classList.add('is-visible');
      }
    });
  }

  revealVisibleItems();
  window.addEventListener('scroll', revealVisibleItems, { passive: true });
})();
