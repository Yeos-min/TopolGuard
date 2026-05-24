import { issueDescriptions } from './issue-descriptions.js';

const TOAST_ICONS = {
  error: '!',
  warn: '!',
  info: 'i',
  success: '+'
};

const ISSUE_META = {
  'non-manifold': {
    glyph: '✕',
    label: 'NON-MANIFOLD'
  },
  boundary: {
    glyph: '○',
    label: 'BOUNDARY EDGE'
  },
  skinny: {
    glyph: '△',
    label: 'SKINNY TRIANGLE'
  },
  ngon: {
    glyph: '⬡',
    label: 'N-GON'
  },
  degenerate: {
    glyph: '◠',
    label: 'DEGENERATE'
  },
  flipped: {
    glyph: '⇄',
    label: 'FLIPPED NORMAL'
  },
  isolated: {
    glyph: '·',
    label: 'ISOLATED VERTEX'
  },
  duplicate: {
    glyph: '◉',
    label: 'DUPLICATE VERTEX'
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

const ISSUE_ORDER = [
  'non-manifold',
  'degenerate',
  'boundary',
  'flipped',
  'skinny',
  'ngon',
  'isolated',
  'duplicate'
];

let lastHealthScore = null;

function applyAnimToggleUI(animEnabled) {
  const animButton = document.getElementById('anim-icon-btn');
  if (!animButton) return;

  animButton.classList.toggle('active', animEnabled);
  animButton.textContent = animEnabled ? '⏸' : '▶';
  animButton.setAttribute('aria-pressed', animEnabled ? 'true' : 'false');
  animButton.setAttribute(
    'title',
    animEnabled ? '로딩 애니메이션 켜짐 — 누르면 끔' : '로딩 애니메이션 꺼짐 — 누르면 켬'
  );
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
    '<div class="toast-body"><div class="toast-title">' + escapeHtml(title) + '</div>' +
    (msg ? '<div class="toast-msg">' + escapeHtml(msg) + '</div>' : '') + '</div>' +
    '<button class="toast-close" type="button" aria-label="알림 닫기" onclick="this.parentElement.remove()">×</button>';

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
  if (!panel) return;
  panel.classList.remove('collapsed');
  panel.classList.add('expanded');
}

function initSidePanelResize() {
  // Sidebars are fixed in the gaze-guide layout; resize is intentionally disabled.
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

    preview.style.left = Math.max(8, panelRect.left - 244) + 'px';
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
    if (emptyElement) emptyElement.style.display = 'none';
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
      '<span class="history-name">' + escapeHtml(entry.name) + '</span>' +
      '<span class="history-meta">' +
        '<span>' + escapeHtml(entry.verts ?? '-') + 'v</span>' +
        '<span>s' + escapeHtml(entry.health ?? '-') + '</span>' +
      '</span>';
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
  if (issueKey === 'non-manifold') return stats.nonManifoldCount ?? 0;
  if (issueKey === 'boundary') return stats.boundaryCount ?? 0;
  if (issueKey === 'skinny') return stats.skinnyCount ?? 0;
  if (issueKey === 'ngon') return stats.ngonCount ?? 0;
  if (issueKey === 'degenerate') return stats.degenCount ?? 0;
  if (issueKey === 'flipped') return stats.flippedCount ?? 0;
  if (issueKey === 'isolated') return stats.isolatedCount ?? 0;
  if (issueKey === 'duplicate') return stats.dupVertCount ?? 0;
  return 0;
}

function createCompactIssueRow(issueKey, meta) {
  const severity = ISSUE_SEVERITY[issueKey] || 'info';
  const row = document.createElement('div');
  row.className = 'issue-card issue-card-compact issue-card-empty severity-' + severity;
  row.setAttribute('data-issue', issueKey);
  row.innerHTML =
    '<span class="issue-glyph">' + meta.glyph + '</span>' +
    '<span class="issue-label">' + meta.label + '</span>' +
    '<span class="issue-count">0</span>';
  return row;
}

function createIssueCard(issueKey, meta, count, actions) {
  const overlay = actions.getOverlay(issueKey);
  const overlayKey = issueKey;
  const isOn = !overlay || overlay.group.visible;
  const color = overlay ? overlay.color : '#888888';
  const canFocus = !!actions.getFirstIssuePosition(issueKey);
  const severity = ISSUE_SEVERITY[issueKey] || 'info';
  const description = issueDescriptions[issueKey] ?? '';

  const card = document.createElement('div');
  card.className = 'issue-card issue-card-large severity-' + severity;
  card.setAttribute('data-issue', issueKey);
  card.innerHTML =
    '<div class="issue-card-visual">' +
      '<span class="issue-glyph" aria-hidden="true">' + meta.glyph + '</span>' +
      '<span class="issue-count">' + count.toLocaleString() + '</span>' +
    '</div>' +
    '<div class="issue-card-detail">' +
      '<div class="issue-card-title-row">' +
        '<div class="issue-card-title">' + meta.label + '</div>' +
        '<button class="issue-info-btn" type="button" aria-expanded="false" aria-label="설명 열기">ⓘ</button>' +
      '</div>' +
      '<div class="card-content-stack">' +
        '<div class="card-controls">' +
          '<div class="issue-control">' +
            '<span class="control-label">Show layer</span>' +
            '<button class="mini-toggle" data-on="' + (isOn ? 'true' : 'false') + '"></button>' +
          '</div>' +
          '<div class="issue-control">' +
            '<span class="control-label">Overlay</span>' +
            '<div class="color-swatch-wrap">' +
              '<div class="color-swatch" id="swatch-' + overlayKey + '" style="background:' + color + '"></div>' +
              '<input type="color" class="color-input-hidden" id="colorpick-' + overlayKey + '" value="' + color + '">' +
            '</div>' +
          '</div>' +
          '<button class="focus-btn"' + (canFocus ? '' : ' disabled') + '>GO TO ISSUE</button>' +
        '</div>' +
        '<div class="card-description">' + escapeHtml(description) + '</div>' +
      '</div>' +
    '</div>';

  const infoButton = card.querySelector('.issue-info-btn');
  infoButton.addEventListener('click', function(event) {
    event.stopPropagation();
    const isOpen = card.classList.toggle('description-open');
    infoButton.textContent = isOpen ? '✕' : 'ⓘ';
    infoButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    infoButton.setAttribute('aria-label', isOpen ? '설명 닫기' : '설명 열기');
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
  ISSUE_ORDER.forEach(function(key) {
    const count = getCountForIssue(key, stats);
    allIssues.push({ key: key, count: count });
  });

  const positiveIssues = allIssues.filter(function(issue) { return issue.count > 0; });
  const zeroIssues = allIssues.filter(function(issue) { return issue.count === 0; });

  positiveIssues.sort(function(a, b) {
    const sevA = SEVERITY_RANK[ISSUE_SEVERITY[a.key]] ?? 99;
    const sevB = SEVERITY_RANK[ISSUE_SEVERITY[b.key]] ?? 99;
    if (sevA !== sevB) return sevA - sevB;
    const orderA = ISSUE_ORDER.indexOf(a.key);
    const orderB = ISSUE_ORDER.indexOf(b.key);
    return orderA - orderB;
  });

  positiveIssues.forEach(function(issue) {
    const meta = ISSUE_META[issue.key];
    const card = createIssueCard(issue.key, meta, issue.count, actions);
    container.appendChild(card);
  });

  if (positiveIssues.length && zeroIssues.length) {
    const separator = document.createElement('div');
    separator.className = 'issue-zero-separator';
    container.appendChild(separator);
  }

  zeroIssues.forEach(function(issue) {
    const meta = ISSUE_META[issue.key];
    container.appendChild(createCompactIssueRow(issue.key, meta));
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
  if (vCount) vCount.textContent = (analysisData.mergedVerts ?? 0).toLocaleString();
  if (fCount) fCount.textContent = Math.round(analysisData.faceCount ?? 0).toLocaleString();
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
