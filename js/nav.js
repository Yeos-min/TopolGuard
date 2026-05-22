(function() {
  var page = document.body.getAttribute('data-page') || '';

  document.querySelectorAll('.tg-topnav .links a, .top-nav .nav-links a').forEach(function(link) {
    var href = link.getAttribute('href') || '';
    var isActive =
      (page === 'landing' && href.indexOf('index.html') >= 0) ||
      (page === 'manual' && href.indexOf('manual.html') >= 0) ||
      (page === 'app' && href.indexOf('app.html') >= 0);

    link.classList.toggle('active', isActive);
  });
})();
