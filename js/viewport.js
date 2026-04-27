const viewport = document.getElementById('viewport');

const W = () => viewport.clientWidth;
const H = () => viewport.clientHeight;

function readViewportBgColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-app')
    .trim() || '#1a1a1f';
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(readViewportBgColor());

const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.001, 100000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W(), H());
viewport.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 8, 5);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
fillLight.position.set(-5, -3, -5);
scene.add(fillLight);

const grid = new THREE.GridHelper(20, 40, 0x2e2e3a, 0x252530);
scene.add(grid);

let currentMode = 'wireframe';
let currentMeshes = [];
let heatmapMeshes = [];
let lastBoundingBoxSize = 1;
let bboxHelper = null;
let bboxVisible = true;
let userMarkerScale = 1.0;

const MARKER_BASE_PIXELS = 10;
const overlayGroup = new THREE.Group();
scene.add(overlayGroup);

function getIssueTokenColor(varName, fallback) {
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

const overlays = {
  degenerate: { group: new THREE.Group(), color: getIssueTokenColor('--issue-degenerate', '#e85b7a'), count: 0 },
  ngon: { group: new THREE.Group(), color: getIssueTokenColor('--issue-ngon', '#d9a336'), count: 0 },
  duplicate: { group: new THREE.Group(), color: getIssueTokenColor('--issue-duplicate', '#4a9fd4'), count: 0 },
  flipped: { group: new THREE.Group(), color: getIssueTokenColor('--issue-flipped', '#d65a2e'), count: 0 },
  'non-manifold': { group: new THREE.Group(), color: getIssueTokenColor('--issue-non-manifold', '#cf4b4b'), count: 0 },
  boundary: { group: new THREE.Group(), color: getIssueTokenColor('--issue-boundary', '#e87d3e'), count: 0 },
  isolated: { group: new THREE.Group(), color: getIssueTokenColor('--issue-isolated', '#5fb8e8'), count: 0 },
  skinny: { group: new THREE.Group(), color: getIssueTokenColor('--issue-skinny', '#c89020'), count: 0 }
};

Object.values(overlays).forEach(function(overlay) {
  overlay.group.visible = true;
  overlayGroup.add(overlay.group);
});

const DEFAULT_COLORS = {};
Object.entries(overlays).forEach(function(entry) {
  DEFAULT_COLORS[entry[0]] = entry[1].color;
});

function hexToInt(hex) {
  return parseInt(String(hex || '').replace('#', ''), 16);
}

function setViewMode(mode) {
  currentMode = mode;
  document.querySelectorAll('#topnav-view-modes > button[data-mode]').forEach(function(button) {
    button.classList.toggle('active', button.getAttribute('data-mode') === mode);
  });
  applyViewMode();

  const densityPopover = document.getElementById('density-popover');
  if (densityPopover) {
    densityPopover.classList.toggle('open', mode === 'heatmap');
  }
}

function applyViewMode() {
  currentMeshes.forEach(function(meshes) {
    if (currentMode === 'heatmap') {
      meshes.solid.visible = false;
      meshes.wire.visible = false;
    } else {
      meshes.solid.visible = currentMode === 'solid' || currentMode === 'both';
      meshes.wire.visible = currentMode === 'wireframe' || currentMode === 'both';
    }
  });

  heatmapMeshes.forEach(function(mesh) {
    mesh.visible = currentMode === 'heatmap';
  });
}

function setCurrentMeshes(meshes) {
  currentMeshes = meshes || [];
  applyViewMode();
}

function getCurrentMode() {
  return currentMode;
}

function updateMarkerSize() {
  const finalSize = MARKER_BASE_PIXELS * userMarkerScale;

  Object.values(overlays).forEach(function(overlay) {
    overlay.group.traverse(function(object) {
      if (object.isPoints && object.material && object.material.size !== undefined) {
        object.material.size = finalSize;
      }
    });
  });
}

function toggleBBoxHelper() {
  bboxVisible = !bboxVisible;
  const button = document.getElementById('bbox-toggle');
  if (bboxHelper) bboxHelper.visible = bboxVisible;
  if (button) {
    button.setAttribute('data-on', bboxVisible ? 'true' : 'false');
    button.classList.toggle('active', bboxVisible);
  }
}

function updateBBoxHelper(object, allVertsBox) {
  if (bboxHelper) {
    if (bboxHelper.geometry) bboxHelper.geometry.dispose();
    if (bboxHelper.material) bboxHelper.material.dispose();
    scene.remove(bboxHelper);
    bboxHelper = null;
  }

  const box = allVertsBox || new THREE.Box3().setFromObject(object);
  bboxHelper = new THREE.Box3Helper(box, 0xe87d3e);
  bboxHelper.visible = bboxVisible;
  scene.add(bboxHelper);
}

function applyOverlayColor(key, hex) {
  const overlay = overlays[key];
  if (!overlay) return;

  overlay.color = hex;
  overlay.group.traverse(function(object) {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(function(material) {
      if (material.color) material.color.set(hex);
    });
  });

  const card = document.querySelector('.issue-card[data-issue="' + key + '"]');
  if (card) {
    const glyph = card.querySelector('.issue-glyph');
    const countElement = card.querySelector('.issue-count');
    if (glyph) glyph.style.color = hex;
    if (countElement) countElement.style.color = hex;
  }
}

function resetColors(notify) {
  Object.entries(DEFAULT_COLORS).forEach(function(entry) {
    const key = entry[0];
    const hex = entry[1];
    applyOverlayColor(key, hex);
    const input = document.getElementById('colorpick-' + key);
    const swatch = document.getElementById('swatch-' + key);
    if (input) input.value = hex;
    if (swatch) swatch.style.background = hex;
  });

  if (notify) {
    notify('info', '색상 초기화', '기본 색상으로 되돌렸어요.', 2000);
  }
}

function randomizeColors(notify) {
  const palette = ['#ff2d55', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff6b6b', '#4ecdc4', '#a8e6cf', '#ff8b94'];
  const shuffled = palette.slice().sort(function() { return Math.random() - 0.5; });
  let index = 0;

  Object.keys(overlays).forEach(function(key) {
    const hex = shuffled[index % shuffled.length];
    index += 1;
    applyOverlayColor(key, hex);

    const input = document.getElementById('colorpick-' + key);
    const swatch = document.getElementById('swatch-' + key);
    if (input) input.value = hex;
    if (swatch) swatch.style.background = hex;
  });

  if (notify) {
    notify('info', '랜덤 색상 적용', '새로운 색상 조합으로 바꿨어요.', 2000);
  }
}

function clearOverlays() {
  Object.values(overlays).forEach(function(overlay) {
    while (overlay.group.children.length) {
      const child = overlay.group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(function(material) { material.dispose(); });
      }
      overlay.group.remove(child);
    }
    overlay.count = 0;
  });

  heatmapMeshes.forEach(function(mesh) {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(function(material) { material.dispose(); });
    }
    scene.remove(mesh);
  });

  heatmapMeshes = [];
}

