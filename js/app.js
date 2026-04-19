// ════════════════════════════════════════════════════════
// TopolGuard — INSPECTOR APP
// 이 파일은 원본 단일 HTML의 <script> 블록을 그대로 이관한 것입니다.
// Three.js / OBJLoader / OrbitControls / BufferGeometryUtils 는
// app.html 에서 CDN <script> 로 먼저 로드되어 전역 THREE 에 있어야 합니다.
// ════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════
// ANIMATION SYSTEM
// ════════════════════════════════════════════════════════

// localStorage에서 설정 복원 (기본값: ON)
let animEnabled = localStorage.getItem('tg_anim') !== 'false';
let animRunning = false;
let animSkipped = false;
let animTimeouts = [];  // 취소 가능하도록 timeout ID 수집

function applyAnimToggleUI() {
  const animBtn = document.getElementById('anim-icon-btn');
  if (animBtn) animBtn.classList.toggle('active', animEnabled);
}

function toggleAnimSetting() {
  animEnabled = !animEnabled;
  localStorage.setItem('tg_anim', animEnabled);
  applyAnimToggleUI();
  showToast('info',
    animEnabled ? '애니메이션 ON' : '애니메이션 OFF',
    animEnabled ? '다음 검사부터 연출이 재생돼요.' : '결과가 즉시 표시돼요.',
    2000);
}

function skipAnimation() {
  animSkipped = true;
  // 대기 중인 setTimeout 전부 취소
  animTimeouts.forEach(id => clearTimeout(id));
  animTimeouts = [];
  // 스킵 버튼 숨기기
  document.getElementById('skip-btn').classList.remove('visible');
  document.getElementById('scan-line').classList.remove('active');
  animRunning = false;
  // 즉시 완전 표시 상태로
  finalizeAnimation();
}

// 애니메이션이 끝났거나 스킵됐을 때 호출 — 숨겨진 요소 전부 표시
let _pendingFinalizeCallback = null;
function finalizeAnimation() {
  if (_pendingFinalizeCallback) {
    _pendingFinalizeCallback();
    _pendingFinalizeCallback = null;
  }
}

// 딜레이 래퍼: animSkipped 상태면 즉시 실행, 아니면 setTimeout
function animDelay(fn, ms) {
  if (!animEnabled || animSkipped) { fn(); return; }
  const id = setTimeout(fn, ms);
  animTimeouts.push(id);
  return id;
}

// 숫자 카운트업 애니메이션
function countUpTo(el, targetVal, duration, suffix) {
  if (!animEnabled || animSkipped) {
    el.textContent = targetVal + (suffix || '');
    return;
  }
  suffix = suffix || '';
  const start = performance.now();
  const startVal = 0;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const cur = Math.round(startVal + (targetVal - startVal) * ease);
    el.textContent = cur + suffix;
    if (t < 1 && !animSkipped) requestAnimationFrame(tick);
    else el.textContent = targetVal + suffix;
  }
  requestAnimationFrame(tick);
}

// 초기 UI 반영
document.addEventListener('DOMContentLoaded', function() {
  applyAnimToggleUI();
  initViewportTabs();
  initHistoryDrawer();
  initHistoryResize();
  initHistoryPreview();
});

function initHistoryDrawer() {
  var drawer = document.getElementById('history-drawer');
  if (!drawer) return;
  var header = drawer.querySelector('.history-drawer-header');
  if (!header) return;
  var STORAGE_KEY = 'topolguard-history-drawer-state';

  var savedState = localStorage.getItem(STORAGE_KEY);
  if (savedState === 'expanded') {
    drawer.classList.remove('collapsed');
    drawer.classList.add('expanded');
  }

  header.addEventListener('click', function() {
    var isExpanded = drawer.classList.contains('expanded');
    drawer.classList.toggle('expanded');
    drawer.classList.toggle('collapsed');
    localStorage.setItem(STORAGE_KEY, isExpanded ? 'collapsed' : 'expanded');
  });
}

