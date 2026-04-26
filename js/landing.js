// ════════════════════════════════════════════════════════
// landing.js — 랜딩 페이지 로직
// Three.js는 CDN으로 먼저 로드되어 전역 THREE에 있음
//
// 웨이브 + 마우스 패럴랙스 동시 작동
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

  // ── Plane geometry + basePositions 보존 ──
  var size = 80;
  var segments = 90;
  var geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  var basePositions = geometry.attributes.position.array.slice();

  var wireMat = new THREE.LineBasicMaterial({
    color: 0x3eb389,
    transparent: true,
    opacity: 0.55,
  });
  var wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireMat);
  scene.add(wire);

  // ── 테마 변경에 따라 와이어 색 바꿈 ──
  function updateColor() {
    var isLight = document.body.classList.contains('light');
    wireMat.color.setHex(isLight ? 0x3eb389 : 0x3eb389);
    wireMat.opacity = isLight ? 0.35 : 0.35;
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
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  var parallaxEls = document.querySelectorAll('[data-parallax]');

  // ── 렌더 루프: 웨이브 + 패럴랙스 동시 ──
  var startTime = performance.now();

  function tick() {
    var t = (performance.now() - startTime) / 1000;

    // ── 웨이브: 매 프레임 정점 변형 ──
    var pos = geometry.attributes.position.array;
    for (var i = 0; i < pos.length; i += 3) {
      var x = basePositions[i];
      var z = basePositions[i + 2];
      var dist = Math.sqrt(x * x + z * z);
      pos[i + 1] =
        Math.sin(x * 0.25 + t * 0.3) * 1.2 +
        Math.cos(z * 0.22 + t * 0.25) * 1.0 +
        Math.sin(dist * 0.3 - t * 0.4) * 0.6;
    }
    geometry.attributes.position.needsUpdate = true;

    // 와이어프레임 지오메트리 매 프레임 재생성
    wire.geometry.dispose();
    wire.geometry = new THREE.WireframeGeometry(geometry);

    // ── 패럴랙스: 카메라 위치 lerp ──
    smooth.x += (mouse.x - smooth.x) * 0.05;
    smooth.y += (mouse.y - smooth.y) * 0.05;

    camera.position.x = baseCam.x + smooth.x * 4;
    camera.position.y = baseCam.y - smooth.y * 2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // HTML 엘리먼트 패럴랙스
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
    sections.forEach(function (s) {
      s.classList.add('in-view');
    });
  }

})();

// ════════════════════════════════════════════════════════
// PIPELINE DIAGRAM — IntersectionObserver (L-2)
// 섹션 02가 뷰포트에 들어올 때 애니메이션 발동
// ════════════════════════════════════════════════════════
(function initPipelineInView() {
  var diagram = document.querySelector('.pipeline-diagram');
  if (!diagram) return;

  if (!('IntersectionObserver' in window)) {
    diagram.classList.add('in-view');
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        diagram.classList.add('in-view');
        observer.disconnect();
      }
    });
  }, { threshold: 0.25 });

  observer.observe(diagram);
})();

