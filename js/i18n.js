// ════════════════════════════════════════════════════════
// i18n.js — 한/영 다국어 지원
// ════════════════════════════════════════════════════════

var LANG_STRINGS = {
  en: {
    // Landing — Hero
    heroEyebrow: "FOR ARTISTS, NOT JUST ENGINEERS",
    heroHeadline: "KNOW YOUR MESH.",
    heroSub: "We audit your .obj topology — non-manifold edges, skinny triangles, n-gons, flipped normals — and show you exactly where they hide. Runs entirely in your browser. Nothing leaves your machine.",
    launchBtn: "Launch Inspector",
    manualBtn: "Read the Manual",
    navHome: "HOME",
    navManual: "MANUAL",
    navInspector: "INSPECTOR",
    // Landing — [01] WHY
    whySection: "WHY TOPOLOGY MATTERS",
    whyIntro: "A mesh with hidden defects will silently break your pipeline — from sculpting to rigging to final render. TopolGuard finds them before your tools do.",
    whyDeformation: "DEFORMATION",
    whyDeformationDesc: "Bad topology warps under rigging. Hidden non-manifold edges create unpredictable deformation artifacts in character animation.",
    whyPipeline: "PIPELINE",
    whyPipelineDesc: "Non-manifold geometry breaks boolean operations, UV unwrapping, and 3D printing slicers. One bad edge cascades through every downstream tool.",
    whyRender: "RENDER",
    whyRenderDesc: "Flipped normals and degenerate faces cause shading artifacts, invisible geometry, and wasted render cycles in real-time engines.",
    // Landing — [02] WHAT WE CHECK
    checkSection: "WHAT WE CHECK",
    checkNonManifold: "NON-MANIFOLD EDGES",
    checkNonManifoldDesc: "Edges shared by 0 or 3+ faces. Break booleans, 3D print slicers, and UV unwrapping.",
    checkSkinny: "SKINNY TRIANGLES",
    checkSkinnyDesc: "Near-zero area or extreme aspect ratios. Cause shading artifacts and simulation instability.",
    checkNgon: "N-GONS",
    checkNgonDesc: "Faces with 5 or more vertices. Tessellate unpredictably across renderers and game engines.",
    checkFlipped: "FLIPPED NORMALS",
    checkFlippedDesc: "Faces pointing inward instead of outward. Render invisible or inverted in real-time engines.",
    // Landing — [03] HOW IT LOOKS
    howSection: "HOW IT LOOKS",
    howIntro: "Below are actual scan results from two AI-generated meshes (Tripo AI). One is clean. The other was decimated and arrived with topology defects.",
    scanClean: "SCAN RESULT — CLEAN",
    scanDefective: "SCAN RESULT — DEFECTIVE",
    scanModel: "Model",
    scanVerts: "Vertices",
    scanFaces: "Faces",
    scanModeling: "MODELING SCORE",
    phPending: "SCREENSHOT PENDING",
    phSub: "Inspector view will appear here",
    sampleNote: "All sample meshes are AI-generated via Tripo AI. No human-authored 3D assets are redistributed.",
    // Landing — INITIATE SCAN
    initSection: "INITIATE SCAN.",
    initBody: "Drop your .obj file into the inspector. Everything runs in your browser — zero uploads, zero tracking.",
    initLocal: "100% LOCAL",
    initNoUpload: "ZERO UPLOADS",
    initInstant: "INSTANT RESULTS",
    // Inspector — sidebar labels
    sbModelingScore: "MODELING SCORE",
    sbQualityIndex: "MESH QUALITY INDEX",
    sbUploadPrompt: "Upload a file to calculate the quality score",
    sbMeshInfo: "MESH INFO",
    sbVertices: "VERTICES",
    sbFaces: "FACES",
    sbEdges: "EDGES (est.)",
    sbEuler: "EULER χ",
    sbStatsInspector: "STATISTICS INSPECTOR",
    sbStatsEmpty: "Shown after file upload",
    sbTopologyIssues: "TOPOLOGY ISSUES",
    sbDropObj: "Upload a .obj file",
    sbBoundingBox: "BOUNDING BOX",
    sbSize: "SIZE (X / Y / Z)",
    sbShowBbox: "Show bounding box",
    sbErrorLayers: "ERROR LAYERS",
    sbLayersEmpty: "Shown after file upload",
    sbColorTheme: "COLOR THEME",
    sbReset: "↺ RESET",
    sbRandom: "⚄ RANDOM",
    sbUploadObj: "▲ UPLOAD .OBJ",
    sbSamples: "SAMPLES",
    sbHistory: "HISTORY",
    sbHistoryEmpty: "No files loaded yet",
    sbSampleGood: "GOOD",
    sbSampleBad: "BAD",
    sbAnalyzing: "Analyzing...",
    // Viewport — HUD & controls
    hudScroll: "SCROLL — ZOOM",
    hudDrag: "DRAG — ROTATE",
    hudRightDrag: "RIGHT DRAG — PAN",
    viewWire: "WIRE",
    viewSolid: "SOLID",
    viewBoth: "BOTH",
    viewDensity: "DENSITY",
    viewVertexDensity: "VERTEX DENSITY",
    viewLow: "LOW",
    viewHigh: "HIGH",
    // Issue labels
    issueNonManifold: "Non-manifold edge",
    issueBoundary: "Boundary edge",
    issueSkinny: "Skinny triangle",
    issueNgon: "N-gon",
    issueDegenerate: "Degenerate face",
    issueFlipped: "Flipped normal",
    issueIsolated: "Isolated vertex",
    issueDuplicate: "Duplicate vertex",
    // Quick Start
    qsTitle: "Quick Start — Compare AI Meshes",
    qsOr: "— OR —",
    qsUploadHint: "Upload a file",
    qsUploadHint2: " or drag it here",
    qsGoodDesc: "Tripo AI · clean low-poly",
    qsBadDesc: "Tripo AI · dense / defective",
    qsDropHere: "DROP .OBJ HERE",
    // History meta
    historyScore: "Score",
    // Footer
    footerManual: "MANUAL",
    footerInspector: "INSPECTOR"
  },
  ko: {
    // Landing — Hero
    heroEyebrow: "엔지니어가 아닌, 모델러를 위한 도구",
    heroHeadline: "내 모델, 괜찮을까?",
    heroSub: "업로드한 .obj 파일의 토폴로지를 검사해드려요. 이상한 면, 얇은 삼각형, 겹친 점 — 어디에 문제가 있는지 정확히 알려드릴게요. 모든 검사는 브라우저 안에서 이뤄지고, 파일은 어디로도 전송되지 않아요.",
    launchBtn: "검사 시작하기",
    manualBtn: "사용법 보기",
    navHome: "홈",
    navManual: "사용법",
    navInspector: "검사",
    // Landing — [01] WHY
    whySection: "왜 신경 써야 할까요?",
    whyIntro: "겉으로는 멀쩡해 보이는 모델도, 안에 숨은 문제가 있으면 나중에 꼭 탈이 나요. 애니메이션에서, 3D 프린팅에서, 게임 엔진에서 — 문제는 항상 뒤늦게 터져요.",
    whyDeformation: "변형이 이상해져요",
    whyDeformationDesc: "리깅을 걸었을 때 캐릭터가 이상하게 일그러지거나, 관절 부분이 찢어지는 일이 생겨요. 원인은 대부분 토폴로지예요.",
    whyPipeline: "파이프라인이 막혀요",
    whyPipelineDesc: "불리언 연산이 깨지거나, UV가 안 펴지거나, 3D 프린터가 에러를 뱉어요. 한 군데가 망가지면 그 뒤의 모든 단계가 멈춰요.",
    whyRender: "렌더링이 망가져요",
    whyRenderDesc: "면이 안 보이거나, 그림자가 이상하거나, 특정 각도에서만 시커매지는 현상이 생겨요. 렌더 시간은 시간대로 날리고요.",
    // Landing — [02] WHAT WE CHECK
    checkSection: "이런 걸 찾아드려요",
    checkNonManifold: "면이 이상하게 붙어있어요",
    checkNonManifoldDesc: "세 면이 한 모서리를 공유하면 불리언·UV·3D 프린팅이 다 막혀요.",
    checkSkinny: "삼각형이 너무 얇아요",
    checkSkinnyDesc: "극단적으로 긴 삼각형은 그림자를 깨뜨리고 시뮬레이션을 불안정하게 만들어요.",
    checkNgon: "면에 꼭짓점이 너무 많아요",
    checkNgonDesc: "5각형 이상의 면은 엔진마다 다르게 삼각형으로 쪼개져서, 결과가 예측 불가능해요.",
    checkFlipped: "면 방향이 반대예요",
    checkFlippedDesc: "안쪽을 향하는 면은 렌더러에서 사라지거나 검게 보여요.",
    // Landing — [03] HOW IT LOOKS
    howSection: "이렇게 보여요",
    howIntro: "아래는 두 AI 생성 모델을 실제로 검사한 결과예요. 하나는 정상이고, 다른 하나는 문제가 있어요.",
    scanClean: "검사 결과 — 정상",
    scanDefective: "검사 결과 — 문제 있음",
    scanModel: "모델",
    scanVerts: "정점",
    scanFaces: "면",
    scanModeling: "품질 점수",
    phPending: "스크린샷 준비 중",
    phSub: "검사 화면이 여기에 표시돼요",
    sampleNote: "모든 샘플 모델은 Tripo AI로 생성되었습니다. 사람이 만든 3D 에셋은 포함되어 있지 않습니다.",
    // Landing — INITIATE SCAN
    initSection: "지금 검사해보세요.",
    initBody: ".obj 파일을 올리기만 하면 돼요. 모든 건 브라우저 안에서 돌아가고, 업로드도 추적도 없어요.",
    initLocal: "완전 로컬",
    initNoUpload: "업로드 없음",
    initInstant: "즉시 결과",
    // Inspector — sidebar labels
    sbModelingScore: "품질 점수",
    sbQualityIndex: "모델 품질 지수",
    sbUploadPrompt: "파일을 업로드하면 품질 점수를 계산해요",
    sbMeshInfo: "모델 정보",
    sbVertices: "정점",
    sbFaces: "면",
    sbEdges: "모서리 (추정)",
    sbEuler: "오일러 χ",
    sbStatsInspector: "상세 통계",
    sbStatsEmpty: "파일 업로드 후 표시됩니다",
    sbTopologyIssues: "발견된 문제",
    sbDropObj: ".obj 파일을 올려주세요",
    sbBoundingBox: "경계 상자",
    sbSize: "크기 (X / Y / Z)",
    sbShowBbox: "경계 상자 표시",
    sbErrorLayers: "오류 레이어",
    sbLayersEmpty: "파일 업로드 후 표시됩니다",
    sbColorTheme: "색상 테마",
    sbReset: "↺ 초기화",
    sbRandom: "⚄ 무작위",
    sbUploadObj: "▲ .OBJ 업로드",
    sbSamples: "샘플",
    sbHistory: "기록",
    sbHistoryEmpty: "아직 로드된 파일이 없습니다",
    sbSampleGood: "정상",
    sbSampleBad: "문제",
    sbAnalyzing: "분석 중...",
    // Viewport — HUD & controls
    hudScroll: "스크롤 — 확대",
    hudDrag: "드래그 — 회전",
    hudRightDrag: "우클릭 — 이동",
    viewWire: "와이어",
    viewSolid: "솔리드",
    viewBoth: "전체",
    viewDensity: "밀도",
    viewVertexDensity: "정점 밀도",
    viewLow: "낮음",
    viewHigh: "높음",
    // Issue labels
    issueNonManifold: "면이 이상하게 붙어있어요",
    issueBoundary: "모델이 닫혀있지 않아요",
    issueSkinny: "삼각형이 너무 얇아요",
    issueNgon: "면에 꼭짓점이 너무 많아요",
    issueDegenerate: "면이 올바르지 않아요",
    issueFlipped: "면 방향이 반대예요",
    issueIsolated: "혼자 떠있는 점이 있어요",
    issueDuplicate: "점이 겹쳐있어요",
    // Quick Start
    qsTitle: "빠른 시작 — AI 모델 비교하기",
    qsOr: "— 또는 —",
    qsUploadHint: "파일 직접 업로드",
    qsUploadHint2: "하거나 여기에 드래그하세요",
    qsGoodDesc: "Tripo AI · 깔끔한 저폴리",
    qsBadDesc: "Tripo AI · 덴스하고 위상 이상",
    qsDropHere: "여기에 .OBJ 드롭",
    // History meta
    historyScore: "점수",
    // Footer
    footerManual: "사용법",
    footerInspector: "검사"
  }
};

var currentLang = 'en';

function detectLang() {
  var saved = localStorage.getItem('tg_lang');
  if (saved === 'ko' || saved === 'en') return saved;
  var browser = (navigator.language || 'en').toLowerCase();
  return browser.startsWith('ko') ? 'ko' : 'en';
}

function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    if (LANG_STRINGS[lang][key]) el.textContent = LANG_STRINGS[lang][key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-html');
    if (LANG_STRINGS[lang][key]) el.innerHTML = LANG_STRINGS[lang][key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-title');
    if (LANG_STRINGS[lang][key]) el.title = LANG_STRINGS[lang][key];
  });
  localStorage.setItem('tg_lang', lang);
  // Update lang toggle button display
  var langBtns = document.querySelectorAll('.lang-btn');
  langBtns.forEach(function (btn) {
    btn.innerHTML = lang === 'en' ? '<b>EN</b> | 한' : 'EN | <b>한</b>';
  });
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
}

function toggleLang() {
  applyLang(currentLang === 'en' ? 'ko' : 'en');
}
window.toggleLang = toggleLang;

// 페이지 로드 시 즉시 적용
(function () {
  applyLang(detectLang());
})();