function initHistoryResize() {
  var drawer = document.getElementById('history-drawer');
  if (!drawer) return;
  var handleRight = drawer.querySelector('.history-resize-handle-right');
  var handleBottom = drawer.querySelector('.history-resize-handle-bottom');
  var handleCorner = drawer.querySelector('.history-resize-handle-corner');
  var body = drawer.querySelector('.history-drawer-body');
  if (!handleRight || !handleBottom || !body) return;

  var MIN_WIDTH = 160;
  var MAX_WIDTH = 500;
  var MIN_HEIGHT = 80;
  var MAX_HEIGHT = window.innerHeight * 0.85;

  var savedWidth = localStorage.getItem('topolguard-history-width');
  var savedHeight = localStorage.getItem('topolguard-history-height');
  if (savedWidth) drawer.style.width = savedWidth;
  if (savedHeight) drawer.style.setProperty('--history-drawer-height', savedHeight);

  handleRight.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var startX = e.clientX;
    var startWidth = drawer.offsetWidth;

    function onMouseMove(e) {
      var newWidth = startWidth + (e.clientX - startX);
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      drawer.style.width = newWidth + 'px';
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('topolguard-history-width', drawer.style.width);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  handleBottom.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var startY = e.clientY;
    var startHeight = body.offsetHeight;
    MAX_HEIGHT = window.innerHeight * 0.85;

    function onMouseMove(e) {
      var newHeight = startHeight + (e.clientY - startY);
      newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      drawer.style.setProperty('--history-drawer-height', newHeight + 'px');
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('topolguard-history-height', drawer.style.getPropertyValue('--history-drawer-height'));
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  if (handleCorner) {
    handleCorner.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var startX = e.clientX;
      var startY = e.clientY;
      var startWidth = drawer.offsetWidth;
      var startHeight = body.offsetHeight;
      MAX_HEIGHT = window.innerHeight * 0.85;

      function onMouseMove(e) {
        var newWidth = startWidth + (e.clientX - startX);
        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        drawer.style.width = newWidth + 'px';

        var newHeight = startHeight + (e.clientY - startY);
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
        drawer.style.setProperty('--history-drawer-height', newHeight + 'px');
      }
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        localStorage.setItem('topolguard-history-width', drawer.style.width);
        localStorage.setItem('topolguard-history-height', drawer.style.getPropertyValue('--history-drawer-height'));
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
}

function initHistoryPreview() {
  var list = document.getElementById('history-list');
  var preview = document.getElementById('history-preview');
  var previewImg = document.getElementById('history-preview-img');
  var drawer = document.getElementById('history-drawer');
  if (!list || !preview || !previewImg || !drawer) return;

  list.addEventListener('mouseover', function(e) {
    var item = e.target.closest('.history-item');
    if (!item) return;
    var img = item.querySelector('.history-thumb img');
    if (!img || !img.src) return;

    previewImg.src = img.src;

    var drawerRect = drawer.getBoundingClientRect();
    var itemRect = item.getBoundingClientRect();
    var topPos = itemRect.top;
    if (topPos + 230 > window.innerHeight) {
      topPos = window.innerHeight - 240;
    }

    preview.style.left = (drawerRect.right + 8) + 'px';
    preview.style.top = topPos + 'px';
    preview.classList.remove('hidden');
  });

  list.addEventListener('mouseout', function(e) {
    var item = e.target.closest('.history-item');
    if (!item) return;
    if (item.contains(e.relatedTarget)) return;
    preview.classList.add('hidden');
  });
}

// ════════════════════════════════════════════════════════
// HISTORY SYSTEM (메모리 방식 — localStorage 미사용)
// ════════════════════════════════════════════════════════
var historyEntries = [];
var MAX_HISTORY = 15;
var currentLoadedFile = null;
var _pendingLoad = null; // 로드 중인 파일 정보 임시 저장

function captureHistoryThumbnail() {
  try {
    if (!modelGroup) return '';
    var savedPos = camera.position.clone();
    var savedTarget = controls.target.clone();

    var box = new THREE.Box3().setFromObject(modelGroup);
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z);
    var fov = camera.fov * (Math.PI / 180);
    var dist = (maxDim / 2) / Math.tan(fov / 2) * 1.3;

    camera.position.set(center.x, center.y, center.z + dist);
    controls.target.copy(center);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    var thumbnailDataURL = renderer.domElement.toDataURL('image/png');

    camera.position.copy(savedPos);
    controls.target.copy(savedTarget);
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();

    return thumbnailDataURL;
  } catch (e) {
    if (savedPos && savedTarget) {
      camera.position.copy(savedPos);
      controls.target.copy(savedTarget);
      camera.lookAt(controls.target);
      camera.updateProjectionMatrix();
    }
    console.warn('히스토리 썸네일 캡처 실패:', e);
    return '';
  }
}

function addToHistory(info, analysisData) {
  // 같은 파일명 중복 방지: 기존 항목 제거 후 맨 위에 재추가
  historyEntries = historyEntries.filter(function(e) { return e.name !== info.name; });

  historyEntries.unshift({
    name: info.name,
    verts: analysisData.verts,
    health: analysisData.health,
    thumbnail: captureHistoryThumbnail(),
    loadedAt: Date.now(),
    isSample: info.isSample,
    samplePath: info.samplePath || null,
    objText: info.isSample ? null : info.objText
  });

  // 최대 5개
  if (historyEntries.length > MAX_HISTORY) {
    historyEntries.pop();
  }

  currentLoadedFile = info.name;
  renderHistory();
  renderSampleButtons();
}

function renderHistory() {
  var container = document.getElementById('history-list');
  var emptyEl = document.getElementById('history-empty');

  if (historyEntries.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    // 기존 엔트리 제거
    var entries = container.querySelectorAll('.history-entry, .history-item');
    entries.forEach(function(e) { e.remove(); });
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  // 기존 엔트리 제거 후 재렌더
  var oldEntries = container.querySelectorAll('.history-entry, .history-item');
  oldEntries.forEach(function(e) { e.remove(); });

  historyEntries.forEach(function(entry, idx) {
    var el = document.createElement('li');
    el.className = 'history-item';
    el.onclick = function() { reloadFromHistory(idx); };

    el.innerHTML =
      '<div class="history-thumb">' +
        (entry.thumbnail ? '<img src="' + entry.thumbnail + '" alt="thumbnail">' : '') +
      '</div>' +
      '<span class="history-name">' + escapeHtml(entry.name) + '</span>';

    container.appendChild(el);
  });
}

function reloadFromHistory(idx) {
  var entry = historyEntries[idx];
  if (!entry) return;

  if (entry.isSample && entry.samplePath) {
    loadSample(entry.samplePath, entry.name, entry.name.indexOf('Good') >= 0 ? '✓' : '⚠');
  } else if (entry.objText) {
    _pendingLoad = { isSample: false, name: entry.name, objText: entry.objText };
    var blob = new Blob([entry.objText], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    loadModel(url, entry.objText);
  }
}

function formatVerts(v) {
  var n = parseInt(String(v).replace(/,/g, ''), 10);
  if (isNaN(n)) return v;
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function relativeTime(ts) {
  var diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return Math.floor(diff / 60) + '분 전';
  return Math.floor(diff / 3600) + '시간 전';
}

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// 30초마다 상대 시간 갱신
setInterval(function() {
  var spans = document.querySelectorAll('.history-time');
  spans.forEach(function(span) {
    var ts = parseInt(span.dataset.time, 10);
    if (ts) span.textContent = relativeTime(ts);
  });
}, 30000);

// ════════════════════════════════════════════════════════
// SIDEBAR SAMPLE BUTTONS
// ════════════════════════════════════════════════════════
var SAMPLE_PATHS = {
  good: 'samples/Good_Low_Poly_Male_body_AI.obj',
  bad:  'samples/Bad_Low_Poly_Male_body_AI.obj'
};

function loadSampleFromSidebar(which) {
  var path = SAMPLE_PATHS[which];
  var name = path.split('/').pop();
  var icon = which === 'good' ? '✓' : '⚠';
  loadSample(path, name, icon);
}

function renderSampleButtons() {
  var goodBtn = document.getElementById('sample-good-btn');
  var badBtn  = document.getElementById('sample-bad-btn');
  if (!goodBtn || !badBtn) return;

  var goodName = SAMPLE_PATHS.good.split('/').pop();
  var badName  = SAMPLE_PATHS.bad.split('/').pop();

  goodBtn.classList.toggle('active', currentLoadedFile === goodName);
  badBtn.classList.toggle('active', currentLoadedFile === badName);
}

// 키보드 단축키: G(Good), B(Bad)
document.addEventListener('keydown', function(e) {
  // 입력 필드에 포커스 있으면 무시
  var tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (document.activeElement && document.activeElement.isContentEditable) return;

  if (e.key === 'g' || e.key === 'G') { loadSampleFromSidebar('good'); }
  if (e.key === 'b' || e.key === 'B') { loadSampleFromSidebar('bad'); }
});

// ════════════════════════════════════════════════════════
// QUICK START SAMPLE LOADER
// ════════════════════════════════════════════════════════
function loadSample(path, name, icon) {
  _pendingLoad = { isSample: true, samplePath: path, name: name || path.split('/').pop() };
  showToast('info', icon + ' ' + name + ' 로드 중', '샘플 파일을 불러오고 있어요...', 3000);
  fetch(path)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function(text) {
      const blob = new Blob([text], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      loadModel(url, text);
    })
    .catch(function(err) {
      console.error(err);
      _pendingLoad = null;
      showToast('error', '샘플을 불러오지 못했어요',
        '파일을 가져올 수 없어요. (' + path + ')', 6000);
    });
}

// ════════════════════════════════════════════════════════
// TOAST SYSTEM
// ════════════════════════════════════════════════════════
const TOAST_ICONS = { error: '✕', warn: '⚠', info: 'ℹ', success: '✓' };
function showToast(type, title, msg, duration) {
  duration = duration || 5000;
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML =
    '<span class="toast-icon">' + TOAST_ICONS[type] + '</span>' +
    '<div class="toast-body"><div class="toast-title">' + title + '</div>' +
    (msg ? '<div class="toast-msg">' + msg + '</div>' : '') + '</div>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">×</button>';
  container.appendChild(el);
  if (duration > 0) {
    setTimeout(function() {
      el.style.animation = 'toast-out 0.3s ease-in forwards';
      setTimeout(function() { el.remove(); }, 300);
    }, duration);
  }
  return el;
}

// ════════════════════════════════════════════════════════
// FILE VALIDATION
// ════════════════════════════════════════════════════════
const MAX_FILE_SIZE_MB    = 500;
const MAX_VERTEX_COUNT    = 3000000;
const WARN_VERTEX_COUNT   = 1000000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function quickCountVertices(text) {
  let count = 0, idx = 0;
  while (idx < text.length) {
    const nl = text.indexOf('\n', idx);
    const lineEnd = nl === -1 ? text.length : nl;
    if (text[idx] === 'v' && text[idx+1] === ' ') count++;
    idx = lineEnd + 1;
  }
  return count;
}

function validateAndLoad(file) {
  if (!file.name.toLowerCase().endsWith('.obj')) {
    showToast('error', '이 파일은 열 수 없어요', '.obj 파일만 열 수 있어요. 현재 파일: ' + file.name);
    return;
  }
  const sizeMB = (file.size / (1024*1024)).toFixed(1);
  if (file.size > MAX_FILE_SIZE_BYTES) {
    showToast('error', '파일이 너무 커요', '최대 ' + MAX_FILE_SIZE_MB + 'MB까지 열 수 있어요. 현재: ' + sizeMB + 'MB');
    return;
  }
  const reader = new FileReader();
  reader.onerror = function() { showToast('error', '파일을 읽지 못했어요', '파일이 손상되었을 수 있어요.'); };
  reader.onload = function(ev) {
    const text = ev.target.result;
    const vertCount = quickCountVertices(text);
    if (vertCount > MAX_VERTEX_COUNT) {
      showToast('error', '정점 수 초과 — 열 수 없어요',
        '최대 ' + MAX_VERTEX_COUNT.toLocaleString() + '개까지 지원해요. 이 파일: ' + vertCount.toLocaleString() + '개', 10000);
      return;
    }
    if (vertCount > WARN_VERTEX_COUNT) {
      showToast('warn', '대용량 모델이에요',
        vertCount.toLocaleString() + '개 이상 정점 — 검사에 시간이 걸릴 수 있어요.', 7000);
    }
    _pendingLoad = { isSample: false, name: file.name, objText: text };
    const url = URL.createObjectURL(file);
    loadModel(url, text);
  };
  reader.readAsText(file);
}

// ════════════════════════════════════════════════════════
// SCENE SETUP
// ════════════════════════════════════════════════════════
const viewport = document.getElementById('viewport');
const W = () => viewport.clientWidth;
const H = () => viewport.clientHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1f);

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

// ════════════════════════════════════════════════════════
// VIEW MODE (including HEATMAP)
// ════════════════════════════════════════════════════════
let currentMode = 'wireframe';
let currentMeshes = [];
let heatmapMeshes = []; // stores heatmap THREE.Mesh objects
let lastBoundingBoxSize = 1;

function setViewMode(mode, btn) {
  currentMode = mode;
  document.querySelectorAll('#topbar-view-modes > button[data-mode]').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-mode') === mode);
  });
  applyViewMode();
  var densityPopover = document.getElementById('density-popover');
  if (densityPopover) {
    if (mode === 'heatmap') {
      densityPopover.classList.add('open');
    } else {
      densityPopover.classList.remove('open');
    }
  }
}

function applyViewMode() {
  currentMeshes.forEach(({ solid, wire }) => {
    if (currentMode === 'heatmap') {
      solid.visible = false;
      wire.visible  = false;
    } else {
      solid.visible = currentMode === 'solid' || currentMode === 'both';
      wire.visible  = currentMode === 'wireframe' || currentMode === 'both';
    }
  });
  heatmapMeshes.forEach(m => { m.visible = currentMode === 'heatmap'; });
}

function initViewportTabs() {
  const viewModeBtns = document.querySelectorAll('#topbar-view-modes > button[data-mode]');
  var menuBtn = document.getElementById('topbar-menu-btn');
  var menuDropdown = document.getElementById('topbar-menu-dropdown');
  var bboxToggleBtn = document.getElementById('bbox-toggle');

  viewModeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      viewModeBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      setViewMode(btn.getAttribute('data-mode'), null);
    });
  });

  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      menuDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
        menuDropdown.classList.remove('open');
      }
    });
  }

  if (bboxToggleBtn) {
    bboxToggleBtn.addEventListener('click', function() {
      var isOn = bboxToggleBtn.getAttribute('data-on') === 'true';
      bboxToggleBtn.setAttribute('data-on', String(!isOn));
      if (typeof boxHelper !== 'undefined' && boxHelper) {
        boxHelper.visible = !isOn;
      }
    });
  }

  var markerSlider = document.getElementById('marker-size-slider');
  var markerVal = document.getElementById('marker-size-val');
  if (markerSlider) {
    markerSlider.addEventListener('input', function() {
      var v = parseFloat(markerSlider.value);
      if (markerVal) markerVal.textContent = v.toFixed(1) + '×';
      if (typeof updateMarkerSize === 'function') updateMarkerSize(v);
    });
  }
}

// ════════════════════════════════════════════════════════
// BOUNDING BOX HELPER
// ════════════════════════════════════════════════════════
let bboxHelper = null;
let bboxVisible = true;

// ════════════════════════════════════════════════════════
// MARKER SIZE CONTROL
// ════════════════════════════════════════════════════════
let userMarkerScale = 1.0;  // 사용자 슬라이더 값 (0.2 ~ 3.0)
const MARKER_BASE_PIXELS = 10;  // 슬라이더 1.0 기준 픽셀 크기 (거리 무관)