function clearSceneState() {
  clearOverlays();
  currentMeshes = [];
}

function getOverlayByIssueKey(issueKey) {
  return overlays[issueKey] || null;
}

function getFirstIssuePosition(issueKey) {
  const overlay = getOverlayByIssueKey(issueKey);
  if (!overlay || !overlay.group || overlay.group.children.length === 0) return null;

  const child = overlay.group.children[0];
  if (!child.geometry || !child.geometry.attributes || !child.geometry.attributes.position) return null;

  const positions = child.geometry.attributes.position.array;
  if (!positions || positions.length < 3) return null;

  return new THREE.Vector3(positions[0], positions[1], positions[2]);
}

function focusOnIssue(issueKey, notify) {
  const position = getFirstIssuePosition(issueKey);
  if (!position) {
    if (notify) {
      notify('info', '위치를 찾을 수 없어요', '이 이슈의 위치 정보를 가져올 수 없어요.', 3000);
    }
    return;
  }

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endTarget = position.clone();
  const distance = Math.max(lastBoundingBoxSize * 0.3, 0.1);
  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() < 1e-8) direction.set(0.3, 0.4, 1.0);
  direction.normalize();

  const endPos = endTarget.clone().add(direction.multiplyScalar(distance));
  const duration = 500;
  const startTime = performance.now();

  function tween() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t * t * (3 - 2 * t);
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(tween);
  }

  tween();
}