(function initPipelineConnectors() {
  var diagram = document.querySelector('.pipeline-diagram');
  if (!diagram) return;

  var svg = diagram.querySelector('.pipeline-connectors');
  var modeling = diagram.querySelector('.pipeline-stage--modeling');
  var gate = diagram.querySelector('.pipeline-guard');
  var passLane = diagram.querySelector('.pipeline-pass-lane');
  var firstPassStage = passLane ? passLane.querySelector('.pipeline-stage[data-stage="2"]') : null;
  var failTarget = diagram.querySelector('.pipeline-fail-target');
  if (!svg || !modeling || !gate || !passLane || !firstPassStage || !failTarget) return;

  var neutralPath = svg.querySelector('.connector-path--neutral');
  var passPath = svg.querySelector('.connector-path--pass');
  var failPath = svg.querySelector('.connector-path--fail');
  var loopPath = svg.querySelector('.connector-path--loop');
  var passLabel = svg.querySelector('.connector-label--pass');
  var failLabel = svg.querySelector('.connector-label--fail');
  if (!neutralPath || !passPath || !failPath || !loopPath || !passLabel || !failLabel) return;

  function point(x, y) {
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  function rectPoints(rect, origin) {
    var left = rect.left - origin.left;
    var top = rect.top - origin.top;
    return {
      left: left,
      right: left + rect.width,
      top: top,
      bottom: top + rect.height,
      width: rect.width,
      height: rect.height,
      cx: left + rect.width / 2,
      cy: top + rect.height / 2
    };
  }

  function linePath(start, end) {
    return 'M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y;
  }

  function cubicPath(start, cp1, cp2, end) {
    return 'M ' + start.x + ' ' + start.y +
      ' C ' + cp1.x + ' ' + cp1.y + ', ' + cp2.x + ' ' + cp2.y + ', ' + end.x + ' ' + end.y;
  }

  function polylinePath(points) {
    if (!points.length) return '';
    var d = 'M ' + points[0].x + ' ' + points[0].y;
    for (var i = 1; i < points.length; i++) {
      d += ' L ' + points[i].x + ' ' + points[i].y;
    }
    return d;
  }

  function setLabel(el, x, y) {
    el.setAttribute('x', Math.round(x * 10) / 10);
    el.setAttribute('y', Math.round(y * 10) / 10);
  }

  function draw() {
    var origin = diagram.getBoundingClientRect();
    var width = Math.max(1, Math.round(origin.width));
    var height = Math.max(1, Math.round(origin.height));
    var modelingBox = rectPoints(modeling.getBoundingClientRect(), origin);
    var gateBox = rectPoints(gate.getBoundingClientRect(), origin);
    var passBox = rectPoints(firstPassStage.getBoundingClientRect(), origin);
    var passLaneBox = rectPoints(passLane.getBoundingClientRect(), origin);
    var failBox = rectPoints(failTarget.getBoundingClientRect(), origin);
    var isStacked = window.innerWidth < 1024;

    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    if (isStacked) {
      var neutralStart = point(modelingBox.cx, modelingBox.bottom);
      var neutralEnd = point(gateBox.cx, gateBox.top);
      var passStart = point(gateBox.cx, gateBox.bottom);
      var passEnd = point(passBox.cx, passBox.top);
      var failStart = point(gateBox.right, gateBox.cy);
      var failEnd = point(failBox.cx, failBox.top);
      var failRouteX = Math.min(width - 18, Math.max(gateBox.right, passLaneBox.right, failBox.right) + 24);
      var loopStart = point(failBox.cx, failBox.bottom);
      var loopBottomY = Math.min(height - 14, failBox.bottom + 24);
      var loopReturnY = modelingBox.bottom + 18;
      var loopEnd = point(modelingBox.cx, modelingBox.bottom);

      neutralPath.setAttribute('d', linePath(neutralStart, neutralEnd));
      passPath.setAttribute('d', linePath(passStart, passEnd));
      failPath.setAttribute('d', polylinePath([
        failStart,
        point(failRouteX, failStart.y),
        point(failRouteX, failEnd.y),
        failEnd
      ]));
      loopPath.setAttribute('d', polylinePath([
        loopStart,
        point(loopStart.x, loopBottomY),
        point(loopEnd.x, loopBottomY),
        point(loopEnd.x, loopReturnY),
        loopEnd
      ]));

      setLabel(passLabel, gateBox.cx + 52, (passStart.y + passEnd.y) / 2);
      setLabel(failLabel, failRouteX - 28, gateBox.bottom + 18);
      return;
    }

    var neutralStartDesktop = point(modelingBox.right, modelingBox.cy);
    var neutralEndDesktop = point(gateBox.left, gateBox.cy);
    var passStartDesktop = point(gateBox.right, gateBox.cy - 10);
    var passEndDesktop = point(passBox.left, passBox.cy);
    var failStartDesktop = point(gateBox.right, gateBox.cy + 10);
    var failEndDesktop = point(failBox.left, failBox.cy);
    var loopStartDesktop = point(failBox.cx, failBox.bottom);
    var loopBottomDesktop = Math.min(height - 16, Math.max(failBox.bottom, modelingBox.bottom) + 34);
    var loopEndDesktop = point(modelingBox.cx, modelingBox.bottom);
    var passCurve = Math.max(42, (passEndDesktop.x - passStartDesktop.x) * 0.32);
    var failCurve = Math.max(42, (failEndDesktop.x - failStartDesktop.x) * 0.32);

    neutralPath.setAttribute('d', linePath(neutralStartDesktop, neutralEndDesktop));
    passPath.setAttribute('d', cubicPath(
      passStartDesktop,
      point(passStartDesktop.x + passCurve, passStartDesktop.y),
      point(passEndDesktop.x - passCurve, passEndDesktop.y),
      passEndDesktop
    ));
    failPath.setAttribute('d', cubicPath(
      failStartDesktop,
      point(failStartDesktop.x + failCurve, failStartDesktop.y),
      point(failEndDesktop.x - failCurve, failEndDesktop.y),
      failEndDesktop
    ));
    loopPath.setAttribute('d', polylinePath([
      loopStartDesktop,
      point(loopStartDesktop.x, loopBottomDesktop),
      point(loopEndDesktop.x, loopBottomDesktop),
      loopEndDesktop
    ]));

    setLabel(
      passLabel,
      passStartDesktop.x + (passEndDesktop.x - passStartDesktop.x) * 0.43,
      Math.min(passStartDesktop.y, passEndDesktop.y) - 18
    );
    setLabel(
      failLabel,
      failStartDesktop.x + (failEndDesktop.x - failStartDesktop.x) * 0.43,
      Math.max(failStartDesktop.y, failEndDesktop.y) + 18
    );
  }

  var rafId = null;
  function requestDraw() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
      rafId = null;
      draw();
    });
  }

  window.addEventListener('resize', requestDraw);
  window.addEventListener('load', requestDraw);
  requestDraw();
})();