function updateMarkerSize() {
  const finalSize = MARKER_BASE_PIXELS * userMarkerScale;

  Object.values(overlays).forEach(function(overlay) {
    overlay.group.traverse(function(obj) {
      if (obj.isPoints && obj.material && obj.material.size !== undefined) {
        obj.material.size = finalSize;
      }
    });
  });
}

function toggleBBoxHelper() {
  bboxVisible = !bboxVisible;
  const btn = document.getElementById('bbox-toggle');
  if (bboxHelper) bboxHelper.visible = bboxVisible;
  if (btn) {
    btn.setAttribute('data-on', bboxVisible ? 'true' : 'false');
    btn.classList.toggle('active', bboxVisible);
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

// ════════════════════════════════════════════════════════
// OVERLAY GROUPS
// ════════════════════════════════════════════════════════
const overlayGroup = new THREE.Group();
scene.add(overlayGroup);

// PART R-3-A+B: Read issue color tokens from CSS variables
function getIssueTokenColor(varName, fallback) {
  try {
    var v = getComputedStyle(document.documentElement)
              .getPropertyValue(varName).trim();
    return v || fallback;
  } catch (e) {
    return fallback;
  }
}

const overlays = {
  degen:       { group: new THREE.Group(), color: getIssueTokenColor('--issue-degenerate',   '#e85b7a'), label: '면이 올바르지 않아요',     count: 0 },
  ngon:        { group: new THREE.Group(), color: getIssueTokenColor('--issue-ngon',         '#d9a336'), label: '면에 꼭짓점이 너무 많아요', count: 0 },
  dupvert:     { group: new THREE.Group(), color: getIssueTokenColor('--issue-duplicate',    '#4a9fd4'), label: '점이 겹쳐있어요',          count: 0 },
  flipped:     { group: new THREE.Group(), color: getIssueTokenColor('--issue-flipped',      '#d65a2e'), label: '면 방향이 반대예요',       count: 0 },
  nonmanifold: { group: new THREE.Group(), color: getIssueTokenColor('--issue-non-manifold', '#cf4b4b'), label: '면이 이상하게 붙어있어요', count: 0 },
  boundary:    { group: new THREE.Group(), color: getIssueTokenColor('--issue-boundary',     '#e87d3e'), label: '모델이 닫혀있지 않아요',   count: 0 },
  isolated:    { group: new THREE.Group(), color: getIssueTokenColor('--issue-isolated',     '#5fb8e8'), label: '혼자 떠있는 점이 있어요',  count: 0 },
  skinny:      { group: new THREE.Group(), color: getIssueTokenColor('--issue-skinny',       '#c89020'), label: '삼각형이 너무 얇아요',     count: 0 },
};
Object.values(overlays).forEach(o => { o.group.visible = true; overlayGroup.add(o.group); });

// ════════════════════════════════════════════════════════
// COLOR THEME
// ════════════════════════════════════════════════════════
const DEFAULT_COLORS = {};
Object.entries(overlays).forEach(([k,o]) => { DEFAULT_COLORS[k] = o.color; });
var ISSUE_META = {
  'non-manifold': {
    glyph: '✕',
    label: 'NON-MANIFOLD',
    desc: '세 면 이상이 한 모서리를 공유하고 있어요. 불리언·UV·3D 프린팅이 막힐 수 있어요.'
  },
  'boundary': {
    glyph: '○',
    label: 'BOUNDARY EDGE',
    desc: '메쉬에 열린 경계가 있어요. 3D 프린팅이나 시뮬레이션이 어려울 수 있어요.'
  },
  'skinny': {
    glyph: '△',
    label: 'SKINNY TRIANGLE',
    desc: '극단적으로 얇고 긴 삼각형이 있어요. 셰이딩이나 시뮬레이션이 불안정해질 수 있어요.'
  },
  'ngon': {
    glyph: '⬡',
    label: 'N-GON',
    desc: '5각형 이상의 면이 있어요. 엔진마다 다르게 쪼개져서 결과가 예측 불가예요.'
  },
  'degenerate': {
    glyph: '◠',
    label: 'DEGENERATE',
    desc: '면적이 거의 0인 면이 있어요. 법선이 정의되지 않아서 렌더링에서 튀어요.'
  },
  'flipped': {
    glyph: '⇄',
    label: 'FLIPPED NORMAL',
    desc: '이웃 면과 반대 방향을 향하는 면이 있어요. 렌더러에서 사라지거나 검게 보일 수 있어요.'
  },
  'isolated': {
    glyph: '·',
    label: 'ISOLATED VERTEX',
    desc: '어떤 면에도 속하지 않는 떠 있는 점이 있어요. 정리하는 게 좋아요.'
  },
  'duplicate': {
    glyph: '◉',
    label: 'DUPLICATE VERTEX',
    desc: '위치가 거의 같은 점 여러 개가 있어요. 모으거나 합치는 게 좋아요.'
  }
};

// PART R-2: Issue severity classification (인계 문서 v2 정책)
var ISSUE_SEVERITY = {
  'non-manifold': 'critical',
  'degenerate':   'critical',
  'flipped':      'error',
  'boundary':     'error',
  'ngon':         'warning',
  'skinny':       'warning',
  'duplicate':    'info',
  'isolated':     'info'
};
var SEVERITY_RANK = { 'critical': 0, 'error': 1, 'warning': 2, 'info': 3 };
var ISSUE_TO_OVERLAY_KEY = {
  'non-manifold': 'nonmanifold',
  'boundary': 'boundary',
  'skinny': 'skinny',
  'ngon': 'ngon',
  'degenerate': 'degen',
  'flipped': 'flipped',
  'isolated': 'isolated',
  'duplicate': 'dupvert'
};

function hexToInt(hex) { return parseInt(hex.replace('#',''), 16); }

function applyOverlayColor(key, hex) {
  overlays[key].color = hex;
  overlays[key].group.traverse(function(obj) {
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => { if (m.color) m.color.set(hex); });
    }
  });
  // R-3-C: 카드 glyph + 숫자 색상 동기화
  var issueKey = Object.keys(ISSUE_TO_OVERLAY_KEY).find(function(k) {
    return ISSUE_TO_OVERLAY_KEY[k] === key;
  });
  if (issueKey) {
    var card = document.querySelector('.issue-card[data-issue="' + issueKey + '"]');
    if (card) {
      var glyph = card.querySelector('.issue-glyph');
      var countEl = card.querySelector('.issue-count');
      if (glyph) glyph.style.color = hex;
      if (countEl) countEl.style.color = hex;
    }
  }
}

function resetColors() {
  Object.entries(DEFAULT_COLORS).forEach(function([key, hex]) {
    applyOverlayColor(key, hex);
    const input  = document.getElementById('colorpick-'+key);
    const swatch = document.getElementById('swatch-'+key);
    if (input)  input.value = hex;
    if (swatch) swatch.style.background = hex;
  });
  showToast('info', '색상 초기화', '기본 색상으로 되돌렸어요.', 2000);
}
function randomizeColors() {
  const palette = ['#ff2d55','#ff9f0a','#ffd60a','#30d158','#64d2ff','#0a84ff','#bf5af2','#ff6b6b','#4ecdc4','#a8e6cf','#ff8b94'];
  const shuffled = palette.sort(() => Math.random() - 0.5);
  let idx = 0;
  Object.keys(overlays).forEach(function(key) {
    const hex = shuffled[idx % shuffled.length]; idx++;
    applyOverlayColor(key, hex);
    const input  = document.getElementById('colorpick-'+key);
    const swatch = document.getElementById('swatch-'+key);
    if (input)  input.value = hex;
    if (swatch) swatch.style.background = hex;
  });
  showToast('info', '랜덤 색상 적용', '새로운 색상 조합으로 바꿨어요.', 2000);
}

// ════════════════════════════════════════════════════════
// CLEAR OVERLAYS
// ════════════════════════════════════════════════════════
function clearOverlays() {
  Object.values(overlays).forEach(o => {
    while (o.group.children.length) {
      const c = o.group.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) { const ms = Array.isArray(c.material) ? c.material : [c.material]; ms.forEach(m => m.dispose()); }
      o.group.remove(c);
    }
    o.count = 0;
  });
  // clear heatmap meshes from scene
  heatmapMeshes.forEach(m => {
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
    scene.remove(m);
  });
  heatmapMeshes = [];
}

function getCountForIssue(issueKey, stats) {
  if (issueKey === 'non-manifold') return stats.nonManifoldCount || 0;
  if (issueKey === 'boundary') return stats.boundaryCount || 0;
  if (issueKey === 'skinny') return stats.skinnyCount || 0;
  if (issueKey === 'ngon') return stats.ngonCount || 0;
  if (issueKey === 'degenerate') return stats.degenCount || 0;
  if (issueKey === 'flipped') return stats.flippedCount || 0;
  if (issueKey === 'isolated') return stats.isolatedCount || 0;
  if (issueKey === 'duplicate') return stats.dupVertCount || 0;
  return 0;
}

function getOverlayByIssueKey(issueKey) {
  const overlayKey = ISSUE_TO_OVERLAY_KEY[issueKey];
  if (!overlayKey) return null;
  return overlays[overlayKey] || null;
}

function getFirstIssuePosition(issueType) {
  var overlay = getOverlayByIssueKey(issueType);
  if (!overlay || !overlay.group || overlay.group.children.length === 0) return null;
  var child = overlay.group.children[0];
  if (!child.geometry || !child.geometry.attributes || !child.geometry.attributes.position) return null;
  var arr = child.geometry.attributes.position.array;
  if (!arr || arr.length < 3) return null;
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
}