function renderPointsOverlay(issueKey, positions) {
  if (!positions || !positions.length) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  overlays[issueKey].group.add(new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: hexToInt(overlays[issueKey].color),
      size: 1,
      sizeAttenuation: false,
      depthTest: false
    })
  ));
}

function renderLineOverlay(issueKey, positions) {
  if (!positions || !positions.length) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  overlays[issueKey].group.add(new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: hexToInt(overlays[issueKey].color),
      linewidth: 2,
      depthTest: false
    })
  ));
}

function renderMeshOverlay(issueKey, positions, opacity) {
  if (!positions || !positions.length) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  overlays[issueKey].group.add(new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: hexToInt(overlays[issueKey].color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity,
      depthTest: false
    })
  ));
}

function renderNgonOverlayData(overlayData) {
  if (!overlayData) return;

  if (overlayData.fillPositions && overlayData.fillPositions.length) {
    const fillGeometry = new THREE.BufferGeometry();
    fillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(overlayData.fillPositions, 3));
    overlays.ngon.group.add(new THREE.Mesh(
      fillGeometry,
      new THREE.MeshBasicMaterial({
        color: hexToInt(overlays.ngon.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        depthTest: false
      })
    ));
  }

  if (overlayData.linePositions && overlayData.linePositions.length) {
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(overlayData.linePositions, 3));
    overlays.ngon.group.add(new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: hexToInt(overlays.ngon.color),
        depthTest: false
      })
    ));
  }
}

function applyAnalysisVisuals(analysisData, allGeometries, modelGroup) {
  if (!analysisData) return null;

  const bboxMin = analysisData.bboxMin || [0, 0, 0];
  const bboxMax = analysisData.bboxMax || [0, 0, 0];
  lastBoundingBoxSize = analysisData.lastBoundingBoxSize || 1;

  const bbox = new THREE.Box3(
    new THREE.Vector3(bboxMin[0], bboxMin[1], bboxMin[2]),
    new THREE.Vector3(bboxMax[0], bboxMax[1], bboxMax[2])
  );
  updateBBoxHelper(null, bbox);

  const overlayData = analysisData.overlays || {};
  const stats = analysisData.stats || {
    degenCount: 0,
    ngonCount: 0,
    dupVertCount: 0,
    flippedCount: 0,
    nonManifoldCount: 0,
    boundaryCount: 0,
    isolatedCount: 0,
    skinnyCount: 0,
    densityCV: null
  };

  overlays.degenerate.count = stats.degenCount || 0;
  renderPointsOverlay('degenerate', overlayData.degenerate && overlayData.degenerate.positions);

  overlays.ngon.count = stats.ngonCount || 0;
  renderNgonOverlayData(overlayData.ngon);

  overlays.duplicate.count = stats.dupVertCount || 0;
  renderPointsOverlay('duplicate', overlayData.duplicate && overlayData.duplicate.positions);

  overlays.flipped.count = stats.flippedCount || 0;
  renderMeshOverlay('flipped', overlayData.flipped && overlayData.flipped.positions, 0.6);

  overlays['non-manifold'].count = stats.nonManifoldCount || 0;
  renderLineOverlay('non-manifold', overlayData['non-manifold'] && overlayData['non-manifold'].positions);

  overlays.boundary.count = stats.boundaryCount || 0;
  renderLineOverlay('boundary', overlayData.boundary && overlayData.boundary.positions);

  overlays.isolated.count = stats.isolatedCount || 0;
  renderPointsOverlay('isolated', overlayData.isolated && overlayData.isolated.positions);

  overlays.skinny.count = stats.skinnyCount || 0;
  renderMeshOverlay('skinny', overlayData.skinny && overlayData.skinny.positions, 0.7);

  buildVertexDensityMap(allGeometries, modelGroup);
  updateMarkerSize();

  return stats;
}

