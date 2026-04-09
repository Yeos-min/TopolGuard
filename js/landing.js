// ════════════════════════════════════════════════════════
// landing.js — 랜딩 페이지 로직
// Three.js는 CDN으로 먼저 로드되어 전역 THREE에 있음
//
// 인터랙션: 마우스 패럴랙스만 (스크롤 영향 X, 지형 정점 변형 X)
// ════════════════════════════════════════════════════════

(function () {
  var canvas = document.getElementById('landing-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Scene / Camera / Renderer ──
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0d11, 20, 90);

  var camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    200
  );
  var baseCam = { x: 0, y: 8, z: 28 };
  camera.position.set(baseCam.x, baseCam.y, baseCam.z);
  camera.lookAt(0, 0, 0);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x000000, 0);

  // ── Static terrain — 정점 변형 없이 고정된 지형 ──
  var size = 80;
  var segments = 90;
  var geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  var pos = geometry.attributes.position.array;
  var t0 = 4.5; // 고정 시간값 — 자연스러운 언덕 형태
  for (var i = 0; i < pos.length; i += 3) {
    var x = pos[i];
    var z = pos[i + 2];
    var dist = Math.sqrt(x * x + z * z);
    pos[i + 1] =
      Math.sin(x * 0.25 + t0 * 0.6) * 1.2 +
      Math.cos(z * 0.22 + t0 * 0.5) * 1.0 +
      Math.sin(dist * 0.3 - t0 * 0.8) * 0.6;
  }
  geometry.attributes.position.needsUpdate = true;

  var wireMat = new THREE.LineBasicMaterial({
    color: 0xe8c4a8,
    transparent: true,
    opacity: 0.55,
  });

  // WireframeGeometry 한 번만 생성 (매 프레임 재생성 X)
  var wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    wireMat
  );
  scene.add(wire);

  // ── 테마 변경에 따라 와이어 색 바꿈 ──
  function updateColor() {
    var isLight = document.body.classList.contains('light');
    wireMat.color.setHex(isLight ? 0x8a5030 : 0xe8c4a8);
    wireMat.opacity = isLight ? 0.35 : 0.55;
    scene.fog.color.setHex(isLight ? 0xf0f0f4 : 0x0d0d11);
  }
  updateColor();
  new MutationObserver(updateColor).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // ── 마우스 패럴랙스 ──
  var mouse = { x: 0, y: 0 };
  var smooth = { x: 0, y: 0 };

  document.addEventListener('mousemove', function (e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 ~ 1
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // HTML 엘리먼트 패럴랙스 대상
  var parallaxEls = document.querySelectorAll('[data-parallax]');

  // ── 렌더 루프 (카메라 패럴랙스만, 정점 변형 없음) ──
  function tick() {
    // Smooth lerp
    smooth.x += (mouse.x - smooth.x) * 0.04;
    smooth.y += (mouse.y - smooth.y) * 0.04;

    // 카메라 위치를 마우스에 따라 이동
    camera.position.x = baseCam.x + smooth.x * 4;
    camera.position.y = baseCam.y - smooth.y * 2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // HTML 엘리먼트 패럴랙스 (hero 내부 요소)
    for (var i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var speed = parseFloat(el.dataset.parallax) || 0.1;
      var tx = smooth.x * speed * 30;
      var ty = smooth.y * speed * 20;
      el.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
    }

    requestAnimationFrame(tick);
  }
  tick();

  // ── 리사이즈 대응 ──
  window.addEventListener('resize', function () {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  // ── 섹션 입장 애니메이션 (IntersectionObserver) ──
  var sections = document.querySelectorAll('.sect');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.12 }
    );
    sections.forEach(function (s) {
      io.observe(s);
    });
  } else {
    // fallback: 전부 보이게
    sections.forEach(function (s) {
      s.classList.add('in-view');
    });
  }

  // ── 하단 업타임 카운터 ──
  var uptimeEl = document.getElementById('landing-uptime');
  if (uptimeEl) {
    var start = Date.now();
    setInterval(function () {
      var s = Math.floor((Date.now() - start) / 1000);
      var h = String(Math.floor(s / 3600)).padStart(2, '0');
      var m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      var sec = String(s % 60).padStart(2, '0');
      uptimeEl.textContent = h + ':' + m + ':' + sec;
    }, 1000);
  }
})();