function focusOnIssue(issueType) {
  var pos = getFirstIssuePosition(issueType);
  if (!pos) {
    showToast('info', '위치를 찾을 수 없어요', '이 이슈의 위치 정보를 가져올 수 없어요.', 3000);
    return;
  }

  var startPos = camera.position.clone();
  var startTarget = controls.target.clone();
  var endTarget = pos.clone();
  var distance = Math.max(lastBoundingBoxSize * 0.3, 0.1);
  var direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() < 1e-8) direction.set(0.3, 0.4, 1.0);
  direction.normalize();
  var endPos = endTarget.clone().add(direction.multiplyScalar(distance));

  var duration = 500;
  var startTime = performance.now();

  function tween() {
    var elapsed = performance.now() - startTime;
    var t = Math.min(elapsed / duration, 1);
    var ease = t * t * (3 - 2 * t);
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(tween);
  }
  tween();
}

function renderIssueCards(stats) {
  var container = document.getElementById('issue-cards-container');
  if (!container) return;
  container.innerHTML = '';
  // PART R-2: 모든 이슈 수집 (count 0 포함)
  var allIssues = [];
  var totalCount = 0;
  for (var key in ISSUE_META) {
    var count = getCountForIssue(key, stats);
    allIssues.push({ key: key, count: count });
    totalCount += count;
  }
  // 모든 카운트가 0이면 통과 메시지만 표시
  if (totalCount === 0) {
    container.innerHTML = '<div class="all-pass">✓ 모든 검사를 통과했어요</div>';
    return;
  }
  // PART R-2: severity 우선, 같은 severity 내에서는 count 내림차순
  allIssues.sort(function(a, b) {
    var sevA = SEVERITY_RANK[ISSUE_SEVERITY[a.key]] ?? 99;
    var sevB = SEVERITY_RANK[ISSUE_SEVERITY[b.key]] ?? 99;
    if (sevA !== sevB) return sevA - sevB;
    return b.count - a.count;
  });
  allIssues.forEach(function(issue) {
    var meta = ISSUE_META[issue.key];
    var card = createIssueCard(issue.key, meta, issue.count);
    container.appendChild(card);
  });
}

function createIssueCard(issueKey, meta, count) {
  var overlay = getOverlayByIssueKey(issueKey);
  var overlayKey = ISSUE_TO_OVERLAY_KEY[issueKey];
  var isOn = !overlay || overlay.group.visible;
  var color = overlay ? overlay.color : '#888888';
  var canFocus = !!getFirstIssuePosition(issueKey);
  var card = document.createElement('div');
  var severity = ISSUE_SEVERITY[issueKey] || 'info';
  card.className = 'issue-card collapsed severity-' + severity + (count === 0 ? ' issue-card-empty' : '');
  card.setAttribute('data-issue', issueKey);
  card.setAttribute('data-expanded', 'false');
  card.innerHTML =
    '<div class="issue-card-header">' +
      '<span class="issue-glyph">' + meta.glyph + '</span>' +
      '<span class="issue-label">' + meta.label + '</span>' +
      '<span class="issue-count">' + count.toLocaleString() + '</span>' +
      '<span class="issue-chevron">▸</span>' +
    '</div>' +
    '<div class="issue-card-body">' +
      '<p class="issue-desc">' + meta.desc + '</p>' +
      '<div class="issue-control">' +
        '<span class="control-label">SHOW LAYERS</span>' +
        '<button class="mini-toggle" data-on="' + (isOn ? 'true' : 'false') + '"></button>' +
      '</div>' +
      '<div class="issue-control">' +
        '<span class="control-label">OVERLAY COLOR</span>' +
        '<div class="color-swatch-wrap">' +
          '<div class="color-swatch" id="swatch-' + overlayKey + '" style="background:' + color + '"></div>' +
          '<input type="color" class="color-input-hidden" id="colorpick-' + overlayKey + '" value="' + color + '">' +
        '</div>' +
      '</div>' +
      '<button class="focus-btn"' + (canFocus ? '' : ' disabled') + '>🎯 해당 위치로 이동</button>' +
    '</div>';

  var header = card.querySelector('.issue-card-header');
  header.addEventListener('click', function() {
    if (count === 0) return; // PART R-2: 빈 이슈는 펼치지 않음
    var isExpanded = card.getAttribute('data-expanded') === 'true';
    card.classList.toggle('expanded');
    card.classList.toggle('collapsed', !card.classList.contains('expanded'));
    card.setAttribute('data-expanded', isExpanded ? 'false' : 'true');
  });

  var toggleBtn = card.querySelector('.mini-toggle');
  toggleBtn.addEventListener('click', function(ev) {
    ev.stopPropagation();
    if (!overlay) return;
    overlay.group.visible = !overlay.group.visible;
    toggleBtn.setAttribute('data-on', overlay.group.visible ? 'true' : 'false');
  });

  var swatch = card.querySelector('.color-swatch');
  var colorInput = card.querySelector('input[type=color]');
  swatch.addEventListener('click', function(ev) {
    ev.stopPropagation();
    colorInput.click();
  });
  colorInput.addEventListener('click', function(ev) { ev.stopPropagation(); });
  colorInput.addEventListener('input', function(ev) {
    ev.stopPropagation();
    swatch.style.background = colorInput.value;
    if (overlayKey) applyOverlayColor(overlayKey, colorInput.value);
  });

  var focusBtn = card.querySelector('.focus-btn');
  focusBtn.addEventListener('click', function(ev) {
    ev.stopPropagation();
    if (focusBtn.disabled) return;
    focusOnIssue(issueKey);
  });

  return card;
}

function renderIssueMessage(type, icon, text) {
  var container = document.getElementById('issue-cards-container');
  if (!container) return;
  container.innerHTML =
    '<div class="issue-item ' + type + '">' +
      '<span class="issue-icon">' + icon + '</span><span>' + text + '</span>' +
    '</div>';
}

