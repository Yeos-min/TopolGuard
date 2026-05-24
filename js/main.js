import {
  viewport,
  scene,
  camera,
  renderer,
  controls,
  overlayGroup,
  initViewport,
  setCurrentMeshes,
  clearSceneState,
  cancelParticleWave,
  runParticleWaveUntil,
  getOverlayByIssueKey,
  getFirstIssuePosition,
  applyOverlayColor,
  focusOnIssue,
  applyAnalysisVisuals,
  frameModel,
  resetColors
} from './viewport.js';

import {
  applyAnimToggleUI,
  showToast,
  setProgress,
  initSidePanel,
  initSidePanelResize,
  initHistoryPreview,
  renderHistory,
  renderSampleButtons,
  renderIssueMessage,
  renderIssueCards,
  computeHealthScore,
  updateHealthUI,
  getLastHealthScore,
  updateMeshInfo
} from './ui.js';

const PARTICLE_PREF_KEY = 'topolguard.particle-wave';

function readParticlePreference() {
  try {
    const value = localStorage.getItem(PARTICLE_PREF_KEY);
    if (value === null) return true;
    return value !== 'off';
  } catch (error) {
    return true;
  }
}

function writeParticlePreference(enabled) {
  try {
    localStorage.setItem(PARTICLE_PREF_KEY, enabled ? 'on' : 'off');
  } catch (error) {
    // Private browsing or disabled storage: keep the in-memory state.
  }
}

let animEnabled = readParticlePreference();
let animRunning = false;
let animSkipped = false;
let animTimeouts = [];
let pendingFinalizeCallback = null;

let historyEntries = [];
const MAX_HISTORY = 20;
let currentLoadedFile = null;
let pendingLoad = null;

let rawObjText = '';
let analysisWorker = null;
let modelGroup = null;
let loadSequence = 0;
let lastAnalysisData = null;

const SAMPLE_PATHS = {
  ai: 'samples/Humanoid_AI.obj',
  human: 'samples/Humanoid_Human_Modified.obj'
};

const URL_SAMPLE_MAP = {
  humanoid_ai: 'ai',
  humanoid_human: 'human'
};

const MAX_FILE_SIZE_MB = 500;
const MAX_VERTEX_COUNT = 3000000;
const WARN_VERTEX_COUNT = 1000000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function finalizeAnimation() {
  if (pendingFinalizeCallback) {
    pendingFinalizeCallback();
    pendingFinalizeCallback = null;
  }
}

function animDelay(fn, ms) {
  if (!animEnabled || animSkipped) {
    fn();
    return null;
  }

  const id = setTimeout(fn, ms);
  animTimeouts.push(id);
  return id;
}

function toggleAnimSetting() {
  animEnabled = !animEnabled;
  writeParticlePreference(animEnabled);
  applyAnimToggleUI(animEnabled);
  showToast(
    'info',
    animEnabled ? '파티클 웨이브 ON' : '파티클 웨이브 OFF',
    animEnabled ? '다음 새 파일 로드부터 파티클 로딩이 재생돼요.' : '다음 새 파일 로드는 즉시 결과를 표시해요.',
    2000
  );
}

function skipAnimation() {
  animSkipped = true;
  animTimeouts.forEach(function(id) { clearTimeout(id); });
  animTimeouts = [];
  const skipButton = document.getElementById('skip-btn');
  const scanLine = document.getElementById('scan-line');
  if (skipButton) skipButton.classList.remove('visible');
  if (scanLine) scanLine.classList.remove('active');
  animRunning = false;
  finalizeAnimation();
}

function terminateAnalysisWorker() {
  if (analysisWorker) {
    analysisWorker.terminate();
    analysisWorker = null;
  }
}

function captureHistoryThumbnail() {
  let savedPos = null;
  let savedTarget = null;

  try {
    if (!modelGroup) return '';

    savedPos = camera.position.clone();
    savedTarget = controls.target.clone();

    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fov / 2) * 1.3;

    camera.position.set(center.x, center.y, center.z + dist);
    controls.target.copy(center);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    const sourceCanvas = renderer.domElement;
    const side = Math.min(sourceCanvas.width, sourceCanvas.height);
    const sx = Math.max(0, (sourceCanvas.width - side) / 2);
    const sy = Math.max(0, (sourceCanvas.height - side) / 2);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 220;
    thumbCanvas.height = 220;
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, sx, sy, side, side, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const thumbnailDataURL = ctx ? thumbCanvas.toDataURL('image/png') : sourceCanvas.toDataURL('image/png');

    camera.position.copy(savedPos);
    controls.target.copy(savedTarget);
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();

    return thumbnailDataURL;
  } catch (error) {
    if (savedPos && savedTarget) {
      camera.position.copy(savedPos);
      controls.target.copy(savedTarget);
      camera.lookAt(controls.target);
      camera.updateProjectionMatrix();
    }
    console.warn('History thumbnail capture failed:', error);
    return '';
  }
}

