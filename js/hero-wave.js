export function initHeroWave(canvasElement) {
  const canvas = canvasElement;
  const THREE = window.THREE;

  if (!canvas || !THREE) {
    return function cleanupHeroWave() {};
  }

  if (window.matchMedia('(max-width: 768px)').matches) {
    return function cleanupHeroWave() {};
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });

  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim();

  if (!accent) {
    renderer.dispose();
    return function cleanupHeroWave() {};
  }

  const geometry = new THREE.PlaneGeometry(88, 42, 48, 24);
  const basePositions = geometry.attributes.position.array.slice();
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accent),
    wireframe: true,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });
  const wave = new THREE.Mesh(geometry, material);
  wave.rotation.x = -Math.PI / 2.15;
  wave.position.set(0, -9.2, -13.2);
  scene.add(wave);

  camera.position.set(0, 8.2, 25);
  camera.lookAt(0, -4.2, -13.2);

  let frameId = 0;
  let disposed = false;

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animateWave(time) {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const offset = i * 3;
      const x = basePositions[offset];
      const y = basePositions[offset + 1];
      const waveX = Math.sin(x * 0.3 + time * 0.0003) * 1.5;
      const waveY = Math.sin(y * 0.4 + time * 0.0002) * 1.0;
      positions.setZ(i, waveX + waveY);
    }
    positions.needsUpdate = true;
  }

  function tick(time) {
    if (disposed) return;
    if (!reduceMotionQuery.matches) {
      animateWave(time);
    }
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }

  resize();
  if (reduceMotionQuery.matches) {
    animateWave(0);
  }
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(tick);
  window.addEventListener('resize', resize);

  return function cleanupHeroWave() {
    disposed = true;
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}

let cleanup = null;

function mountHeroWave() {
  const canvas = document.getElementById('hero-wave-canvas');
  if (!canvas || cleanup) return;
  cleanup = initHeroWave(canvas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountHeroWave, { once: true });
} else {
  mountHeroWave();
}

window.addEventListener('pagehide', function() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
});
