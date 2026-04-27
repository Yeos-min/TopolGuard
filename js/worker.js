importScripts('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
importScripts('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js');
importScripts('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/BufferGeometryUtils.js');

let rawObjText = '';
let hasUvInObj = false;

function parseObjText(text) {
  rawObjText = text;
  const verts = [];
  const ngonFaces = [];
  let ngonCount = 0, quadCount = 0, triCount = 0;
  hasUvInObj = false;

  const dupVertIndices = new Set();
  const coordToFirstIdx = new Map();
  const referencedVerts = new Set();

  let i = 0;
  const len = text.length;
  while (i < len) {
    let lineEnd = text.indexOf('\n', i);
    if (lineEnd === -1) lineEnd = len;

    const c0 = text[i], c1 = text[i + 1];

    if (c0 === 'v' && c1 === ' ') {
      const sub = text.slice(i + 2, lineEnd).trim();
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
      const sub = text.slice(i + 2, lineEnd).trim();
      const tokens = sub.split(/\s+/).filter(Boolean);
      const vi = tokens.map(function(tk) {
        const idx = parseInt(tk.split('/')[0], 10);
        return idx > 0 ? idx - 1 : verts.length + idx;
      });
      if (vi.length === 3) triCount++;
      else if (vi.length === 4) quadCount++;
      else if (vi.length >= 5) {
        ngonCount++;
        ngonFaces.push(vi.map(function(ii) { return verts[ii] || [0, 0, 0]; }));
      }
      vi.forEach(function(ii) { referencedVerts.add(ii); });
    }

    i = lineEnd + 1;
  }

  const trueIsolatedPoints = [];
  for (let j = 0; j < verts.length; j++) {
    if (!referencedVerts.has(j)) trueIsolatedPoints.push.apply(trueIsolatedPoints, verts[j]);
  }

  const dupVertPoints = [];
  dupVertIndices.forEach(function(j) {
    if (verts[j]) dupVertPoints.push.apply(dupVertPoints, verts[j]);
  });

  return {
    ngonCount: ngonCount,
    quadCount: quadCount,
    triCount: triCount,
    ngonFaces: ngonFaces,
    verts: verts,
    dupVertPoints: dupVertPoints,
    dupVertCount: dupVertIndices.size,
    trueIsolatedPoints: trueIsolatedPoints,
    trueIsolatedCount: trueIsolatedPoints.length / 3
  };
}

function buildNgonOverlayData(ngonFaces) {
  const fillPos = [];
  for (let f = 0; f < ngonFaces.length; f++) {
    const face = ngonFaces[f];
    const v0 = face[0];
    for (let i = 1; i < face.length - 1; i++) {
      fillPos.push.apply(fillPos, v0);
      fillPos.push.apply(fillPos, face[i]);
      fillPos.push.apply(fillPos, face[i + 1]);
    }
  }

  const linePos = [];
  for (let f = 0; f < ngonFaces.length; f++) {
    const face = ngonFaces[f];
    for (let i = 0; i < face.length; i++) {
      linePos.push.apply(linePos, face[i]);
      linePos.push.apply(linePos, face[(i + 1) % face.length]);
    }
  }

  return {
    fillPositions: new Float32Array(fillPos),
    linePositions: new Float32Array(linePos)
  };
}

function calculateDensityCV(geometries) {
  if (!Array.isArray(geometries)) geometries = [geometries];
  geometries = geometries.filter(function(g) { return g && g.attributes && g.attributes.position; });
  if (geometries.length === 0) return null;

  const SAMPLE_MAX = 50000;
  const spacingSample = [];

  for (let gi = 0; gi < geometries.length; gi++) {
    const geo = geometries[gi];
    const pos = geo.attributes.position;
    const vtxCount = pos.count;
    const faceCount = vtxCount / 3;
    if (faceCount < 1) continue;

    const step = Math.max(1, Math.floor(faceCount / (SAMPLE_MAX / geometries.length)));
    for (let f = 0; f < faceCount; f += step) {
      const i0 = f * 3, i1 = f * 3 + 1, i2 = f * 3 + 2;
      const ax = pos.getX(i0), ay = pos.getY(i0), az = pos.getZ(i0);
      const bx = pos.getX(i1), by = pos.getY(i1), bz = pos.getZ(i1);
      const cx = pos.getX(i2), cy = pos.getY(i2), cz = pos.getZ(i2);
      const dab = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
      const dbc = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2 + (cz - bz) ** 2);
      const dca = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2 + (az - cz) ** 2);
      const avg = (dab + dbc + dca) / 3;
      if (avg > 0) spacingSample.push(avg);
    }
  }

  const sampleF32 = new Float32Array(spacingSample);
  sampleF32.sort();
  let sumS = 0, cntS = sampleF32.length;
  for (let i = 0; i < cntS; i++) sumS += sampleF32[i];
  const meanS = cntS > 0 ? sumS / cntS : 1;
  let varS = 0;
  for (let i = 0; i < cntS; i++) {
    const d = sampleF32[i] - meanS;
    varS += d * d;
  }
  return meanS > 0 ? Math.sqrt(varS / cntS) / meanS : null;
}