function buildVertexDensityMap(geometries, modelGroup) {
  if (!Array.isArray(geometries)) geometries = [geometries];
  geometries = geometries.filter(function(geometry) {
    return geometry && geometry.attributes && geometry.attributes.position;
  });
  if (geometries.length === 0) return { densityCV: null };

  const colLo = new THREE.Color(0xef4444);
  const colMid = new THREE.Color(0x22c55e);
  const colHi = new THREE.Color(0x3b82f6);
  const tmp = new THREE.Color();
  const SAMPLE_MAX = 50000;
  const spacingSample = [];

  geometries.forEach(function(geometry) {
    const position = geometry.attributes.position;
    const vertexCount = position.count;
    const faceCount = vertexCount / 3;
    if (faceCount < 1) return;

    const step = Math.max(1, Math.floor(faceCount / (SAMPLE_MAX / geometries.length)));
    for (let face = 0; face < faceCount; face += step) {
      const i0 = face * 3;
      const i1 = face * 3 + 1;
      const i2 = face * 3 + 2;
      const ax = position.getX(i0);
      const ay = position.getY(i0);
      const az = position.getZ(i0);
      const bx = position.getX(i1);
      const by = position.getY(i1);
      const bz = position.getZ(i1);
      const cx = position.getX(i2);
      const cy = position.getY(i2);
      const cz = position.getZ(i2);
      const dab = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
      const dbc = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2 + (cz - bz) ** 2);
      const dca = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2 + (az - cz) ** 2);
      const avg = (dab + dbc + dca) / 3;
      if (avg > 0) spacingSample.push(avg);
    }
  });

  const sampleF32 = new Float32Array(spacingSample);
  sampleF32.sort();
  const p5 = sampleF32[Math.floor(sampleF32.length * 0.05)] || 0;
  const p95 = sampleF32[Math.floor(sampleF32.length * 0.95)] || 1;
  const range = (p95 - p5) || 1;

  let sum = 0;
  for (let index = 0; index < sampleF32.length; index += 1) sum += sampleF32[index];
  const mean = sampleF32.length > 0 ? sum / sampleF32.length : 1;
  let variance = 0;
  for (let index = 0; index < sampleF32.length; index += 1) {
    const delta = sampleF32[index] - mean;
    variance += delta * delta;
  }
  const densityCV = mean > 0 ? Math.sqrt(variance / sampleF32.length) / mean : null;

  const copyTransform = function(target) {
    if (modelGroup) {
      target.position.copy(modelGroup.position);
      target.rotation.copy(modelGroup.rotation);
      target.scale.copy(modelGroup.scale);
    }
    target.visible = currentMode === 'heatmap';
  };

  geometries.forEach(function(geometry) {
    const position = geometry.attributes.position;
    const vertexCount = position.count;
    const faceCount = vertexCount / 3;
    if (faceCount < 1) return;

    const edgeLenSum = new Float32Array(vertexCount);
    const edgeLenCount = new Uint8Array(vertexCount);

    for (let face = 0; face < faceCount; face += 1) {
      const i0 = face * 3;
      const i1 = face * 3 + 1;
      const i2 = face * 3 + 2;
      const ax = position.getX(i0);
      const ay = position.getY(i0);
      const az = position.getZ(i0);
      const bx = position.getX(i1);
      const by = position.getY(i1);
      const bz = position.getZ(i1);
      const cx = position.getX(i2);
      const cy = position.getY(i2);
      const cz = position.getZ(i2);
      const dab = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
      const dbc = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2 + (cz - bz) ** 2);
      const dca = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2 + (az - cz) ** 2);
      edgeLenSum[i0] += dab + dca;
      edgeLenCount[i0] += 2;
      edgeLenSum[i1] += dab + dbc;
      edgeLenCount[i1] += 2;
      edgeLenSum[i2] += dbc + dca;
      edgeLenCount[i2] += 2;
    }

    const vertexColors = new Float32Array(vertexCount * 3);
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const spacing = edgeLenCount[vertex] > 0 ? edgeLenSum[vertex] / edgeLenCount[vertex] : p5;
      const t = Math.max(0, Math.min(1, (spacing - p5) / range));
      if (t < 0.5) tmp.lerpColors(colLo, colMid, t * 2);
      else tmp.lerpColors(colMid, colHi, (t - 0.5) * 2);
      vertexColors[vertex * 3] = tmp.r;
      vertexColors[vertex * 3 + 1] = tmp.g;
      vertexColors[vertex * 3 + 2] = tmp.b;
    }

    const densityGeometry = new THREE.BufferGeometry();
    densityGeometry.setAttribute('position', geometry.attributes.position);
    densityGeometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));

    const densityMesh = new THREE.Mesh(
      densityGeometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        transparent: false
      })
    );
    copyTransform(densityMesh);
    scene.add(densityMesh);
    heatmapMeshes.push(densityMesh);

    const wireGeometry = new THREE.BufferGeometry();
    wireGeometry.setAttribute('position', geometry.attributes.position);
    const wireMesh = new THREE.Mesh(
      wireGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
        depthTest: true
      })
    );
    copyTransform(wireMesh);
    scene.add(wireMesh);
    heatmapMeshes.push(wireMesh);
  });

  return { densityCV: densityCV };
}