function addToHistory(info, analysisData) {
  historyEntries = historyEntries.filter(function(entry) {
    return entry.name !== info.name;
  });

  historyEntries.unshift({
    name: info.name,
    verts: analysisData.verts,
    health: analysisData.health,
    thumbnail: captureHistoryThumbnail(),
    loadedAt: Date.now(),
    isSample: info.isSample,
    samplePath: info.samplePath || null,
    objText: info.isSample ? null : info.objText,
    analysis: info.analysis || null
  });

  if (historyEntries.length > MAX_HISTORY) {
    historyEntries.pop();
  }

  currentLoadedFile = info.name;
  renderHistory(historyEntries, reloadFromHistory);
  renderSampleButtons(currentLoadedFile, SAMPLE_PATHS);
}

function reloadFromHistory(index) {
  const entry = historyEntries[index];
  if (!entry) return;

  if (entry.isSample && entry.samplePath) {
    pendingLoad = {
      isSample: true,
      samplePath: entry.samplePath,
      name: entry.name,
      analysis: entry.analysis || null
    };

    fetch(entry.samplePath)
      .then(function(response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function(text) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        loadModel(url, text, { skipParticle: true, cachedAnalysis: entry.analysis || null });
      })
      .catch(function(error) {
        console.error(error);
        pendingLoad = null;
        showToast('error', '히스토리를 복원하지 못했어요', entry.name, 4000);
      });
    return;
  }

  if (entry.objText) {
    pendingLoad = { isSample: false, name: entry.name, objText: entry.objText, analysis: entry.analysis || null };
    const blob = new Blob([entry.objText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    loadModel(url, entry.objText, { skipParticle: true, cachedAnalysis: entry.analysis || null });
  }
}

function loadSampleFromSidebar(which) {
  const path = SAMPLE_PATHS[which];
  const name = path.split('/').pop();
  const icon = which === 'ai' ? '⚠' : '✓';
  loadSample(path, name, icon);
}

function initSampleButtons() {
  document.querySelectorAll('.sample-btn[data-file]').forEach(function(button) {
    button.addEventListener('click', function() {
      const file = button.getAttribute('data-file');
      if (file === SAMPLE_PATHS.ai.split('/').pop()) {
        loadSampleFromSidebar('ai');
      } else if (file === SAMPLE_PATHS.human.split('/').pop()) {
        loadSampleFromSidebar('human');
      }
    });
  });
}

function autoLoadSampleFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const sampleParam = params.get('sample');
    if (!sampleParam) return;

    const internalKey = URL_SAMPLE_MAP[sampleParam];
    if (!internalKey) {
      console.warn('[TopolGuard] Unknown sample parameter:', sampleParam);
      return;
    }

    loadSampleFromSidebar(internalKey);
  } catch (error) {
    console.error('[TopolGuard] autoLoadSampleFromURL failed:', error);
  }
}

function loadSample(path, name, icon) {
  pendingLoad = {
    isSample: true,
    samplePath: path,
    name: name || path.split('/').pop()
  };

  showToast('info', icon + ' ' + name + ' 로드 중', '샘플 파일을 불러오고 있어요...', 3000);

  fetch(path)
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(function(text) {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      loadModel(url, text);
    })
    .catch(function(error) {
      console.error(error);
      pendingLoad = null;
      showToast('error', '샘플을 불러오지 못했어요', '파일을 가져올 수 없어요. (' + path + ')', 6000);
    });
}

function quickCountVertices(text) {
  let count = 0;
  let index = 0;
  while (index < text.length) {
    const newline = text.indexOf('\n', index);
    const lineEnd = newline === -1 ? text.length : newline;
    if (text[index] === 'v' && text[index + 1] === ' ') count += 1;
    index = lineEnd + 1;
  }
  return count;
}