function detectSkinnyTriangles(rawText, objVerts) {
  const skinnyFaces = [];
  const THRESHOLD = 10;

  if (!rawText || objVerts.length === 0) {
    return { count: 0, positions: new Float32Array(0) };
  }

  let i = 0;
  const len = rawText.length;
  const V = objVerts;

  while (i < len) {
    let lineEnd = rawText.indexOf('\n', i);
    if (lineEnd === -1) lineEnd = len;

    if (rawText[i] === 'f' && rawText[i + 1] === ' ') {
      const sub = rawText.slice(i + 2, lineEnd).trim();
      const tokens = sub.split(/\s+/).filter(Boolean);

      if (tokens.length === 3) {
        const vi = tokens.map(function(tk) {
          const idx = parseInt(tk.split('/')[0], 10);
          return idx > 0 ? idx - 1 : V.length + idx;
        });

        const va = V[vi[0]], vb = V[vi[1]], vc = V[vi[2]];
        if (!va || !vb || !vc) { i = lineEnd + 1; continue; }

        const ax = va[0], ay = va[1], az = va[2];
        const bx = vb[0], by = vb[1], bz = vb[2];
        const cx = vc[0], cy = vc[1], cz = vc[2];

        const lab = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
        const lbc = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2 + (cz - bz) ** 2);
        const lca = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2 + (az - cz) ** 2);
        const longest = Math.max(lab, lbc, lca);
        if (longest < 1e-12) { i = lineEnd + 1; continue; }

        const abx = bx - ax, aby = by - ay, abz = bz - az;
        const acx = cx - ax, acy = cy - ay, acz = cz - az;
        const crossLen = Math.sqrt(
          (aby * acz - abz * acy) ** 2 +
          (abz * acx - abx * acz) ** 2 +
          (abx * acy - aby * acx) ** 2
        );
        const height = crossLen / longest;
        if (height < 1e-12) { i = lineEnd + 1; continue; }

        const aspectRatio = longest / height;
        if (aspectRatio >= THRESHOLD) {
          skinnyFaces.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        }
      }
    }

    i = lineEnd + 1;
  }

  return {
    count: skinnyFaces.length / 9,
    positions: new Float32Array(skinnyFaces)
  };
}

function calculateEuler(mergedVerts, totalEdges, faceCount) {
  return mergedVerts - totalEdges + Math.round(faceCount);
}

function parseTrueBoundingBox(text) {
  const allVerts = [];
  let idx = 0, len = text.length;
  while (idx < len) {
    let lineEnd = text.indexOf('\n', idx);
    if (lineEnd === -1) lineEnd = len;
    if (text[idx] === 'v' && text[idx + 1] === ' ') {
      const sub = text.slice(idx + 2, lineEnd).trim().split(/\s+/);
      const x = parseFloat(sub[0]), y = parseFloat(sub[1]), z = parseFloat(sub[2]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) allVerts.push(x, y, z);
    }
    idx = lineEnd + 1;
  }

  if (allVerts.length === 0) return null;

  const trueBB = new THREE.Box3();
  for (let i = 0; i < allVerts.length; i += 3) {
    trueBB.expandByPoint(new THREE.Vector3(allVerts[i], allVerts[i + 1], allVerts[i + 2]));
  }
  return trueBB;
}

function collectAnalysisGeometries(text) {
  const hasLineElements = /^l\s/m.test(text);
  const cleanedObjText = hasLineElements
    ? text.split('\n').filter(function(line) { return !line.trim().startsWith('l '); }).join('\n')
    : text;

  const loader = new THREE.OBJLoader();
  const obj = loader.parse(cleanedObjText);
  let firstGeometry = null;
  const allGeometries = [];

  obj.traverse(function(child) {
    if (!child.isMesh) return;
    child.geometry.computeVertexNormals();
    if (!firstGeometry) firstGeometry = child.geometry;
    allGeometries.push(child.geometry);
  });

  return {
    firstGeometry: firstGeometry,
    allGeometries: allGeometries
  };
}