// ════════════════════════════════════════════════════════
// MARQUEE — 탭 비활성 시 일시정지 (L-5)
// CSS로 호버 정지 + reduced-motion 처리는 이미 완료.
// 여기서는 visibilitychange만 추가 (CPU 절약).
// ════════════════════════════════════════════════════════
(function initMarqueeVisibility() {
  var marquee = document.querySelector('.issues-marquee');
  if (!marquee) return;

  var track = marquee.querySelector('.marquee-track');
  if (!track) return;

  document.addEventListener('visibilitychange', function() {
    track.style.animationPlayState = document.hidden ? 'paused' : '';
  });
})();
// Hero comparison cards: independent Three.js turntables.
(function () {
  if (typeof THREE === 'undefined') return;

  var configs = [
    {
      id: 'ai',
      selector: '[data-hero-canvas="ai"]',
      modelPath: 'samples/Humanoid_AI.obj',
      showMarkers: true
    },
    {
      id: 'human',
      selector: '[data-hero-canvas="human"]',
      modelPath: 'samples/Humanoid_Human_Modified.obj',
      showMarkers: false
    }
  ];

  var cards = [];
  var running = !document.hidden;
  var lastTimestamp = null;
  var sharedRotation = 0;
  var currentSpeed = 0.3;
  var DEFAULT_SPEED = 0.3;
  var HOVER_SPEED = 0.45;
  var CAMERA_ZOOM_RATIO = 0.75;

  function parseObjTextForHero(text) {
    var vertices = [];
    var faces = [];
    var lines = text.split(/\r?\n/);

    lines.forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === '#') return;

      var parts = line.split(/\s+/);
      if (parts[0] === 'v' && parts.length >= 4) {
        vertices.push([
          parseFloat(parts[1]) || 0,
          parseFloat(parts[2]) || 0,
          parseFloat(parts[3]) || 0
        ]);
      } else if (parts[0] === 'f' && parts.length >= 4) {
        var face = [];
        for (var i = 1; i < parts.length; i++) {
          var raw = parts[i].split('/')[0];
          var idx = parseInt(raw, 10);
          if (!idx) continue;
          if (idx < 0) idx = vertices.length + idx;
          else idx = idx - 1;
          if (idx >= 0 && idx < vertices.length) face.push(idx);
        }
        for (var j = 1; j < face.length - 1; j++) {
          faces.push([face[0], face[j], face[j + 1]]);
        }
      }
    });

    return { vertices: vertices, faces: faces };
  }

  function makeGeometry(parsed) {
    var positions = [];
    parsed.faces.forEach(function (face) {
      face.forEach(function (idx) {
        var v = parsed.vertices[idx];
        positions.push(v[0], v[1], v[2]);
      });
    });

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingBox();
    return geometry;
  }

  function midpoint(a, b) {
    return [
      (a[0] + b[0]) * 0.5,
      (a[1] + b[1]) * 0.5,
      (a[2] + b[2]) * 0.5
    ];
  }

  function triangleCentroid(a, b, c) {
    return [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3
    ];
  }

  function dist(a, b) {
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    var dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function collectHeroMarkers(parsed) {
    var edges = {};
    var skinny = [];

    function addEdge(a, b) {
      var lo = Math.min(a, b);
      var hi = Math.max(a, b);
      var key = lo + '_' + hi;
      if (!edges[key]) edges[key] = { a: lo, b: hi, count: 0 };
      edges[key].count++;
    }

    parsed.faces.forEach(function (face) {
      addEdge(face[0], face[1]);
      addEdge(face[1], face[2]);
      addEdge(face[2], face[0]);

      var a = parsed.vertices[face[0]];
      var b = parsed.vertices[face[1]];
      var c = parsed.vertices[face[2]];
      var ab = dist(a, b);
      var bc = dist(b, c);
      var ca = dist(c, a);
      var longest = Math.max(ab, bc, ca);
      var shortest = Math.max(Math.min(ab, bc, ca), 0.000001);
      if (longest / shortest > 12) skinny.push(triangleCentroid(a, b, c));
    });

    var nonManifold = [];
    var boundary = [];
    Object.keys(edges).forEach(function (key) {
      var edge = edges[key];
      var p = midpoint(parsed.vertices[edge.a], parsed.vertices[edge.b]);
      if (edge.count > 2) nonManifold.push(p);
      else if (edge.count === 1) boundary.push(p);
    });

    return {
      nonManifold: nonManifold.slice(0, 220),
      boundary: boundary.slice(0, 180),
      skinny: skinny.slice(0, 220)
    };
  }

  function cssColor(varName, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return fallback;
    if (value.charAt(0) === '#') return value;
    return fallback;
  }

  function makePoints(points, color) {
    if (!points.length) return null;
    var positions = [];
    points.forEach(function (p) {
      positions.push(p[0], p[1], p[2]);
    });

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      color: color,
      size: 4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });

    return new THREE.Points(geometry, material);
  }

  function normalizeGroup(group, geometry) {
    geometry.computeBoundingBox();
    var box = geometry.boundingBox;
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z, 0.0001);

    group.position.set(-center.x, -center.y, -center.z);
    group.scale.setScalar(2.15 / maxDim);
  }

  function resizeCard(card) {
    var rect = card.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    if (card.width === w && card.height === h) return true;
    card.width = w;
    card.height = h;
    card.renderer.setSize(w, h, false);
    card.camera.aspect = w / h;
    card.camera.updateProjectionMatrix();
    return true;
  }

  function applyTheme(card) {
    var isLight = document.documentElement.getAttribute('data-theme') === 'light' ||
      document.body.classList.contains('light');
    card.lineMaterial.color.set(isLight ? 0x333333 : 0x888888);
    card.lineMaterial.opacity = isLight ? 0.58 : 0.72;
  }

  function initCard(config) {
    var canvas = document.querySelector(config.selector);
    if (!canvas) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
      });
    } catch (e) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.48, 4.2);
    camera.lookAt(0, 0.05, 0);
    var cameraDirection = camera.position.clone().normalize();
    var lookTarget = new THREE.Vector3(0, 0.05, 0);
    var baseCameraDistance = camera.position.length();

    var root = new THREE.Group();
    scene.add(root);

    var lineMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.72
    });

    var card = {
      id: config.id,
      canvas: canvas,
      renderer: renderer,
      scene: scene,
      camera: camera,
      root: root,
      lineMaterial: lineMaterial,
      visible: true,
      hover: false,
      cameraDirection: cameraDirection,
      lookTarget: lookTarget,
      baseCameraDistance: baseCameraDistance,
      currentCameraDistance: baseCameraDistance,
      targetCameraDistance: baseCameraDistance,
      width: 0,
      height: 0
    };

    var cardElement = canvas.closest('.terminal-card');
    if (cardElement) {
      cardElement.addEventListener('mouseenter', function () {
        card.hover = true;
        card.targetCameraDistance = card.baseCameraDistance * CAMERA_ZOOM_RATIO;
      });
      cardElement.addEventListener('mouseleave', function () {
        card.hover = false;
        card.targetCameraDistance = card.baseCameraDistance;
      });
    }

    resizeCard(card);
    applyTheme(card);
    cards.push(card);

    fetch(config.modelPath)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load hero model: ' + config.modelPath);
        return res.text();
      })
      .then(function (text) {
        var parsed = parseObjTextForHero(text);
        var geometry = makeGeometry(parsed);
        var edges = new THREE.EdgesGeometry(geometry, 18);
        var lines = new THREE.LineSegments(edges, lineMaterial);
        root.add(lines);

        if (config.showMarkers) {
          var markerSets = collectHeroMarkers(parsed);
          var nonManifold = makePoints(markerSets.nonManifold, cssColor('--issue-non-manifold', '#cf4b4b'));
          var boundary = makePoints(markerSets.boundary, cssColor('--issue-boundary', '#e87d3e'));
          var skinny = makePoints(markerSets.skinny, cssColor('--issue-skinny', '#c89020'));
          if (nonManifold) root.add(nonManifold);
          if (boundary) root.add(boundary);
          if (skinny) root.add(skinny);
        }

        normalizeGroup(root, geometry);
        geometry.dispose();
      })
      .catch(function () {
        canvas.classList.add('hero-card-canvas--failed');
      });
  }

  function lerp(a, b, t) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
  }

  function renderLoop(timestamp) {
    if (running) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      var delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      var anyHover = cards.some(function (card) { return card.hover; });
      var targetSpeed = anyHover ? HOVER_SPEED : DEFAULT_SPEED;
      currentSpeed = lerp(currentSpeed, targetSpeed, delta * 5);
      sharedRotation += currentSpeed * delta;

      cards.forEach(function (card) {
        if (!card.visible) return;
        if (!resizeCard(card)) return;
        card.root.rotation.y = sharedRotation;
        card.currentCameraDistance = lerp(
          card.currentCameraDistance,
          card.targetCameraDistance,
          delta * 4
        );
        card.camera.position.copy(
          card.cameraDirection.clone().multiplyScalar(card.currentCameraDistance)
        );
        card.camera.lookAt(card.lookTarget);
        card.renderer.render(card.scene, card.camera);
      });
    } else {
      lastTimestamp = null;
    }
    requestAnimationFrame(renderLoop);
  }

  function initHeroCards() {
    configs.forEach(initCard);

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var canvas = entry.target;
          cards.forEach(function (card) {
            if (card.canvas === canvas) card.visible = entry.isIntersecting;
          });
        });
      }, { threshold: 0.05 });

      configs.forEach(function (config) {
        var canvas = document.querySelector(config.selector);
        if (canvas) observer.observe(canvas);
      });
    }

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      lastTimestamp = null;
    });

    var themeObserver = new MutationObserver(function () {
      cards.forEach(applyTheme);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('resize', function () {
      cards.forEach(resizeCard);
    });

    requestAnimationFrame(renderLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroCards);
  } else {
    initHeroCards();
  }
})();