function validateAndLoad(file) {
  if (!file.name.toLowerCase().endsWith('.obj')) {
    showToast('error', '이 파일은 열 수 없어요', '.obj 파일만 열 수 있어요. 현재 파일: ' + file.name);
    return;
  }

  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  if (file.size > MAX_FILE_SIZE_BYTES) {
    showToast('error', '파일이 너무 커요', '최대 ' + MAX_FILE_SIZE_MB + 'MB까지 열 수 있어요. 현재: ' + sizeMB + 'MB');
    return;
  }

  showToast('info', 'Reading File', file.name + ' (' + sizeMB + ' MB)', 1600);

  const reader = new FileReader();
  reader.onload = function() {
    const text = String(reader.result || '');
    const vertexCount = quickCountVertices(text);

    if (vertexCount > MAX_VERTEX_COUNT) {
      showToast('error', '정점 수 초과 — 열 수 없어요', '최대 ' + MAX_VERTEX_COUNT.toLocaleString() + '개까지 지원해요. 이 파일: ' + vertexCount.toLocaleString() + '개', 10000);
      return;
    }

    if (vertexCount > WARN_VERTEX_COUNT) {
      showToast('warn', '대용량 모델이에요', vertexCount.toLocaleString() + '개 이상 정점 — 검사에 시간이 걸릴 수 있어요.', 7000);
    }

    pendingLoad = { isSample: false, name: file.name, objText: text };
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    loadModel(url, text);
  };
  reader.onerror = function() {
    showToast('error', '파일을 읽지 못했어요', '파일이 손상되었을 수 있어요.');
  };
  reader.readAsText(file);
}

function applyAnalysisResult(analysisData, allGeometries) {
  if (!analysisData) return;

  lastAnalysisData = analysisData;
  updateMeshInfo(analysisData);
  const stats = applyAnalysisVisuals(analysisData, allGeometries, modelGroup) || {};
  const healthResult = computeHealthScore(analysisData.faceCount ?? 0, stats);
  updateHealthUI(healthResult, { animEnabled: animEnabled, animSkipped: animSkipped });
  renderIssueCards(stats, {
    getOverlay: getOverlayByIssueKey,
    getFirstIssuePosition: getFirstIssuePosition,
    applyOverlayColor: applyOverlayColor,
    focusOnIssue: function(issueKey) {
      focusOnIssue(issueKey, showToast);
    }
  });
}

function analyzeModelInWorker(text, allGeometries, onDone, onError) {
  terminateAnalysisWorker();
  analysisWorker = new Worker('js/worker.js');

  analysisWorker.onmessage = function(event) {
    const message = event.data || {};
    if (message.type === 'RESULT') {
      terminateAnalysisWorker();
      try {
        applyAnalysisResult(message.data, allGeometries);
        if (onDone) onDone(message.data);
      } catch (error) {
        if (onError) onError(error);
      }
    } else if (message.type === 'ERROR') {
      terminateAnalysisWorker();
      if (onError) onError(new Error(message.error || 'Worker analysis failed'));
    }
  };

  analysisWorker.onerror = function(error) {
    terminateAnalysisWorker();
    if (onError) onError(error);
  };

  analysisWorker.postMessage({ text: text });
}

function disposeModelGroup(group) {
  if (!group) return;

  group.traverse(function(object) {
    if (object.geometry) object.geometry.dispose();
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(function(material) { material.dispose(); });
  });

  scene.remove(group);
}

function setAppLoadingState(isLoading) {
  document.body.classList.toggle('is-loading', isLoading);
}

function setAppHasModel(hasModel) {
  document.body.classList.toggle('has-model', hasModel);
  if (hasModel) document.body.classList.remove('has-load-error');
}

function setResultsPanelReady(isReady) {
  if (isReady) document.body.classList.add('results-panel-ready');
}

function setAppErrorState(hasError) {
  document.body.classList.toggle('has-load-error', hasError);
}

function showInitialDropzone() {
  const quickStart = document.getElementById('quick-start');
  if (!quickStart) return;
  quickStart.classList.add('visible');
  quickStart.classList.remove('hidden');
}

function hideInitialDropzone() {
  const quickStart = document.getElementById('quick-start');
  if (!quickStart) return;
  quickStart.classList.remove('visible');
  quickStart.classList.add('hidden');
}