function detectFlippedFaces(rawText, rawArr, indices, mpos) {
  const flippedVerts = [];
  const objVNormals = [];
  const faceVN = [];
  let hasVN = false;

  if (rawText) {
    let li = 0, ll = rawText.length;
    while (li < ll) {
      let lineEnd = rawText.indexOf('\n', li);
      if (lineEnd === -1) lineEnd = ll;
      const c0 = rawText[li], c1 = rawText[li + 1], c2 = rawText[li + 2];

      if (c0 === 'v' && c1 === 'n' && c2 === ' ') {
        const sub = rawText.slice(li + 3, lineEnd).trim().split(/\s+/);
        objVNormals.push([parseFloat(sub[0]), parseFloat(sub[1]), parseFloat(sub[2])]);
        hasVN = true;
      } else if (c0 === 'f' && c1 === ' ') {
        const tokens = rawText.slice(li + 2, lineEnd).trim().split(/\s+/).filter(Boolean);
        const vis = [], vns = [];
        for (let t = 0; t < tokens.length; t++) {
          const parts = tokens[t].split('/');
          vis.push(parseInt(parts[0], 10) - 1);
          vns.push(parts.length > 2 && parts[2] ? parseInt(parts[2], 10) - 1 : null);
        }
        for (let i = 1; i < vis.length - 1; i++) {
          faceVN.push([vns[0], vns[i], vns[i + 1]]);
        }
      }
      li = lineEnd + 1;
    }
  }

  if (hasVN && faceVN.length > 0 && indices) {
    const AB = new THREE.Vector3(), AC = new THREE.Vector3();
    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
    const geomN = new THREE.Vector3();
    const rawFaceCount = rawArr.length / 9;

    for (let f = 0; f < rawFaceCount; f++) {
      if (f >= faceVN.length) break;
      const b = f * 9;
      pA.set(rawArr[b], rawArr[b + 1], rawArr[b + 2]);
      pB.set(rawArr[b + 3], rawArr[b + 4], rawArr[b + 5]);
      pC.set(rawArr[b + 6], rawArr[b + 7], rawArr[b + 8]);
      AB.subVectors(pB, pA); AC.subVectors(pC, pA);
      geomN.crossVectors(AB, AC).normalize();

      const na = faceVN[f][0], nb = faceVN[f][1], nc = faceVN[f][2];
      if (na === null || nb === null || nc === null) continue;
      if (na >= objVNormals.length || nb >= objVNormals.length || nc >= objVNormals.length) continue;

      const vnA = objVNormals[na], vnB = objVNormals[nb], vnC = objVNormals[nc];
      const avgX = (vnA[0] + vnB[0] + vnC[0]) / 3;
      const avgY = (vnA[1] + vnB[1] + vnC[1]) / 3;
      const avgZ = (vnA[2] + vnB[2] + vnC[2]) / 3;
      const d = geomN.x * avgX + geomN.y * avgY + geomN.z * avgZ;

      if (d < -0.5) {
        flippedVerts.push(
          rawArr[b], rawArr[b + 1], rawArr[b + 2],
          rawArr[b + 3], rawArr[b + 4], rawArr[b + 5],
          rawArr[b + 6], rawArr[b + 7], rawArr[b + 8]
        );
      }
    }
  } else if (indices) {
    const faceCount2 = indices.length / 3;
    const faceNormals = [];
    const n = new THREE.Vector3(), ab2 = new THREE.Vector3(), ac2 = new THREE.Vector3();
    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
    for (let f = 0; f < faceCount2; f++) {
      const ia = indices[f * 3], ib = indices[f * 3 + 1], ic = indices[f * 3 + 2];
      pA.set(mpos[ia * 3], mpos[ia * 3 + 1], mpos[ia * 3 + 2]);
      pB.set(mpos[ib * 3], mpos[ib * 3 + 1], mpos[ib * 3 + 2]);
      pC.set(mpos[ic * 3], mpos[ic * 3 + 1], mpos[ic * 3 + 2]);
      ab2.subVectors(pB, pA); ac2.subVectors(pC, pA);
      n.crossVectors(ab2, ac2).normalize();
      faceNormals.push(n.x, n.y, n.z);
    }

    const ekey2 = function(a, b) { return a < b ? a + '_' + b : b + '_' + a; };
    const edgeToFaces2 = new Map();
    for (let f = 0; f < faceCount2; f++) {
      const pairs = [[indices[f * 3], indices[f * 3 + 1]], [indices[f * 3 + 1], indices[f * 3 + 2]], [indices[f * 3 + 2], indices[f * 3]]];
      for (let p = 0; p < pairs.length; p++) {
        const a = pairs[p][0], b = pairs[p][1];
        const k = ekey2(a, b);
        if (!edgeToFaces2.has(k)) edgeToFaces2.set(k, []);
        edgeToFaces2.get(k).push(f);
      }
    }

    const faceAdj = Array.from({ length: faceCount2 }, function() { return new Set(); });
    edgeToFaces2.forEach(function(faces) {
      if (faces.length === 2) {
        faceAdj[faces[0]].add(faces[1]);
        faceAdj[faces[1]].add(faces[0]);
      }
    });

    for (let f = 0; f < faceCount2; f++) {
      const nx = faceNormals[f * 3], ny = faceNormals[f * 3 + 1], nz = faceNormals[f * 3 + 2];
      const adj = faceAdj[f];
      if (adj.size === 0) continue;
      let flippedCount = 0;
      adj.forEach(function(af) {
        const d = nx * faceNormals[af * 3] + ny * faceNormals[af * 3 + 1] + nz * faceNormals[af * 3 + 2];
        if (d < -0.5) flippedCount++;
      });
      if (flippedCount > adj.size * 0.5) {
        const ia = indices[f * 3], ib = indices[f * 3 + 1], ic = indices[f * 3 + 2];
        flippedVerts.push(
          mpos[ia * 3], mpos[ia * 3 + 1], mpos[ia * 3 + 2],
          mpos[ib * 3], mpos[ib * 3 + 1], mpos[ib * 3 + 2],
          mpos[ic * 3], mpos[ic * 3 + 1], mpos[ic * 3 + 2]
        );
      }
    }
  }

  return {
    count: flippedVerts.length / 9,
    positions: new Float32Array(flippedVerts)
  };
}

