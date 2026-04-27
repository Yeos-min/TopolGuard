const TOAST_ICONS = {
  error: '!',
  warn: '!',
  info: 'i',
  success: '+'
};

const ISSUE_META = {
  'non-manifold': {
    glyph: '✕',
    label: 'NON-MANIFOLD',
    desc: '세 면 이상이 한 모서리를 공유하고 있어요. 불리언·UV·3D 프린팅이 막힐 수 있어요.'
  },
  boundary: {
    glyph: '○',
    label: 'BOUNDARY EDGE',
    desc: '메쉬에 열린 경계가 있어요. 3D 프린팅이나 시뮬레이션이 어려울 수 있어요.'
  },
  skinny: {
    glyph: '△',
    label: 'SKINNY TRIANGLE',
    desc: '극단적으로 얇고 긴 삼각형이 있어요. 셰이딩이나 시뮬레이션이 불안정해질 수 있어요.'
  },
  ngon: {
    glyph: '⬡',
    label: 'N-GON',
    desc: '5각형 이상의 면이 있어요. 엔진마다 다르게 쪼개져서 결과가 예측 불가예요.'
  },
  degenerate: {
    glyph: '◠',
    label: 'DEGENERATE',
    desc: '면적이 거의 0인 면이 있어요. 법선이 정의되지 않아서 렌더링에서 튀어요.'
  },
  flipped: {
    glyph: '⇄',
    label: 'FLIPPED NORMAL',
    desc: '이웃 면과 반대 방향을 향하는 면이 있어요. 렌더러에서 사라지거나 검게 보일 수 있어요.'
  },
  isolated: {
    glyph: '·',
    label: 'ISOLATED VERTEX',
    desc: '어떤 면에도 속하지 않는 떠 있는 점이 있어요. 정리하는 게 좋아요.'
  },
  duplicate: {
    glyph: '◉',
    label: 'DUPLICATE VERTEX',
    desc: '위치가 거의 같은 점 여러 개가 있어요. 모으거나 합치는 게 좋아요.'
  }
};

const ISSUE_SEVERITY = {
  'non-manifold': 'critical',
  degenerate: 'critical',
  flipped: 'error',
  boundary: 'error',
  ngon: 'warning',
  skinny: 'warning',
  duplicate: 'info',
  isolated: 'info'
};

const SEVERITY_RANK = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3
};

let lastHealthScore = null;

function applyAnimToggleUI(animEnabled) {
  const animButton = document.getElementById('anim-icon-btn');
  if (animButton) animButton.classList.toggle('active', animEnabled);
}

function countUpTo(element, targetValue, duration, suffix) {
  if (!element) return;

  suffix = suffix || '';
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const current = Math.round(targetValue * ease);
    element.textContent = current + suffix;
    if (t < 1) requestAnimationFrame(tick);
    else element.textContent = targetValue + suffix;
  }

  requestAnimationFrame(tick);
}

function showToast(type, title, msg, duration) {
  duration = duration || 5000;
  const container = document.getElementById('toast-container');
  if (!container) return null;

  const element = document.createElement('div');
  element.className = 'toast ' + type;
  element.innerHTML =
    '<span class="toast-corner-bl"></span>' +
    '<span class="toast-corner-br"></span>' +
    '<span class="toast-icon">' + (TOAST_ICONS[type] || 'i') + '</span>' +
    '<div class="toast-body"><div class="toast-title">' + title + '</div>' +
    (msg ? '<div class="toast-msg">' + msg + '</div>' : '') + '</div>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">x</button>';

  container.appendChild(element);

  if (duration > 0) {
    setTimeout(function() {
      element.style.animation = 'toast-out 0.3s ease-in forwards';
      setTimeout(function() { element.remove(); }, 300);
    }, duration);
  }

  return element;
}

function setProgress(percent, label) {
  const wrap = document.getElementById('progress-wrap');
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-label');
  if (!wrap || !fill || !text) return;

  wrap.style.display = 'block';
  fill.style.width = percent + '%';
  text.textContent = label;

  if (percent >= 100) {
    setTimeout(function() {
      wrap.style.display = 'none';
    }, 800);
  }
}