function loadModel(url, text, options) {
  options = options || {};
  const loadId = ++loadSequence;
  rawObjText = text ?? '';
  lastAnalysisData = null;
  terminateAnalysisWorker();
  cancelParticleWave();

  const uploadButton = document.getElementById('upload-btn');
  if (uploadButton) uploadButton.style.pointerEvents = 'none';
  setProgress(10, '파일을 불러오고 있어요...');
  setAppHasModel(false);
  setAppLoadingState(true);
  setAppErrorState(false);
  overlayGroup.visible = false;

  if (modelGroup) {
    disposeModelGroup(modelGroup);
    modelGroup = null;
  }

  clearSceneState();
  hideInitialDropzone();

  animSkipped = false;
  animTimeouts = [];

  const healthValue = document.getElementById('health-score-val');
  const healthGrade = document.getElementById('health-grade');
  const healthDesc = document.getElementById('health-desc');
  const healthFill = document.getElementById('health-bar-fill');
  if (healthValue) healthValue.textContent = '-';
  if (healthGrade) healthGrade.textContent = 'N/A';
  if (healthDesc) healthDesc.textContent = '검사 중이에요...';
  if (healthFill) healthFill.style.width = '0%';

  function finalizeLoad(cleanedUrl) {
    setProgress(100, '검사가 끝났어요');
    if (uploadButton) uploadButton.style.pointerEvents = '';
    overlayGroup.visible = true;
    setResultsPanelReady(true);
    setAppHasModel(true);
    setAppLoadingState(false);

    if (pendingLoad) {
      pendingLoad.analysis = lastAnalysisData;
      const vertsText = (document.getElementById('v-count') || { textContent: '0' }).textContent.replace(/\s*\(.*\)/, '');
      const healthNum = getLastHealthScore() !== null ? getLastHealthScore() : '-';
      addToHistory(pendingLoad, { verts: vertsText, health: healthNum });
      pendingLoad = null;
    }

    animRunning = false;

    URL.revokeObjectURL(url);
    URL.revokeObjectURL(cleanedUrl);
  }

  function failLoad(cleanedUrl, message) {
    if (uploadButton) uploadButton.style.pointerEvents = '';
    setAppLoadingState(false);
    setAppHasModel(false);
    setAppErrorState(true);
    overlayGroup.visible = false;
    showInitialDropzone();
    cancelParticleWave();
    if (modelGroup) {
      disposeModelGroup(modelGroup);
      modelGroup = null;
      clearSceneState();
    }
    renderIssueMessage('error', '✕', message);
    URL.revokeObjectURL(url);
    if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
  }

  const hasLineElements = /^l\s/m.test(rawObjText);
  const cleanedObjText = hasLineElements
    ? rawObjText.split('\n').filter(function(line) { return !line.trim().startsWith('l '); }).join('\n')
    : rawObjText;

  const cleanedBlob = new Blob([cleanedObjText], { type: 'text/plain' });
  const cleanedUrl = URL.createObjectURL(cleanedBlob);
  const loader = new THREE.OBJLoader();

  loader.load(
    cleanedUrl,
    function(object) {
      if (loadId !== loadSequence) {
        URL.revokeObjectURL(url);
        URL.revokeObjectURL(cleanedUrl);
        return;
      }

      setProgress(50, '검사 중이에요...');
      modelGroup = new THREE.Group();
      let firstGeometry = null;
      const allGeometries = [];
      const meshPairs = [];

      if (hasLineElements) {
        renderIssueMessage('warn', 'ℹ', 'Line element(l)이 감지됐어요 — 분석에서 제외돼요.');
      }

      object.traverse(function(child) {
        if (child.isLine && !child.isMesh) {
          child.material = new THREE.LineBasicMaterial({ color: 0x888888, opacity: 0.5, transparent: true });
          modelGroup.add(child.clone());
          return;
        }

        if (!child.isMesh) return;

        child.geometry.computeVertexNormals();
        if (!firstGeometry) firstGeometry = child.geometry;
        allGeometries.push(child.geometry);

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(function(material) { material.dispose(); });
        }

        const solidMesh = new THREE.Mesh(child.geometry, new THREE.MeshStandardMaterial({
          color: 0x4a4a55,
          roughness: 0.7,
          metalness: 0.0,
          side: THREE.DoubleSide
        }));
        const wireMesh = new THREE.Mesh(child.geometry, new THREE.MeshBasicMaterial({
          color: 0xaaaacc,
          wireframe: true,
          opacity: 0.45,
          transparent: true
        }));

        meshPairs.push({ solid: solidMesh, wire: wireMesh });
        modelGroup.add(solidMesh);
        modelGroup.add(wireMesh);
      });

      if (!firstGeometry) {
        renderIssueMessage('warn', '⚠', '면(face)이 없는 파일이에요');
      }

      scene.add(modelGroup);
      setCurrentMeshes(meshPairs);
      frameModel(modelGroup);
      modelGroup.visible = false;

      setProgress(80, '위상을 분석하고 있어요...');

      if (!firstGeometry) {
        failLoad(cleanedUrl, '면(face)이 없는 파일이에요');
        return;
      }

      animRunning = true;
      const analysisPromise = options.cachedAnalysis
        ? Promise.resolve(options.cachedAnalysis).then(function(analysisData) {
          applyAnalysisResult(analysisData, allGeometries);
          return analysisData;
        })
        : new Promise(function(resolve, reject) {
          analyzeModelInWorker(rawObjText, allGeometries, resolve, reject);
        });

      const shouldRunParticle = animEnabled && !options.skipParticle;
      const displayPromise = shouldRunParticle
        ? runParticleWaveUntil(modelGroup, analysisPromise, {
          minDuration: 2500,
          finalDuration: 500,
          fadeDuration: 300
        })
        : analysisPromise;

      displayPromise.then(function() {
        if (loadId !== loadSequence) return;
        modelGroup.visible = true;
        finalizeLoad(cleanedUrl);
      }).catch(function(error) {
        if (loadId !== loadSequence) return;
        console.error('분석 오류:', error);
        modelGroup.visible = true;
        renderIssueMessage('error', '✕', '분석 중 오류가 발생했어요');
        finalizeLoad(cleanedUrl);
      });
    },
    function(xhr) {
      if (xhr.total) {
        setProgress(10 + (xhr.loaded / xhr.total) * 40, '불러오고 있어요...');
      }
    },
    function(error) {
      if (loadId !== loadSequence) {
        URL.revokeObjectURL(url);
        URL.revokeObjectURL(cleanedUrl);
        return;
      }
      console.error(error);
      terminateAnalysisWorker();
      failLoad(cleanedUrl, '파일 로드 실패');
    }
  );
}

