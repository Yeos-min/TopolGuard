(function() {
  var canvas = document.getElementById('hero-preview-scene');
  var svg = document.getElementById('hero-preview-leaders');
  if (!canvas || !svg || !window.THREE) return;

  var THREE = window.THREE;
  var card = canvas.closest('.hero-preview-card');
  if (!card) return;

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim() || '#10b981';
  var ink = style.getPropertyValue('--ink').trim() || '#ffffff';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isVisible = true;
  var isPointerInside = false;
  var isDragging = false;
  var rafId = 0;
  var rotationBase = { x: 0.3, y: 0 };
  var hoverOffset = { x: 0, y: 0 };
  var hoverTarget = { x: 0, y: 0 };
  var lastPointer = { x: 0, y: 0 };

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
  } catch (err) {
    card.classList.add('hero-preview-unavailable');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(1.2, 0.8, 4.5);
  camera.lookAt(0, 0, 0);

  var tesseract = new THREE.Group();
  tesseract.rotation.x = rotationBase.x;
  tesseract.rotation.z = 0.15;
  var innerSize = 0.72;
  var outerSize = 1.52;
  var innerHalf = innerSize / 2;
  var outerHalf = outerSize / 2;

  var edgeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(ink),
    transparent: true,
    opacity: 0.56
  });
  var outerMaterial = edgeMaterial.clone();
  outerMaterial.opacity = 0.38;
  var connectorMaterial = edgeMaterial.clone();
  connectorMaterial.opacity = 0.32;

  function makeCubeEdges(size, material) {
    var box = new THREE.BoxGeometry(size, size, size);
    var edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return new THREE.LineSegments(edges, material);
  }

  tesseract.add(makeCubeEdges(innerSize, edgeMaterial));
  tesseract.add(makeCubeEdges(outerSize, outerMaterial));

  var connectorPositions = [];
  var pointPositions = [];
  for (var i = 0; i < 8; i++) {
    var x1 = (i & 1) ? innerHalf : -innerHalf;
    var y1 = (i & 2) ? innerHalf : -innerHalf;
    var z1 = (i & 4) ? innerHalf : -innerHalf;
    var x2 = (i & 1) ? outerHalf : -outerHalf;
    var y2 = (i & 2) ? outerHalf : -outerHalf;
    var z2 = (i & 4) ? outerHalf : -outerHalf;
    connectorPositions.push(x1, y1, z1, x2, y2, z2);
    pointPositions.push(x2, y2, z2);
  }

  var connectorGeometry = new THREE.BufferGeometry();
  connectorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectorPositions, 3));
  tesseract.add(new THREE.LineSegments(connectorGeometry, connectorMaterial));

  var pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
  var pointsMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(accent),
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95
  });
  tesseract.add(new THREE.Points(pointsGeometry, pointsMaterial));

  scene.add(tesseract);

  var anchors = [
    new THREE.Vector3(-outerHalf, outerHalf, outerHalf),
    new THREE.Vector3(outerHalf, outerHalf, outerHalf),
    new THREE.Vector3(-outerHalf, -outerHalf, outerHalf),
    new THREE.Vector3(outerHalf, -outerHalf, outerHalf)
  ];
  var labelPositions = ['tl', 'tr', 'bl', 'br'];
  var leaderPaths = [];
  var leaderDots = [];
  var svgNS = 'http://www.w3.org/2000/svg';

  function buildLeaders() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    leaderPaths = [];
    leaderDots = [];
    for (var i = 0; i < anchors.length; i++) {
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('class', 'hero-preview-line');
      var dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'hero-preview-dot');
      dot.setAttribute('r', '3');
      svg.appendChild(path);
      svg.appendChild(dot);
      leaderPaths.push(path);
      leaderDots.push(dot);
    }
  }

  function resize() {
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
    updateLeaders();
  }

  function getLabelAnchor(kind, width, height) {
    var pad = Math.min(40, width * 0.07);
    var labelRun = Math.min(110, width * 0.18);
    var top = Math.min(62, height * 0.16);
    var bottom = height - Math.min(50, height * 0.14);
    if (kind === 'tl') return { x: pad + labelRun, y: top };
    if (kind === 'tr') return { x: width - pad - labelRun, y: top };
    if (kind === 'bl') return { x: pad + labelRun, y: bottom };
    return { x: width - pad - labelRun, y: bottom };
  }

  function updateLeaders() {
    var rect = card.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;
    if (!width || !height) return;

    tesseract.updateMatrixWorld(true);
    for (var i = 0; i < anchors.length; i++) {
      var projected = anchors[i].clone();
      tesseract.localToWorld(projected);
      projected.project(camera);

      var screenX = (projected.x * 0.5 + 0.5) * width;
      var screenY = (-projected.y * 0.5 + 0.5) * height;
      var label = getLabelAnchor(labelPositions[i], width, height);
      var stubX = label.x + (label.x < width / 2 ? 20 : -20);
      var d = 'M ' + label.x + ' ' + label.y + ' L ' + stubX + ' ' + label.y + ' L ' + screenX + ' ' + screenY;

      leaderPaths[i].setAttribute('d', d);
      leaderDots[i].setAttribute('cx', screenX);
      leaderDots[i].setAttribute('cy', screenY);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateHoverTarget(event) {
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    var ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    nx = clamp(nx, -1, 1);
    ny = clamp(ny, -1, 1);
    hoverTarget.x = ny * 0.16;
    hoverTarget.y = nx * 0.22;
  }

  function onPointerEnter(event) {
    isPointerInside = true;
    updateHoverTarget(event);
  }

  function onPointerMove(event) {
    if (isDragging) {
      var dx = event.clientX - lastPointer.x;
      var dy = event.clientY - lastPointer.y;
      rotationBase.y += dx * 0.007;
      rotationBase.x += dy * 0.007;
      rotationBase.x = clamp(rotationBase.x, -Math.PI * 0.65, Math.PI * 0.65);
      lastPointer.x = event.clientX;
      lastPointer.y = event.clientY;
      return;
    }
    if (isPointerInside) updateHoverTarget(event);
  }

  function onPointerLeave() {
    if (isDragging) return;
    isPointerInside = false;
    hoverTarget.x = 0;
    hoverTarget.y = 0;
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    isDragging = true;
    card.classList.add('is-dragging');
    rotationBase.x = tesseract.rotation.x - hoverOffset.x;
    rotationBase.y = tesseract.rotation.y - hoverOffset.y;
    hoverTarget.x = 0;
    hoverTarget.y = 0;
    hoverOffset.x = 0;
    hoverOffset.y = 0;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    if (card.setPointerCapture) card.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event) {
    isDragging = false;
    card.classList.remove('is-dragging');
    if (card.releasePointerCapture && card.hasPointerCapture && card.hasPointerCapture(event.pointerId)) {
      card.releasePointerCapture(event.pointerId);
    }
    isPointerInside = card.matches(':hover');
    if (isPointerInside) {
      updateHoverTarget(event);
    } else {
      hoverTarget.x = 0;
      hoverTarget.y = 0;
    }
  }

  function tick() {
    if (isVisible && !document.hidden) {
      if (!reduceMotion && !isDragging) {
        rotationBase.y += isPointerInside ? 0.0012 : 0.003;
        rotationBase.x += isPointerInside ? 0.0005 : 0.0015;
      }
      hoverOffset.x += (hoverTarget.x - hoverOffset.x) * 0.08;
      hoverOffset.y += (hoverTarget.y - hoverOffset.y) * 0.08;
      tesseract.rotation.x = rotationBase.x + hoverOffset.x;
      tesseract.rotation.y = rotationBase.y + hoverOffset.y;
      tesseract.rotation.z = 0.15;
      renderer.render(scene, camera);
      updateLeaders();
    }
    rafId = requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      isVisible = entries[0] ? entries[0].isIntersecting : true;
    }, { threshold: 0.02 });
    observer.observe(card);
  }

  buildLeaders();
  resize();
  card.addEventListener('pointerenter', onPointerEnter);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerleave', onPointerLeave);
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', resize);
  rafId = requestAnimationFrame(tick);

  window.addEventListener('pagehide', function() {
    if (rafId) cancelAnimationFrame(rafId);
    card.removeEventListener('pointerenter', onPointerEnter);
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerleave', onPointerLeave);
    card.removeEventListener('pointerdown', onPointerDown);
    card.removeEventListener('pointerup', onPointerUp);
    card.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('resize', resize);
    renderer.dispose();
  });
})();