// ════════════════════════════════════════════════════════
// HEALTH SCORE
// ════════════════════════════════════════════════════════
function computeHealthScore(faceCount, stats) {
  if (faceCount === 0) return { score: 0, grade: 'N/A', desc: '면이 없어요', color: '#888' };
  let score = 100;
  const fc = Math.max(faceCount, 1);

  // Deductions per error type (weighted by severity and ratio)
  const rules = [
    { count: stats.degenCount,       weight: 30, label: 'Degenerate' },
    { count: stats.ngonCount,        weight: 15, label: 'N-gon' },
    // dupVertCount는 UV/Normal 분리 정점 포함으로 오탐 가능 → Health Score 제외
    { count: stats.flippedCount,     weight: 20, label: 'Flipped' },
    { count: stats.nonManifoldCount, weight: 25, label: 'NonManifold' },
    { count: stats.boundaryCount,    weight: 5,  label: 'Boundary' },
    { count: stats.isolatedCount,    weight: 5,  label: 'Isolated' },
    { count: stats.skinnyCount,      weight: 8,  label: 'Skinny' },
  ];
  rules.forEach(function(r) {
    if (r.count > 0) {
      const ratio = Math.min(r.count / fc, 1);
      // sigmoid-style: even 1 error causes -5, scales to full weight at 100%
      const penalty = r.weight * (0.05 + 0.95 * Math.pow(ratio, 0.3));
      score -= penalty;
    }
  });

  // Density uniformity bonus/penalty: if heatmap data available
  if (stats.densityCV != null) {
    // CV (coefficient of variation): 0 = perfectly uniform
    const cvPenalty = Math.min(stats.densityCV * 10, 10);
    score -= cvPenalty;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade, desc, color;
  if (score >= 95) { grade = 'S';  desc = '완벽한 토폴로지예요';         color = '#30d158'; }
  else if (score >= 85) { grade = 'A'; desc = '우수한 메시 품질이에요';   color = '#62a353'; }
  else if (score >= 70) { grade = 'B'; desc = '양호해요 — 소수 문제';     color = '#d9a336'; }
  else if (score >= 50) { grade = 'C'; desc = '주의 — 오류 수정이 필요해요'; color = '#e87d3e'; }
  else if (score >= 30) { grade = 'D'; desc = '불량 — 다수 오류가 있어요';   color = '#cf4b4b'; }
  else                  { grade = 'F'; desc = '심각한 토폴로지 문제예요'; color = '#ff2222'; }

  return { score, grade, desc, color };
}

var _lastHealthScore = null;
function updateHealthUI(result) {
  _lastHealthScore = result.score;
  const val   = document.getElementById('health-score-val');
  const grade = document.getElementById('health-grade');
  const desc  = document.getElementById('health-desc');
  const fill  = document.getElementById('health-bar-fill');

  // 색상/등급/설명은 즉시
  val.style.color   = result.color;
  grade.textContent = result.grade;
  grade.style.color = result.color;
  desc.textContent  = result.desc;

  if (animEnabled && !animSkipped) {
    // Health Score: 0 → target 카운트업
    countUpTo(val, result.score, 900);
    // 바: 0 → target 넓이
    fill.style.transition = 'width 0.9s cubic-bezier(0.16,1,0.3,1), background 0.4s';
    fill.style.background = result.color;
    requestAnimationFrame(function() {
      fill.style.width = '0%';
      requestAnimationFrame(function() {
        fill.style.width = result.score + '%';
      });
    });
  } else {
    val.textContent   = result.score;
    fill.style.transition = 'none';
    fill.style.width      = result.score + '%';
    fill.style.background = result.color;
  }
}

// ════════════════════════════════════════════════════════
// OBJ TEXT PARSER (optimized with chunked approach)
// ════════════════════════════════════════════════════════
let rawObjText = '';
let hasUvInObj  = false;

function parseObjText(text) {
  rawObjText = text;
  const verts = [];
  const ngonFaces = [];
  let ngonCount = 0, quadCount = 0, triCount = 0;
  hasUvInObj = false;

  const dupVertIndices = new Set();
  const coordToFirstIdx = new Map();
  const referencedVerts = new Set();

  // Fast line iteration (avoid split('\n') for large files)
  let i = 0;
  const len = text.length;
  while (i < len) {
    let lineEnd = text.indexOf('\n', i);
    if (lineEnd === -1) lineEnd = len;

    const c0 = text[i], c1 = text[i+1];

    if (c0 === 'v' && c1 === ' ') {
      // parse vertex coords
      const sub = text.slice(i+2, lineEnd).trim();
      const parts = sub.split(/\s+/);
      const x = parseFloat(parts[0]), y = parseFloat(parts[1]), z = parseFloat(parts[2]);
      verts.push([x, y, z]);
      const idx = verts.length - 1;
      const key = x.toFixed(6) + ',' + y.toFixed(6) + ',' + z.toFixed(6);
      if (coordToFirstIdx.has(key)) {
        dupVertIndices.add(idx);
        dupVertIndices.add(coordToFirstIdx.get(key));
      } else {
        coordToFirstIdx.set(key, idx);
      }
    } else if (c0 === 'v' && c1 === 't') {
      hasUvInObj = true;
    } else if (c0 === 'f' && c1 === ' ') {
      const sub = text.slice(i+2, lineEnd).trim();
      const tokens = sub.split(/\s+/).filter(Boolean);
      const vi = tokens.map(tk => {
        const idx = parseInt(tk.split('/')[0]);
        return idx > 0 ? idx - 1 : verts.length + idx;
      });
      if      (vi.length === 3) triCount++;
      else if (vi.length === 4) quadCount++;
      else if (vi.length >= 5) { ngonCount++; ngonFaces.push(vi.map(ii => verts[ii] || [0,0,0])); }
      vi.forEach(ii => referencedVerts.add(ii));
    }

    i = lineEnd + 1;
  }

  // Isolated vertices
  const trueIsolatedPoints = [];
  for (let j = 0; j < verts.length; j++) {
    if (!referencedVerts.has(j)) trueIsolatedPoints.push(...verts[j]);
  }

  // Dup vert points
  const dupVertPoints = [];
  dupVertIndices.forEach(j => { if (verts[j]) dupVertPoints.push(...verts[j]); });

  return {
    ngonCount, quadCount, triCount, ngonFaces, verts,
    dupVertPoints, dupVertCount: dupVertIndices.size,
    trueIsolatedPoints, trueIsolatedCount: trueIsolatedPoints.length / 3
  };
}

// ════════════════════════════════════════════════════════
// N-GON OVERLAY
// ════════════════════════════════════════════════════════
function buildNgonOverlay(ngonFaces) {
  const posArr = [];
  for (const face of ngonFaces) {
    const v0 = face[0];
    for (let i = 1; i < face.length - 1; i++) {
      posArr.push(...v0, ...face[i], ...face[i+1]);
    }
  }
  if (posArr.length === 0) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  overlays.ngon.group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: hexToInt(overlays.ngon.color), side: THREE.DoubleSide,
    transparent: true, opacity: 0.55, depthTest: false
  })));
  const linePos = [];
  for (const face of ngonFaces) {
    for (let i = 0; i < face.length; i++) {
      linePos.push(...face[i], ...face[(i+1) % face.length]);
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  overlays.ngon.group.add(new THREE.LineSegments(lg,
    new THREE.LineBasicMaterial({ color: hexToInt(overlays.ngon.color), depthTest: false })));
}

// ════════════════════════════════════════════════════════
// VERTEX DENSITY HEATMAP
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// VERTEX DENSITY MAP
// 각 정점의 로컬 밀도를 "평균 엣지 길이"로 추정합니다.
// 짧은 평균 엣지 → 고밀도(빨강), 긴 평균 엣지 → 저밀도(파랑)
// 그라디언트: 파랑(저) → 초록(중) → 빨강(고)
// ════════════════════════════════════════════════════════
function buildVertexDensityMap(geometries, modelGroupRef) {
  // geometries: 배열로 받아 전체 오브젝트를 커버
  if (!Array.isArray(geometries)) geometries = [geometries];
  geometries = geometries.filter(g => g && g.attributes && g.attributes.position);
  if (geometries.length === 0) return { densityCV: null };

  // ── 1. 각 geometry별로 정점 밀도 계산 후 개별 mesh 생성 ──
  // 전체를 하나로 합치면 43MB+ 배열이 생기므로
  // geometry당 개별 처리 → 메모리 피크를 분산

  const colLo  = new THREE.Color(0xef4444); // red   = high density (짧은 엣지)
  const colMid = new THREE.Color(0x22c55e); // green = medium
  const colHi  = new THREE.Color(0x3b82f6); // blue  = low density (긴 엣지)
  const tmp    = new THREE.Color();

  // 전역 p5/p95 계산을 위해 먼저 전체 spacing 샘플링 (메모리 절약: 최대 50K 샘플)
  const SAMPLE_MAX = 50000;
  const spacingSample = [];

  for (const geo of geometries) {
    const pos      = geo.attributes.position;
    const vtxCount = pos.count;
    const faceCount = vtxCount / 3;
    if (faceCount < 1) continue;

    const step = Math.max(1, Math.floor(faceCount / (SAMPLE_MAX / geometries.length)));
    for (let f = 0; f < faceCount; f += step) {
      const i0=f*3, i1=f*3+1, i2=f*3+2;
      const ax=pos.getX(i0),ay=pos.getY(i0),az=pos.getZ(i0);
      const bx=pos.getX(i1),by=pos.getY(i1),bz=pos.getZ(i1);
      const cx=pos.getX(i2),cy=pos.getY(i2),cz=pos.getZ(i2);
      const dab=Math.sqrt((bx-ax)**2+(by-ay)**2+(bz-az)**2);
      const dbc=Math.sqrt((cx-bx)**2+(cy-by)**2+(cz-bz)**2);
      const dca=Math.sqrt((ax-cx)**2+(ay-cy)**2+(az-cz)**2);
      const avg=(dab+dbc+dca)/3;
      if (avg > 0) spacingSample.push(avg);
    }
  }

  // TypedArray sort — JS Array.sort보다 훨씬 빠름
  const sampleF32 = new Float32Array(spacingSample);
  sampleF32.sort(); // TypedArray.sort: 네이티브 정렬, 블로킹 최소화
  const p5  = sampleF32[Math.floor(sampleF32.length * 0.05)] || 0;
  const p95 = sampleF32[Math.floor(sampleF32.length * 0.95)] || 1;
  const range = (p95 - p5) || 1;

  // densityCV 추정 (샘플 기반)
  let sumS=0, cntS=sampleF32.length;
  for (let i=0; i<cntS; i++) sumS += sampleF32[i];
  const meanS = cntS>0 ? sumS/cntS : 1;
  let varS=0;
  for (let i=0; i<cntS; i++) { const d=sampleF32[i]-meanS; varS+=d*d; }
  const densityCV = meanS>0 ? Math.sqrt(varS/cntS)/meanS : null;

  const copyTransform = function(dst) {
    if (modelGroupRef) {
      dst.position.copy(modelGroupRef.position);
      dst.rotation.copy(modelGroupRef.rotation);
      dst.scale.copy(modelGroupRef.scale);
    }
    dst.visible = currentMode === 'heatmap';
  };

  // ── 2. 각 geometry에 density color 적용 → 개별 Mesh 생성 ──
  for (const geo of geometries) {
    const pos      = geo.attributes.position;
    const vtxCount = pos.count;
    const faceCount = vtxCount / 3;
    if (faceCount < 1) continue;

    // 정점별 평균 엣지 길이 계산 (Float32Array로 GC 압박 최소화)
    const edgeLenSum   = new Float32Array(vtxCount);
    const edgeLenCount = new Uint8Array(vtxCount); // max 255 faces per vertex

    for (let f=0; f<faceCount; f++) {
      const i0=f*3, i1=f*3+1, i2=f*3+2;
      const ax=pos.getX(i0),ay=pos.getY(i0),az=pos.getZ(i0);
      const bx=pos.getX(i1),by=pos.getY(i1),bz=pos.getZ(i1);
      const cx=pos.getX(i2),cy=pos.getY(i2),cz=pos.getZ(i2);
      const dab=Math.sqrt((bx-ax)**2+(by-ay)**2+(bz-az)**2);
      const dbc=Math.sqrt((cx-bx)**2+(cy-by)**2+(cz-bz)**2);
      const dca=Math.sqrt((ax-cx)**2+(ay-cy)**2+(az-cz)**2);
      edgeLenSum[i0]+=dab+dca; edgeLenCount[i0]+=2;
      edgeLenSum[i1]+=dab+dbc; edgeLenCount[i1]+=2;
      edgeLenSum[i2]+=dbc+dca; edgeLenCount[i2]+=2;
    }

    // vertex color 버퍼 (기존 position 재사용 → 복사 없음)
    const vColors = new Float32Array(vtxCount * 3);
    for (let i=0; i<vtxCount; i++) {
      const spacing = edgeLenCount[i]>0 ? edgeLenSum[i]/edgeLenCount[i] : p5;
      const t = Math.max(0, Math.min(1, (spacing - p5) / range));
      if (t < 0.5) tmp.lerpColors(colLo, colMid, t*2);
      else         tmp.lerpColors(colMid, colHi, (t-0.5)*2);
      vColors[i*3]=tmp.r; vColors[i*3+1]=tmp.g; vColors[i*3+2]=tmp.b;
    }

    // ── Density solid mesh ──
    // position을 새로 복사하지 않고 기존 geo의 attribute를 공유
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', geo.attributes.position);  // 공유 (복사 안 함)
    dg.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));

    const dm = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      transparent: false,
    }));
    copyTransform(dm);
    scene.add(dm);
    heatmapMeshes.push(dm);

    // ── Wireframe overlay ──
    // wireframe:true 옵션 사용 → 별도 43MB wirePos 배열 불필요
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', geo.attributes.position);  // 공유
    const wm = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      depthTest: true,
    }));
    copyTransform(wm);
    scene.add(wm);
    heatmapMeshes.push(wm);
  }

  return { densityCV };
}

