// Loads and decodes the anatomy dataset (BodyParts3D, simplified and re-aligned by the original author).
//   meta.json    mesh table, label anchor points, jaw pivot, face fit points, demo hand
//   anatomy.bin  for every mesh: positions as 16-bit values quantised inside the mesh's bounding box,
//                then 16-bit triangle indices. Little-endian, exactly as embedded in the original page.
import * as THREE from "three";
import { fetchBytes } from "../net.js";

// onProgress(fraction 0..1) follows the download of the mesh data.
export async function loadAnatomy(baseUrl, onProgress) {
  const [metaRes, bytes] = await Promise.all([
    fetch(baseUrl + "anatomy/meta.json"),
    fetchBytes(baseUrl + "anatomy/anatomy.bin", onProgress && ((got, total) => onProgress(total ? got / total : 0)))]);
  if (!metaRes.ok) throw new Error("anatomy files are missing (HTTP " + metaRes.status + ")");
  const META = await metaRes.json();
  return { META, geos: decodeMeshes(META, bytes.buffer) };
}

export function decodeMeshes(META, buffer) {
  const out = {};
  for (const m of META.meshes) {
    if (m.offI + m.ni * 2 > buffer.byteLength) throw new Error("anatomy data is cut short at mesh " + m.name);
    const q = new Uint16Array(buffer, m.offV, m.nv * 3), pos = new Float32Array(m.nv * 3);
    for (let i = 0; i < q.length; i++) pos[i] = m.min[i % 3] + q[i] / 65535 * m.size[i % 3];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array(buffer, m.offI, m.ni).slice(), 1));
    geo.computeVertexNormals();
    out[m.name] = geo;
  }
  return out;
}