function initFileInteractions() {
  const fileUpload = document.getElementById('file-upload');
  if (fileUpload) {
    fileUpload.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) return;
      validateAndLoad(file);
      event.target.value = '';
    });
  }

  viewport.addEventListener('dragover', function(event) {
    event.preventDefault();
    viewport.classList.add('drag-hover');
    const overlay = document.getElementById('drop-overlay');
    if (overlay) overlay.style.display = 'flex';
  });

  viewport.addEventListener('dragleave', function() {
    viewport.classList.remove('drag-hover');
    const overlay = document.getElementById('drop-overlay');
    if (overlay) overlay.style.display = 'none';
  });

  viewport.addEventListener('drop', function(event) {
    event.preventDefault();
    viewport.classList.remove('drag-hover');
    const overlay = document.getElementById('drop-overlay');
    if (overlay) overlay.style.display = 'none';

    const file = event.dataTransfer.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.obj')) return;
    validateAndLoad(file);
  });
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(event) {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (document.activeElement && document.activeElement.isContentEditable) return;

    if (event.key === 'a' || event.key === 'A') loadSampleFromSidebar('ai');
    if (event.key === 'h' || event.key === 'H') loadSampleFromSidebar('human');
  });
}

window.toggleAnimSetting = toggleAnimSetting;
window.skipAnimation = skipAnimation;
window.loadSample = loadSample;
window.resetColors = function() {
  resetColors(showToast);
};

document.addEventListener('DOMContentLoaded', function() {
  applyAnimToggleUI(animEnabled);
  initViewport();
  initSidePanel();
  initSidePanelResize();
  initHistoryPreview();
  initSampleButtons();
  initFileInteractions();
  initKeyboardShortcuts();
  renderHistory(historyEntries, reloadFromHistory);
  renderSampleButtons(currentLoadedFile, SAMPLE_PATHS);
  autoLoadSampleFromURL();
});