// ════════════════════════════════════════════════════════
// SKINNY TRIANGLE DETECTION — OBJ 원문 직접 파싱 방식
//
// Three.js OBJLoader가 정점을 재인덱싱하면서 좌표 기반 엣지
// 매칭이 부동소수점 오차로 실패하는 문제를 근본적으로 해결합니다.
//
// 해법: geometry.position 배열(OBJLoader 결과)을 사용하지 않고,
// OBJ 원문의 f 라인에서 직접 삼각형(토큰 3개)만 읽어 검사합니다.
// 쿼드(토큰 4개), N-gon(5개+)은 완전히 건너뜁니다.
// ════════════════════════════════════════════════════════
function detectSkinnyTriangles(rawObjText, objVerts) {
  const skinnyFaces = []; // [[x,y,z], [x,y,z], [x,y,z]] 트리플
  const THRESHOLD = 10;   // longest_edge / altitude ≥ 10 → skinny

  if (!rawObjText || objVerts.length === 0) {
    overlays.skinny.count = 0;
    return;
  }

  let i = 0;
  const len = rawObjText.length;
  const V   = objVerts; // [[x,y,z], ...]

  while (i < len) {
    let lineEnd = rawObjText.indexOf('\n', i);
    if (lineEnd === -1) lineEnd = len;

    if (rawObjText[i] === 'f' && rawObjText[i+1] === ' ') {
      const sub    = rawObjText.slice(i+2, lineEnd).trim();
      const tokens = sub.split(/\s+/).filter(Boolean);

      // 삼각형만 검사 — 쿼드/N-gon은 완전히 스킵
      if (tokens.length === 3) {
        const vi = tokens.map(tk => {
          const idx = parseInt(tk.split('/')[0]);
          return idx > 0 ? idx - 1 : V.length + idx;
        });

        const va = V[vi[0]], vb = V[vi[1]], vc = V[vi[2]];
        if (!va || !vb || !vc) { i = lineEnd + 1; continue; }

        const [ax, ay, az] = va;
        const [bx, by, bz] = vb;
        const [cx, cy, cz] = vc;

        // 세 변의 길이
        const lab = Math.sqrt((bx-ax)**2 + (by-ay)**2 + (bz-az)**2);
        const lbc = Math.sqrt((cx-bx)**2 + (cy-by)**2 + (cz-bz)**2);
        const lca = Math.sqrt((ax-cx)**2 + (ay-cy)**2 + (az-cz)**2);
        const longest = Math.max(lab, lbc, lca);
        if (longest < 1e-12) { i = lineEnd + 1; continue; }

        // 넓이 = |AB × AC| / 2, 최단 높이 = 2*area / longest
        const abx=bx-ax, aby=by-ay, abz=bz-az;
        const acx=cx-ax, acy=cy-ay, acz=cz-az;
        const crossLen = Math.sqrt(
          (aby*acz - abz*acy)**2 +
          (abz*acx - abx*acz)**2 +
          (abx*acy - aby*acx)**2
        );
        const height = crossLen / longest; // = 2*area / longest
        if (height < 1e-12) { i = lineEnd + 1; continue; } // degenerate

        const aspectRatio = longest / height;
        if (aspectRatio >= THRESHOLD) {
          skinnyFaces.push([ax,ay,az, bx,by,bz, cx,cy,cz]);
        }
      }
    }

    i = lineEnd + 1;
  }

  overlays.skinny.count = skinnyFaces.length;
  if (skinnyFaces.length > 0) {
    const posArr = new Float32Array(skinnyFaces.length * 9);
    for (let j = 0; j < skinnyFaces.length; j++) {
      posArr.set(skinnyFaces[j], j * 9);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    overlays.skinny.group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: hexToInt(overlays.skinny.color), side: THREE.DoubleSide,
      transparent: true, opacity: 0.70, depthTest: false
    })));
  }
}