function frameModel(modelGroup) {
  const box = new THREE.Box3().setFromObject(modelGroup);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  camera.position.copy(center).add(new THREE.Vector3(0, maxDim * 0.5, maxDim * 2.5));
  controls.target.copy(center);
  controls.update();
  grid.position.y = box.min.y;
  overlayGroup.position.copy(modelGroup.position);
  overlayGroup.rotation.copy(modelGroup.rotation);
  overlayGroup.scale.copy(modelGroup.scale);

  return { box: box, center: center, size: size, maxDim: maxDim };
}

function applyThemeToViewport(isLight) {
  scene.background = new THREE.Color(readViewportBgColor());

  if (grid) {
    grid.material.color.set(isLight ? 0xc0c0cc : 0x2e2e3a);
    if (Array.isArray(grid.material)) {
      grid.material[0].color.set(isLight ? 0xa0a0b0 : 0x2e2e3a);
      grid.material[1].color.set(isLight ? 0xc8c8d8 : 0x252530);
    }
  }
}

let viewportInitialized = false;

function initViewport() {
  if (viewportInitialized) return;
  viewportInitialized = true;

  const viewModeButtons = document.querySelectorAll('#topnav-view-modes > button[data-mode]');
  const menuButton = document.getElementById('topnav-menu-btn');
  const menuDropdown = document.getElementById('topnav-menu-dropdown');
  const bboxToggleButton = document.getElementById('bbox-toggle');
  const markerSlider = document.getElementById('marker-size-slider');
  const markerValue = document.getElementById('marker-size-val');

  viewModeButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      setViewMode(button.getAttribute('data-mode'));
    });
  });

  if (menuButton && menuDropdown) {
    menuButton.addEventListener('click', function(event) {
      event.stopPropagation();
      menuDropdown.classList.toggle('open');
    });

    document.addEventListener('click', function(event) {
      if (!menuDropdown.contains(event.target) && event.target !== menuButton) {
        menuDropdown.classList.remove('open');
      }
    });
  }

  if (bboxToggleButton) {
    bboxToggleButton.addEventListener('click', function() {
      toggleBBoxHelper();
    });
  }

  if (markerSlider) {
    markerSlider.addEventListener('input', function() {
      userMarkerScale = parseFloat(markerSlider.value);
      if (markerValue) markerValue.textContent = userMarkerScale.toFixed(1) + 'x';
      updateMarkerSize();
    });
  }

  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', function() {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });
}

export {
  viewport,
  scene,
  camera,
  renderer,
  controls,
  grid,
  overlays,
  overlayGroup,
  initViewport,
  setViewMode,
  applyViewMode,
  setCurrentMeshes,
  getCurrentMode,
  updateMarkerSize,
  toggleBBoxHelper,
  updateBBoxHelper,
  applyOverlayColor,
  resetColors,
  randomizeColors,
  clearOverlays,
  clearSceneState,
  getOverlayByIssueKey,
  getFirstIssuePosition,
  focusOnIssue,
  renderPointsOverlay,
  renderLineOverlay,
  renderMeshOverlay,
  renderNgonOverlayData,
  applyAnalysisVisuals,
  buildVertexDensityMap,
  frameModel,
  applyThemeToViewport
};