function initSidePanel() {
  const panel = document.getElementById('side-panel');
  const tab = document.getElementById('side-panel-tab');
  if (!panel || !tab) return;

  const storageKey = 'topolguard-sidepanel-state';
  const savedState = localStorage.getItem(storageKey);
  if (savedState === 'expanded') {
    panel.classList.remove('collapsed');
    panel.classList.add('expanded');
  }

  tab.addEventListener('click', function() {
    const isExpanded = panel.classList.contains('expanded');
    panel.classList.toggle('expanded');
    panel.classList.toggle('collapsed');
    localStorage.setItem(storageKey, isExpanded ? 'collapsed' : 'expanded');
  });
}

function initSidePanelResize() {
  const panel = document.getElementById('side-panel');
  if (!panel) return;

  const handle = panel.querySelector('.side-panel-resize-handle');
  const body = panel.querySelector('.side-panel-body');
  if (!handle || !body) return;

  const minWidth = 220;
  const maxWidth = 500;
  const widthKey = 'topolguard-sidepanel-width';
  const savedWidth = localStorage.getItem(widthKey);
  if (savedWidth) body.style.setProperty('--side-panel-width', savedWidth);

  handle.addEventListener('mousedown', function(event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = body.offsetWidth || minWidth;

    function onMouseMove(moveEvent) {
      let newWidth = startWidth + (moveEvent.clientX - startX);
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      body.style.setProperty('--side-panel-width', newWidth + 'px');

      const samplesContent = panel.querySelector('.samples-section .section-content');
      if (samplesContent) {
        samplesContent.style.flexDirection = newWidth >= 320 ? 'row' : 'column';
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem(widthKey, body.style.getPropertyValue('--side-panel-width'));
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  const samplesContent = panel.querySelector('.samples-section .section-content');
  if (samplesContent) {
    const initialWidth = body.offsetWidth || minWidth;
    samplesContent.style.flexDirection = initialWidth >= 320 ? 'row' : 'column';
  }
}

function initHistoryPreview() {
  const list = document.getElementById('history-list');
  const preview = document.getElementById('history-preview');
  const previewImage = document.getElementById('history-preview-img');
  const panel = document.getElementById('side-panel');
  if (!list || !preview || !previewImage || !panel) return;

  list.addEventListener('mouseover', function(event) {
    const item = event.target.closest('.history-item');
    if (!item) return;

    const image = item.querySelector('.history-thumb img');
    if (!image || !image.src) return;

    previewImage.src = image.src;

    const panelRect = panel.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    let topPos = itemRect.top;
    if (topPos + 230 > window.innerHeight) {
      topPos = window.innerHeight - 240;
    }

    preview.style.left = (panelRect.right + 8) + 'px';
    preview.style.top = topPos + 'px';
    preview.classList.remove('hidden');
  });

  list.addEventListener('mouseout', function(event) {
    const item = event.target.closest('.history-item');
    if (!item) return;
    if (item.contains(event.relatedTarget)) return;
    preview.classList.add('hidden');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderHistory(historyEntries, onReload) {
  const container = document.getElementById('history-list');
  const emptyElement = document.getElementById('history-empty');
  if (!container) return;

  if (!historyEntries || historyEntries.length === 0) {
    if (emptyElement) emptyElement.style.display = '';
    container.querySelectorAll('.history-entry, .history-item').forEach(function(entry) {
      entry.remove();
    });
    return;
  }

  if (emptyElement) emptyElement.style.display = 'none';
  container.querySelectorAll('.history-entry, .history-item').forEach(function(entry) {
    entry.remove();
  });

  historyEntries.forEach(function(entry, index) {
    const element = document.createElement('li');
    element.className = 'history-item';
    element.onclick = function() { onReload(index); };
    element.innerHTML =
      '<div class="history-thumb">' +
        (entry.thumbnail ? '<img src="' + entry.thumbnail + '" alt="thumbnail">' : '') +
      '</div>' +
      '<span class="history-name">' + escapeHtml(entry.name) + '</span>';
    container.appendChild(element);
  });
}

function renderSampleButtons(currentLoadedFile, samplePaths) {
  const aiButton = document.getElementById('sample-ai-btn');
  const humanButton = document.getElementById('sample-human-btn');
  if (!aiButton || !humanButton) return;

  const aiName = samplePaths.ai.split('/').pop();
  const humanName = samplePaths.human.split('/').pop();

  aiButton.classList.toggle('active', currentLoadedFile === aiName);
  humanButton.classList.toggle('active', currentLoadedFile === humanName);
}

function renderIssueMessage(type, icon, text) {
  const container = document.getElementById('issue-cards-container');
  if (!container) return;

  container.innerHTML =
    '<div class="issue-item ' + type + '">' +
      '<span class="issue-icon">' + icon + '</span><span>' + text + '</span>' +
    '</div>';
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

function createIssueCard(issueKey, meta, count, actions) {
  const overlay = actions.getOverlay(issueKey);
  const overlayKey = issueKey;
  const isOn = !overlay || overlay.group.visible;
  const color = overlay ? overlay.color : '#888888';
  const canFocus = !!actions.getFirstIssuePosition(issueKey);
  const severity = ISSUE_SEVERITY[issueKey] || 'info';

  const card = document.createElement('div');
  card.className = 'issue-card collapsed severity-' + severity + (count === 0 ? ' issue-card-empty' : '');
  card.setAttribute('data-issue', issueKey);
  card.setAttribute('data-expanded', 'false');
  card.innerHTML =
    '<div class="issue-card-header">' +
      '<span class="issue-glyph">' + meta.glyph + '</span>' +
      '<span class="issue-label">' + meta.label + '</span>' +
      '<span class="issue-count">' + count.toLocaleString() + '</span>' +
      '<span class="issue-chevron">></span>' +
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
      '<button class="focus-btn"' + (canFocus ? '' : ' disabled') + '>GO TO ISSUE</button>' +
    '</div>';

  const header = card.querySelector('.issue-card-header');
  header.addEventListener('click', function() {
    if (count === 0) return;
    const isExpanded = card.getAttribute('data-expanded') === 'true';
    card.classList.toggle('expanded');
    card.classList.toggle('collapsed', !card.classList.contains('expanded'));
    card.setAttribute('data-expanded', isExpanded ? 'false' : 'true');
  });

  const toggleButton = card.querySelector('.mini-toggle');
  toggleButton.addEventListener('click', function(event) {
    event.stopPropagation();
    if (!overlay) return;
    overlay.group.visible = !overlay.group.visible;
    toggleButton.setAttribute('data-on', overlay.group.visible ? 'true' : 'false');
  });

  const swatch = card.querySelector('.color-swatch');
  const colorInput = card.querySelector('input[type=color]');
  swatch.addEventListener('click', function(event) {
    event.stopPropagation();
    colorInput.click();
  });
  colorInput.addEventListener('click', function(event) {
    event.stopPropagation();
  });
  colorInput.addEventListener('input', function(event) {
    event.stopPropagation();
    swatch.style.background = colorInput.value;
    actions.applyOverlayColor(overlayKey, colorInput.value);
  });

  const focusButton = card.querySelector('.focus-btn');
  focusButton.addEventListener('click', function(event) {
    event.stopPropagation();
    if (focusButton.disabled) return;
    actions.focusOnIssue(issueKey);
  });

  return card;
}

function renderIssueCards(stats, actions) {
  const container = document.getElementById('issue-cards-container');
  if (!container) return;

  container.innerHTML = '';

  const allIssues = [];
  let totalCount = 0;
  Object.keys(ISSUE_META).forEach(function(key) {
    const count = getCountForIssue(key, stats);
    allIssues.push({ key: key, count: count });
    totalCount += count;
  });

  if (totalCount === 0) {
    container.innerHTML = '<div class="all-pass">✓ 모든 검사를 통과했어요</div>';
    return;
  }

  allIssues.sort(function(a, b) {
    const sevA = SEVERITY_RANK[ISSUE_SEVERITY[a.key]] ?? 99;
    const sevB = SEVERITY_RANK[ISSUE_SEVERITY[b.key]] ?? 99;
    if (sevA !== sevB) return sevA - sevB;
    return b.count - a.count;
  });

  allIssues.forEach(function(issue) {
    const meta = ISSUE_META[issue.key];
    const card = createIssueCard(issue.key, meta, issue.count, actions);
    container.appendChild(card);
  });
}

function computeHealthScore(faceCount, stats) {
  if (faceCount === 0) {
    return { score: 0, grade: 'N/A', desc: '면이 없어요', color: '#888' };
  }

  let score = 100;
  const fc = Math.max(faceCount, 1);
  const rules = [
    { count: stats.degenCount, weight: 30 },
    { count: stats.ngonCount, weight: 15 },
    { count: stats.flippedCount, weight: 20 },
    { count: stats.nonManifoldCount, weight: 25 },
    { count: stats.boundaryCount, weight: 5 },
    { count: stats.isolatedCount, weight: 5 },
    { count: stats.skinnyCount, weight: 8 }
  ];

  rules.forEach(function(rule) {
    if (rule.count > 0) {
      const ratio = Math.min(rule.count / fc, 1);
      const penalty = rule.weight * (0.05 + 0.95 * Math.pow(ratio, 0.3));
      score -= penalty;
    }
  });

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 95) return { score: score, grade: 'S', desc: '완벽에 가까운 토폴로지예요', color: '#30d158' };
  if (score >= 85) return { score: score, grade: 'A', desc: '우수한 메쉬 품질이에요', color: '#62a353' };
  if (score >= 70) return { score: score, grade: 'B', desc: '양호해요 — 일부 문제만 확인해 주세요', color: '#d9a336' };
  if (score >= 50) return { score: score, grade: 'C', desc: '주의가 필요해요 — 정리 후 사용하는 게 좋아요', color: '#e87d3e' };
  if (score >= 30) return { score: score, grade: 'D', desc: '불량에 가까워요 — 여러 오류가 있어요', color: '#cf4b4b' };
  return { score: score, grade: 'F', desc: '심각한 토폴로지 문제예요', color: '#ff2222' };
}

function updateHealthUI(result, animationState) {
  lastHealthScore = result.score;

  const value = document.getElementById('health-score-val');
  const grade = document.getElementById('health-grade');
  const desc = document.getElementById('health-desc');
  const fill = document.getElementById('health-bar-fill');
  if (!value || !grade || !desc || !fill) return;

  value.style.color = result.color;
  grade.textContent = result.grade;
  grade.style.color = result.color;
  desc.textContent = result.desc;

  if (animationState.animEnabled && !animationState.animSkipped) {
    countUpTo(value, result.score, 900);
    fill.style.transition = 'width 0.9s cubic-bezier(0.16,1,0.3,1), background 0.4s';
    fill.style.background = result.color;
    requestAnimationFrame(function() {
      fill.style.width = '0%';
      requestAnimationFrame(function() {
        fill.style.width = result.score + '%';
      });
    });
  } else {
    value.textContent = result.score;
    fill.style.transition = 'none';
    fill.style.width = result.score + '%';
    fill.style.background = result.color;
  }
}

function getLastHealthScore() {
  return lastHealthScore;
}

function updateMeshInfo(analysisData) {
  const bboxSize = analysisData.bboxSize || [0, 0, 0];

  const bbox = document.getElementById('bbox');
  const vCount = document.getElementById('v-count');
  const fCount = document.getElementById('f-count');
  const eCount = document.getElementById('e-count');
  const euler = document.getElementById('euler');

  if (bbox) {
    bbox.textContent =
      bboxSize[0].toFixed(3) + ' / ' +
      bboxSize[1].toFixed(3) + ' / ' +
      bboxSize[2].toFixed(3);
  }
  if (vCount) vCount.textContent = (analysisData.mergedVerts || 0).toLocaleString();
  if (fCount) fCount.textContent = Math.round(analysisData.faceCount || 0).toLocaleString();
  if (eCount) eCount.textContent = analysisData.edgeCount != null ? analysisData.edgeCount.toLocaleString() : '-';
  if (euler) euler.textContent = analysisData.euler != null ? ((analysisData.euler >= 0 ? '+' : '') + analysisData.euler) : '-';
}

export {
  applyAnimToggleUI,
  countUpTo,
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
};