// ════════════════════════════════════════════════════════
// MAIN ANALYSIS
// ════════════════════════════════════════════════════════
function runAnalysis(originalGeometry, allGeometries) {
  allGeometries = allGeometries || [originalGeometry];
  // clearOverlays()는 loadModel에서 모델 해제 직후 호출됨 (잔상 버그 방지)

  // Bounding box
  originalGeometry.computeBoundingBox();
  const meshBB = originalGeometry.boundingBox;
  const meshBBSize = new THREE.Vector3();
  meshBB.getSize(meshBBSize);

  let trueBB = null;
  if (rawObjText) {
    const allVerts = [];
    let idx = 0, len = rawObjText.length;
    while (idx < len) {
      let lineEnd = rawObjText.indexOf('\n', idx);
      if (lineEnd === -1) lineEnd = len;
      if (rawObjText[idx] === 'v' && rawObjText[idx+1] === ' ') {
        const sub = rawObjText.slice(idx+2, lineEnd).trim().split(/\s+/);
        const x = parseFloat(sub[0]), y = parseFloat(sub[1]), z = parseFloat(sub[2]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) allVerts.push(x, y, z);
      }
      idx = lineEnd + 1;
    }
    if (allVerts.length > 0) {
      trueBB = new THREE.Box3();
      for (let i = 0; i < allVerts.length; i += 3) {
        trueBB.expandByPoint(new THREE.Vector3(allVerts[i], allVerts[i+1], allVerts[i+2]));
      }
    }
  }

  const bb = trueBB || meshBB;
  const bbSize = new THREE.Vector3();
  bb.getSize(bbSize);
  lastBoundingBoxSize = Math.max(bbSize.length(), 1);

  document.getElementById('bbox').textContent =
    bbSize.x.toFixed(3) + ' / ' + bbSize.y.toFixed(3) + ' / ' + bbSize.z.toFixed(3);

  if (trueBB) updateBBoxHelper(null, trueBB);

  // ── Dynamic marker scale based on bounding box ──
  const bbDiag = bbSize.length();
  const ptSize = Math.max(bbDiag * 0.008, 0.002); // tighter scale to avoid overlap

  let strayDataWarning = false;
  if (trueBB && meshBBSize.length() > 0) {
    if (bbSize.length() / meshBBSize.length() > 1.5) strayDataWarning = true;
  }

  const rawArr   = originalGeometry.attributes.position.array;
  const rawVerts = originalGeometry.attributes.position.count;
  const faceCount = rawVerts / 3;

  // Merge for topology analysis
  const posOnlyGeo = new THREE.BufferGeometry();
  posOnlyGeo.setAttribute('position', originalGeometry.attributes.position.clone());
  let indexedGeo;
  try { indexedGeo = THREE.BufferGeometryUtils.mergeVertices(posOnlyGeo, 1e-4); }
  catch(e) { indexedGeo = posOnlyGeo; }

  const mergedVerts = indexedGeo.attributes.position.count;
  const mpos = indexedGeo.attributes.position.array;
  const indices = indexedGeo.index ? indexedGeo.index.array : null;

  document.getElementById('v-count').textContent = mergedVerts.toLocaleString();
  document.getElementById('f-count').textContent = Math.round(faceCount).toLocaleString();

  // Edge map
  let edgeSt = null;
  const edgeMap = new Map();
  if (indices) {
    const ekey = (a,b) => a<b ? a+'_'+b : b+'_'+a;
    for (let i = 0; i < indices.length; i += 3) {
      const pairs = [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]];
      for (const [a,b] of pairs) { const k=ekey(a,b); edgeMap.set(k,{cnt:(edgeMap.get(k)||{cnt:0}).cnt+1,a,b}); }
    }
    let nonManifold=0, boundary=0;
    edgeMap.forEach(e => { if(e.cnt>2) nonManifold++; else if(e.cnt===1) boundary++; });
    edgeSt = { nonManifold, boundary, totalEdges: edgeMap.size };
  }
  document.getElementById('e-count').textContent = edgeSt ? edgeSt.totalEdges.toLocaleString() : '—';
  if (edgeSt) {
    const chi = mergedVerts - edgeSt.totalEdges + Math.round(faceCount);
    document.getElementById('euler').textContent = (chi>=0?'+':'') + chi;
  }

  // ── Degenerate faces ──
  const degenVerts = [];
  for (let f = 0; f < faceCount; f++) {
    const b=f*9;
    const ax=rawArr[b],ay=rawArr[b+1],az=rawArr[b+2];
    const bx=rawArr[b+3],by=rawArr[b+4],bz=rawArr[b+5];
    const cx=rawArr[b+6],cy=rawArr[b+7],cz=rawArr[b+8];
    const abx=bx-ax,aby=by-ay,abz=bz-az;
    const acx=cx-ax,acy=cy-ay,acz=cz-az;
    const cl=Math.sqrt(Math.pow(aby*acz-abz*acy,2)+Math.pow(abz*acx-abx*acz,2)+Math.pow(abx*acy-aby*acx,2));
    if (cl < 1e-10) degenVerts.push(ax,ay,az,bx,by,bz,cx,cy,cz);
  }
  overlays.degen.count = degenVerts.length / 9;
  if (degenVerts.length > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(degenVerts, 3));
    overlays.degen.group.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: hexToInt(overlays.degen.color), size: 1, sizeAttenuation: false, depthTest: false })));
  }

  // ── Skinny triangles: OBJ 원문 직접 파싱 (쿼드/N-gon 완전 제외) ──
  // _parsed는 아래 OBJ text analysis에서 선언됩니다
  // 여기서는 rawObjText와 verts를 사용하므로, OBJ parsing을 먼저 수행
  const _parsed = parseObjText(rawObjText);
  detectSkinnyTriangles(rawObjText, _parsed.verts);

  // ── Non-manifold & boundary edges ──
  if (indices) {
    const nmVerts=[], bdVerts=[];
    edgeMap.forEach(function(e) {
      const ax=mpos[e.a*3],ay=mpos[e.a*3+1],az=mpos[e.a*3+2];
      const bx=mpos[e.b*3],by=mpos[e.b*3+1],bz=mpos[e.b*3+2];
      if (e.cnt > 2)      nmVerts.push(ax,ay,az,bx,by,bz);
      else if (e.cnt===1) bdVerts.push(ax,ay,az,bx,by,bz);
    });
    overlays.nonmanifold.count = nmVerts.length / 6;
    if (nmVerts.length > 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(nmVerts, 3));
      overlays.nonmanifold.group.add(new THREE.LineSegments(g,
        new THREE.LineBasicMaterial({ color: hexToInt(overlays.nonmanifold.color), linewidth: 2, depthTest: false })));
    }
    overlays.boundary.count = bdVerts.length / 6;
    if (bdVerts.length > 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(bdVerts, 3));
      overlays.boundary.group.add(new THREE.LineSegments(g,
        new THREE.LineBasicMaterial({ color: hexToInt(overlays.boundary.color), linewidth: 2, depthTest: false })));
    }

    // ── Isolated verts (Three.js level) ──
    const used = new Uint8Array(mergedVerts);
    for (let i = 0; i < indices.length; i++) used[indices[i]] = 1;
    const isoVerts = [];
    for (let i = 0; i < mergedVerts; i++) {
      if (!used[i]) isoVerts.push(mpos[i*3], mpos[i*3+1], mpos[i*3+2]);
    }
    overlays.isolated.count = isoVerts.length / 3;
    if (isoVerts.length > 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(isoVerts, 3));
      overlays.isolated.group.add(new THREE.Points(g,
        new THREE.PointsMaterial({ color: hexToInt(overlays.isolated.color), size: 1, sizeAttenuation: false, depthTest: false })));
    }
  }

  // ── Flipped normals ──
  // 알고리즘: vn(버텍스 노말) 기반 우선 사용
  //   → vn 있음: 기하 법선 vs 평균 vn 내적이 음수면 뒤집힌 면
  //   → vn 없음: 인접 face 법선 다수결 비교 (기존 방식, 오목 메시 오탐 가능)
  // vn 기반이 훨씬 정확 — 오목(concave) 메시에서의 오탐 제거
  (function detectFlipped() {
    const flippedVerts = [];

    // OBJ 원문에서 vn 파싱
    const objVNormals = [];  // [[x,y,z], ...]
    // face별 vn 인덱스 (삼각화 후) 수집
    const faceVN = [];       // [[vna,vnb,vnc], ...]
    let hasVN = false;

    if (rawObjText) {
      let li = 0, ll = rawObjText.length;
      while (li < ll) {
        let lineEnd = rawObjText.indexOf('\n', li);
        if (lineEnd === -1) lineEnd = ll;
        const c0 = rawObjText[li], c1 = rawObjText[li+1], c2 = rawObjText[li+2];

        if (c0==='v' && c1==='n' && c2===' ') {
          const sub = rawObjText.slice(li+3, lineEnd).trim().split(/\s+/);
          objVNormals.push([parseFloat(sub[0]), parseFloat(sub[1]), parseFloat(sub[2])]);
          hasVN = true;
        } else if (c0==='f' && c1===' ') {
          const tokens = rawObjText.slice(li+2, lineEnd).trim().split(/\s+/).filter(Boolean);
          const vis=[], vns=[];
          for (const tk of tokens) {
            const parts = tk.split('/');
            vis.push(parseInt(parts[0])-1);
            vns.push(parts.length>2 && parts[2] ? parseInt(parts[2])-1 : null);
          }
          // fan 삼각화
          for (let i=1; i<vis.length-1; i++) {
            faceVN.push([vns[0], vns[i], vns[i+1]]);
          }
        }
        li = lineEnd + 1;
      }
    }

    if (hasVN && faceVN.length > 0 && indices) {
      // ── vn 기반 탐지 ──
      const pos = originalGeometry.attributes.position;
      const faceCount2 = Math.min(indices.length/3, faceVN.length);

      const AB = new THREE.Vector3(), AC = new THREE.Vector3();
      const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
      const geomN = new THREE.Vector3();

      // faceVN은 OBJ fan 순서 — indices는 Three.js 머지 후 순서
      // rawArr(non-indexed) 기준으로 직접 계산
      const rawFaceCount = rawArr.length / 9;

      for (let f=0; f<rawFaceCount; f++) {
        if (f >= faceVN.length) break;
        const b = f*9;
        pA.set(rawArr[b],  rawArr[b+1],rawArr[b+2]);
        pB.set(rawArr[b+3],rawArr[b+4],rawArr[b+5]);
        pC.set(rawArr[b+6],rawArr[b+7],rawArr[b+8]);
        AB.subVectors(pB,pA); AC.subVectors(pC,pA);
        geomN.crossVectors(AB,AC).normalize();

        const [na,nb,nc] = faceVN[f];
        if (na===null||nb===null||nc===null) continue;
        if (na>=objVNormals.length||nb>=objVNormals.length||nc>=objVNormals.length) continue;

        const vnA=objVNormals[na], vnB=objVNormals[nb], vnC=objVNormals[nc];
        const avgX=(vnA[0]+vnB[0]+vnC[0])/3;
        const avgY=(vnA[1]+vnB[1]+vnC[1])/3;
        const avgZ=(vnA[2]+vnB[2]+vnC[2])/3;
        const d = geomN.x*avgX + geomN.y*avgY + geomN.z*avgZ;

        if (d < -0.5) {
          flippedVerts.push(
            rawArr[b],  rawArr[b+1],rawArr[b+2],
            rawArr[b+3],rawArr[b+4],rawArr[b+5],
            rawArr[b+6],rawArr[b+7],rawArr[b+8]
          );
        }
      }
    } else if (indices) {
      // ── vn 없음: 기존 인접 face 다수결 방식 (폴백) ──
      const faceCount2 = indices.length / 3;
      const faceNormals = [];
      const n=new THREE.Vector3(), ab2=new THREE.Vector3(), ac2=new THREE.Vector3();
      const pA=new THREE.Vector3(), pB=new THREE.Vector3(), pC=new THREE.Vector3();
      for (let f=0;f<faceCount2;f++) {
        const ia=indices[f*3],ib=indices[f*3+1],ic=indices[f*3+2];
        pA.set(mpos[ia*3],mpos[ia*3+1],mpos[ia*3+2]);
        pB.set(mpos[ib*3],mpos[ib*3+1],mpos[ib*3+2]);
        pC.set(mpos[ic*3],mpos[ic*3+1],mpos[ic*3+2]);
        ab2.subVectors(pB,pA); ac2.subVectors(pC,pA);
        n.crossVectors(ab2,ac2).normalize();
        faceNormals.push(n.x,n.y,n.z);
      }
      const ekey2=(a,b)=>a<b?a+'_'+b:b+'_'+a;
      const edgeToFaces2=new Map();
      for (let f=0;f<faceCount2;f++) {
        const pairs=[[indices[f*3],indices[f*3+1]],[indices[f*3+1],indices[f*3+2]],[indices[f*3+2],indices[f*3]]];
        for (const [a,b] of pairs) {
          const k=ekey2(a,b);
          if(!edgeToFaces2.has(k)) edgeToFaces2.set(k,[]);
          edgeToFaces2.get(k).push(f);
        }
      }
      const faceAdj=Array.from({length:faceCount2},()=>new Set());
      edgeToFaces2.forEach(function(faces){
        if(faces.length===2){faceAdj[faces[0]].add(faces[1]);faceAdj[faces[1]].add(faces[0]);}
      });
      for (let f=0;f<faceCount2;f++) {
        const nx=faceNormals[f*3],ny=faceNormals[f*3+1],nz=faceNormals[f*3+2];
        const adj=faceAdj[f]; if(adj.size===0) continue;
        let flippedCount=0;
        adj.forEach(function(af){
          const d=nx*faceNormals[af*3]+ny*faceNormals[af*3+1]+nz*faceNormals[af*3+2];
          if(d<-0.5) flippedCount++;
        });
        if(flippedCount>adj.size*0.5){
          const ia=indices[f*3],ib=indices[f*3+1],ic=indices[f*3+2];
          flippedVerts.push(
            mpos[ia*3],mpos[ia*3+1],mpos[ia*3+2],
            mpos[ib*3],mpos[ib*3+1],mpos[ib*3+2],
            mpos[ic*3],mpos[ic*3+1],mpos[ic*3+2]
          );
        }
      }
    }

    overlays.flipped.count = flippedVerts.length / 9;
    if (flippedVerts.length > 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(flippedVerts, 3));
      overlays.flipped.group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: hexToInt(overlays.flipped.color), side: THREE.DoubleSide,
        transparent: true, opacity: 0.6, depthTest: false
      })));
    }
  })();

  // ── OBJ text based analysis (_parsed는 위 skinny 단계에서 이미 파싱됨) ──
  const { ngonCount, quadCount, ngonFaces, dupVertPoints, dupVertCount, trueIsolatedPoints, trueIsolatedCount } = _parsed;
  overlays.ngon.count = ngonCount;
  if (ngonCount > 0) buildNgonOverlay(ngonFaces);

  overlays.dupvert.count = dupVertCount;
  if (dupVertPoints.length > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(dupVertPoints, 3));
    overlays.dupvert.group.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: hexToInt(overlays.dupvert.color), size: 1, sizeAttenuation: false, depthTest: false })));
  }

  overlays.isolated.count = trueIsolatedCount;
  if (trueIsolatedPoints.length > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(trueIsolatedPoints, 3));
    overlays.isolated.group.add(new THREE.Points(g,
      new THREE.PointsMaterial({ color: hexToInt(overlays.isolated.color), size: 1, sizeAttenuation: false, depthTest: false })));
  }

  // ── Build heatmap ──
  const { densityCV } = buildVertexDensityMap(allGeometries, modelGroup);

  // ── Collect stats for health score & inspector ──
  const stats = {
    degenCount:       overlays.degen.count,
    ngonCount:        overlays.ngon.count,
    dupVertCount:     overlays.dupvert.count,
    flippedCount:     overlays.flipped.count,
    nonManifoldCount: overlays.nonmanifold.count,
    boundaryCount:    overlays.boundary.count,
    isolatedCount:    trueIsolatedCount,
    skinnyCount:      overlays.skinny.count,
    densityCV,
  };

  // ── Health Score ──
  const healthResult = computeHealthScore(faceCount, stats);
  updateHealthUI(healthResult);

  renderIssueCards(stats);
  updateMarkerSize();

  // ── 연산용 임시 Geometry 해제 (JS 힙 부하 방지) ──
  // VRAM에는 안 올라가지만 dispose() 안 하면 GC가 치울 때까지 메모리 점유
  posOnlyGeo.dispose();
  if (indexedGeo !== posOnlyGeo) indexedGeo.dispose();
}