function createEmptyResult() {
  return {
    bboxMin: [0, 0, 0],
    bboxMax: [0, 0, 0],
    bboxSize: [0, 0, 0],
    lastBoundingBoxSize: 1,
    mergedVerts: 0,
    faceCount: 0,
    edgeCount: 0,
    euler: null,
    densityCV: null,
    stats: {
      degenCount: 0,
      ngonCount: 0,
      dupVertCount: 0,
      flippedCount: 0,
      nonManifoldCount: 0,
      boundaryCount: 0,
      isolatedCount: 0,
      skinnyCount: 0,
      densityCV: null
    },
    overlays: {
      degenerate: { positions: new Float32Array(0) },
      ngon: { fillPositions: new Float32Array(0), linePositions: new Float32Array(0) },
      duplicate: { positions: new Float32Array(0) },
      flipped: { positions: new Float32Array(0) },
      'non-manifold': { positions: new Float32Array(0) },
      boundary: { positions: new Float32Array(0) },
      isolated: { positions: new Float32Array(0) },
      skinny: { positions: new Float32Array(0) }
    }
  };
}

function runAnalysis(text) {
  rawObjText = text || '';
  const collected = collectAnalysisGeometries(rawObjText);
  const originalGeometry = collected.firstGeometry;
  const allGeometries = collected.allGeometries || [];
  if (!originalGeometry) return createEmptyResult();

  originalGeometry.computeBoundingBox();
  const meshBB = originalGeometry.boundingBox;
  const meshBBSize = new THREE.Vector3();
  meshBB.getSize(meshBBSize);

  const trueBB = parseTrueBoundingBox(rawObjText);
  const bb = trueBB || meshBB;
  const bbSize = new THREE.Vector3();
  bb.getSize(bbSize);
  const lastBoundingBoxSize = Math.max(bbSize.length(), 1);

  const rawArr = originalGeometry.attributes.position.array;
  const faceCount = originalGeometry.attributes.position.count / 3;

  const posOnlyGeo = new THREE.BufferGeometry();
  posOnlyGeo.setAttribute('position', originalGeometry.attributes.position.clone());
  let indexedGeo;
  try {
    indexedGeo = THREE.BufferGeometryUtils.mergeVertices(posOnlyGeo, 1e-4);
  } catch (e) {
    indexedGeo = posOnlyGeo;
  }

  const mergedVerts = indexedGeo.attributes.position.count;
  const mpos = indexedGeo.attributes.position.array;
  const indices = indexedGeo.index ? indexedGeo.index.array : null;

  let edgeCount = 0;
  let euler = null;
  const edgeMap = new Map();
  if (indices) {
    const ekey = function(a, b) { return a < b ? a + '_' + b : b + '_' + a; };
    for (let i = 0; i < indices.length; i += 3) {
      const pairs = [[indices[i], indices[i + 1]], [indices[i + 1], indices[i + 2]], [indices[i + 2], indices[i]]];
      for (let p = 0; p < pairs.length; p++) {
        const a = pairs[p][0], b = pairs[p][1];
        const k = ekey(a, b);
        edgeMap.set(k, { cnt: (edgeMap.get(k) || { cnt: 0 }).cnt + 1, a: a, b: b });
      }
    }
    edgeCount = edgeMap.size;
    euler = calculateEuler(mergedVerts, edgeCount, faceCount);
  }

  const degenVerts = [];
  for (let f = 0; f < faceCount; f++) {
    const b = f * 9;
    const ax = rawArr[b], ay = rawArr[b + 1], az = rawArr[b + 2];
    const bx = rawArr[b + 3], by = rawArr[b + 4], bz = rawArr[b + 5];
    const cx = rawArr[b + 6], cy = rawArr[b + 7], cz = rawArr[b + 8];
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const cl = Math.sqrt(
      Math.pow(aby * acz - abz * acy, 2) +
      Math.pow(abz * acx - abx * acz, 2) +
      Math.pow(abx * acy - aby * acx, 2)
    );
    if (cl < 1e-10) degenVerts.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  }

  const parsed = parseObjText(rawObjText);
  const skinny = detectSkinnyTriangles(rawObjText, parsed.verts);

  const nmVerts = [];
  const bdVerts = [];
  if (indices) {
    edgeMap.forEach(function(e) {
      const ax = mpos[e.a * 3], ay = mpos[e.a * 3 + 1], az = mpos[e.a * 3 + 2];
      const bx = mpos[e.b * 3], by = mpos[e.b * 3 + 1], bz = mpos[e.b * 3 + 2];
      if (e.cnt > 2) nmVerts.push(ax, ay, az, bx, by, bz);
      else if (e.cnt === 1) bdVerts.push(ax, ay, az, bx, by, bz);
    });
  }

  const flipped = detectFlippedFaces(rawObjText, rawArr, indices, mpos);
  const ngonOverlay = buildNgonOverlayData(parsed.ngonFaces);
  const densityCV = calculateDensityCV(allGeometries);

  const stats = {
    degenCount: degenVerts.length / 9,
    ngonCount: parsed.ngonCount,
    dupVertCount: parsed.dupVertCount,
    flippedCount: flipped.count,
    nonManifoldCount: nmVerts.length / 6,
    boundaryCount: bdVerts.length / 6,
    isolatedCount: parsed.trueIsolatedCount,
    skinnyCount: skinny.count,
    densityCV: densityCV
  };

  if (indexedGeo !== posOnlyGeo) indexedGeo.dispose();
  posOnlyGeo.dispose();

  return {
    bboxMin: [bb.min.x, bb.min.y, bb.min.z],
    bboxMax: [bb.max.x, bb.max.y, bb.max.z],
    bboxSize: [bbSize.x, bbSize.y, bbSize.z],
    lastBoundingBoxSize: lastBoundingBoxSize,
    mergedVerts: mergedVerts,
    faceCount: faceCount,
    edgeCount: edgeCount,
    euler: euler,
    densityCV: densityCV,
    stats: stats,
    overlays: {
      degenerate: { positions: new Float32Array(degenVerts) },
      ngon: ngonOverlay,
      duplicate: { positions: new Float32Array(parsed.dupVertPoints) },
      flipped: { positions: flipped.positions },
      'non-manifold': { positions: new Float32Array(nmVerts) },
      boundary: { positions: new Float32Array(bdVerts) },
      isolated: { positions: new Float32Array(parsed.trueIsolatedPoints) },
      skinny: { positions: skinny.positions }
    }
  };
}

self.onmessage = function(event) {
  try {
    const text = event.data && typeof event.data.text === 'string' ? event.data.text : '';
    const analysisData = runAnalysis(text);
    self.postMessage({ type: 'RESULT', data: analysisData });
  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      error: err && err.message ? err.message : String(err)
    });
  }
};