// ════════════════════════════════════════════════════════
// LOAD MODEL
// ════════════════════════════════════════════════════════
let modelGroup = null;

function setProgress(pct, label) {
  document.getElementById('progress-wrap').style.display = 'block';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = label;
  if (pct >= 100) setTimeout(() => { document.getElementById('progress-wrap').style.display = 'none'; }, 800);
}

function loadModel(url, rawText) {
  rawObjText = rawText || '';
  document.getElementById('upload-btn').style.pointerEvents = 'none';
  setProgress(10, '파일을 불러오고 있어요...');

  // ── 이전 모델 완전 해제 (GPU 메모리 누수 방지) ──
  // scene.remove()만으로는 WebGL VRAM이 해제되지 않음
  // geometry.dispose() + material.dispose()를 명시적으로 순회 호출
  if (modelGroup) {
    modelGroup.traverse(function(obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      }
    });
    scene.remove(modelGroup);
    modelGroup = null;
  }
  // heatmap meshes도 동일하게 해제 (clearOverlays보다 먼저 실행될 수 있으므로 방어적으로)
  heatmapMeshes.forEach(function(m) {
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mat => mat.dispose());
    }
    scene.remove(m);
  });
  heatmapMeshes = [];
  currentMeshes = [];
  clearOverlays();  // 이전 에러 마커 즉시 제거 — 새 모델 로딩 중 잔상 방지
  // Quick Start 오버레이 숨기기
  const qs = document.getElementById('quick-start');
  if (qs) { qs.classList.remove('visible'); qs.classList.add('hidden'); }

  // 스캔라인 시작
  animSkipped = false;
  animTimeouts = [];
  if (animEnabled) {
    const scanLine = document.getElementById('scan-line');
    scanLine.classList.add('active');
    scanLine.style.top = '0%';
    // 스캔라인 내려가는 애니메이션
    let scanStart = performance.now();
    function moveScan(now) {
      const t = Math.min((now - scanStart) / 1500, 1);
      scanLine.style.top = (t * 100) + '%';
      if (t < 1 && !animSkipped) requestAnimationFrame(moveScan);
    }
    requestAnimationFrame(moveScan);
    // Skip 버튼 표시
    document.getElementById('skip-btn').classList.add('visible');
  }

  // Reset health display
  document.getElementById('health-score-val').textContent = '—';
  document.getElementById('health-grade').textContent = 'N/A';
  document.getElementById('health-desc').textContent = '검사 중이에요...';
  document.getElementById('health-bar-fill').style.width = '0%';

  const hasLineElements = /^l\s/m.test(rawObjText);
  const cleanedObjText = hasLineElements
    ? rawObjText.split('\n').filter(line => !line.trim().startsWith('l ')).join('\n')
    : rawObjText;

  const cleanedBlob = new Blob([cleanedObjText], { type: 'text/plain' });
  const cleanedUrl  = URL.createObjectURL(cleanedBlob);
  const loader = new THREE.OBJLoader();

  loader.load(cleanedUrl, function(obj) {
    setProgress(50, '검사 중이에요...');
    modelGroup = new THREE.Group();
    let firstGeometry = null;
    const allGeometries = [];  // density map용 전체 geometry 수집

    if (hasLineElements) {
      renderIssueMessage('warn', 'ℹ', 'Line element(l)이 감지됐어요 — 분석에서 제외돼요.');
    }

    obj.traverse(function(child) {
      if (child.isLine && !child.isMesh) {
        child.material = new THREE.LineBasicMaterial({ color: 0x888888, opacity: 0.5, transparent: true });
        modelGroup.add(child.clone());
        return;
      }
      if (!child.isMesh) return;
      child.geometry.computeVertexNormals();
      if (!firstGeometry) firstGeometry = child.geometry;
      allGeometries.push(child.geometry);  // 전체 수집

      // OBJLoader가 내부적으로 생성한 기본 머티리얼 즉시 해제
      // (씬에 추가되지 않으므로 dispose하지 않으면 JS 힙에 방치됨)
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => m.dispose());
      }

      const solidMesh = new THREE.Mesh(child.geometry, new THREE.MeshStandardMaterial({
        color: 0x4a4a55, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide
      }));
      const wireMesh = new THREE.Mesh(child.geometry, new THREE.MeshBasicMaterial({
        color: 0xaaaacc, wireframe: true, opacity: 0.45, transparent: true
      }));
      currentMeshes.push({ solid: solidMesh, wire: wireMesh });
      modelGroup.add(solidMesh);
      modelGroup.add(wireMesh);
    });

    if (!firstGeometry) {
      renderIssueMessage('warn', '⚠', '면(face)이 없는 파일이에요');
    }

    scene.add(modelGroup);
    applyViewMode();

    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.copy(center).add(new THREE.Vector3(0, maxDim*0.5, maxDim*2.5));
    controls.target.copy(center);
    controls.update();
    grid.position.y = box.min.y;
    overlayGroup.position.copy(modelGroup.position);
    overlayGroup.rotation.copy(modelGroup.rotation);
    overlayGroup.scale.copy(modelGroup.scale);

    setProgress(80, '위상을 분석하고 있어요...');
    setTimeout(function() {
      try {
        if (firstGeometry) runAnalysis(firstGeometry, allGeometries);
      } catch(e) {
        console.error('분석 오류:', e);
        renderIssueMessage('error', '✕', '분석 중 오류가 발생했어요');
      }
      setProgress(100, '검사가 끝났어요');
      document.getElementById('upload-btn').style.pointerEvents = '';

      // 히스토리에 추가
      if (_pendingLoad) {
        var vText = document.getElementById('v-count').textContent.replace(/\s*\(.*\)/, '');
        var healthNum = (_lastHealthScore !== null) ? _lastHealthScore : '—';
        addToHistory(_pendingLoad, { verts: vText, health: healthNum });
        _pendingLoad = null;
      }

      // 스캔라인 종료 + Skip 버튼 숨기기
      animDelay(function() {
        document.getElementById('scan-line').classList.remove('active');
        document.getElementById('skip-btn').classList.remove('visible');
        animRunning = false;
      }, animEnabled && !animSkipped ? 1200 : 0);
      URL.revokeObjectURL(url);
      URL.revokeObjectURL(cleanedUrl);
    }, 50);

  }, function(xhr) {
    if (xhr.total) setProgress(10 + (xhr.loaded/xhr.total)*40, '불러오고 있어요...');
  }, function(err) {
    console.error(err);
    renderIssueMessage('error', '✕', '파일 로드 실패');
    document.getElementById('upload-btn').style.pointerEvents = '';
  });
}

// ════════════════════════════════════════════════════════
// FILE INPUT / DRAG & DROP
// ════════════════════════════════════════════════════════
document.getElementById('file-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  validateAndLoad(file);
  e.target.value = '';
});
viewport.addEventListener('dragover',  function(e) {
  e.preventDefault();
  viewport.classList.add('drag-hover');
  document.getElementById('drop-overlay').style.display = 'flex';
});
viewport.addEventListener('dragleave', function() {
  viewport.classList.remove('drag-hover');
  document.getElementById('drop-overlay').style.display = 'none';
});
viewport.addEventListener('drop', function(e) {
  e.preventDefault();
  viewport.classList.remove('drag-hover');
  document.getElementById('drop-overlay').style.display = 'none';
  const file = e.dataTransfer.files[0];
  if (!file || !file.name.toLowerCase().endsWith('.obj')) return;
  validateAndLoad(file);
});

// ════════════════════════════════════════════════════════
// THEME (LIGHT / DARK)
// ════════════════════════════════════════════════════════
let isLight = localStorage.getItem('tg_theme') === 'light';

function applyTheme() {
  document.body.classList.toggle('light', isLight);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isLight ? '○' : '◐';

  // Three.js 씬 배경색도 동기화
  if (scene) {
    scene.background = new THREE.Color(isLight ? 0xf0f0f4 : 0x1a1a1f);
  }
  // 그리드 색상도 모드에 맞게
  if (grid) {
    grid.material.color.set(isLight ? 0xc0c0cc : 0x2e2e3a);
    // GridHelper는 material이 배열 [center, grid]
    if (Array.isArray(grid.material)) {
      grid.material[0].color.set(isLight ? 0xa0a0b0 : 0x2e2e3a);
      grid.material[1].color.set(isLight ? 0xc8c8d8 : 0x252530);
    }
  }
}

function toggleTheme() {
  isLight = !isLight;
  localStorage.setItem('tg_theme', isLight ? 'light' : 'dark');
  applyTheme();
}

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
applyAnimToggleUI();
applyTheme();

// ════════════════════════════════════════════════════════
// RENDER LOOP
// ════════════════════════════════════════════════════════
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
