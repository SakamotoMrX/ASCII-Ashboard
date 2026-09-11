import { Procedural3DParams } from "../contracts";
import { brightnessToChar } from "./charsets";

export function renderProcedural3D(
  params: Procedural3DParams,
  frameIndex: number,
  width: number,
  height: number,
  ramp: string
): string {
  if (width <= 0 || height <= 0 || !ramp) return "";

  switch (params.scene) {
    case "donut":
      return renderDonut(params, frameIndex, width, height, ramp);
    case "sphere":
      return renderSphere(params, frameIndex, width, height, ramp);
    case "cube":
      return renderCube(params, frameIndex, width, height, ramp);
    case "planet":
      return renderPlanet(params, frameIndex, width, height, ramp);
    case "blackhole":
      return renderBlackHole(params, frameIndex, width, height, ramp);
    default:
      return renderDonut(params, frameIndex, width, height, ramp);
  }
}

// ---------------------------------------------------------------------------
// 1. Parametric Torus (Donut)
// ---------------------------------------------------------------------------
function renderDonut(
  params: Procedural3DParams,
  frameIndex: number,
  width: number,
  height: number,
  ramp: string
): string {
  const angleX = frameIndex * 0.04 * params.rotation_speed_x;
  const angleZ = frameIndex * 0.02 * (params.rotation_speed_y !== 0 ? params.rotation_speed_y : 1.0);

  const cosA = Math.cos(angleX);
  const sinA = Math.sin(angleX);
  const cosB = Math.cos(angleZ);
  const sinB = Math.sin(angleZ);

  const output: string[][] = Array.from({ length: height }, () => Array(width).fill(" "));
  const zbuffer: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

  const scaleX = width * 0.375;
  const scaleY = height * (15 / 35);

  for (let theta = 0; theta < 2 * Math.PI; theta += 0.07) {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const circleX = 2.0 + cosTheta;
    const circleY = sinTheta;

    for (let phi = 0; phi < 2 * Math.PI; phi += 0.04) {
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      const x = circleX * cosPhi;
      const y = circleX * sinPhi;
      const z = circleY;

      const y2 = y * cosA - z * sinA;
      const z2 = y * sinA + z * cosA;
      const x2 = x * cosB - y2 * sinB;
      const y3 = x * sinB + y2 * cosB;

      const distance = z2 + params.camera_distance;
      if (distance > 0) {
        const inverseDepth = 1.0 / distance;
        const screenX = Math.floor(width / 2 + scaleX * inverseDepth * x2);
        const screenY = Math.floor(height / 2 + scaleY * inverseDepth * y3);

        if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
          const normalX = cosTheta * cosPhi;
          const normalY = cosTheta * sinPhi;
          const normalZ = sinTheta;

          const normalY2 = normalY * cosA - normalZ * sinA;
          const normalZ2 = normalY * sinA + normalZ * cosA;
          const normalY3 = normalX * sinB + normalY2 * cosB;

          const brightness = normalY3 * 0.7 - normalZ2;
          if (brightness > 0 && inverseDepth > zbuffer[screenY][screenX]) {
            zbuffer[screenY][screenX] = inverseDepth;
            output[screenY][screenX] = brightnessToChar(brightness * 255, ramp);
          }
        }
      }
    }
  }

  return output.map((row) => row.join("")).join("\n");
}

// ---------------------------------------------------------------------------
// 2. Lambertian Sphere
// ---------------------------------------------------------------------------
function renderSphere(
  params: Procedural3DParams,
  frameIndex: number,
  width: number,
  height: number,
  ramp: string
): string {
  const [lx, ly, lz] = normalizeVec(params.light_direction);
  const angle = frameIndex * 0.04 * params.rotation_speed_y;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  const output: string[][] = Array.from({ length: height }, () => Array(width).fill(" "));

  for (let py = 0; py < height; py++) {
    const y = (py - height / 2) / (height / 2) / 0.5;
    for (let px = 0; px < width; px++) {
      const x = (px - width / 2) / (width / 2);
      const distance = x * x + y * y;
      if (distance > 1.0) continue;

      const z = Math.sqrt(1.0 - distance);
      const rotatedX = x * cosAngle - z * sinAngle;
      const rotatedZ = x * sinAngle + z * cosAngle;

      const diff = rotatedX * lx + y * ly + rotatedZ * lz;
      const brightness = Math.max(0, diff) * (1 - params.ambient_light) + params.ambient_light;

      output[py][px] = brightnessToChar(Math.min(1, Math.max(0, brightness)) * 255, ramp);
    }
  }

  return output.map((row) => row.join("")).join("\n");
}

// ---------------------------------------------------------------------------
// 3. Lit Cube
// ---------------------------------------------------------------------------
const CUBE_VERTICES: [number, number, number][] = [
  [-1.0, -1.0, -1.0],
  [1.0, -1.0, -1.0],
  [1.0, 1.0, -1.0],
  [-1.0, 1.0, -1.0],
  [-1.0, -1.0, 1.0],
  [1.0, -1.0, 1.0],
  [1.0, 1.0, 1.0],
  [-1.0, 1.0, 1.0],
];

const CUBE_FACES: [number, number, number, number][] = [
  [0, 3, 2, 1],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [2, 3, 7, 6],
  [1, 2, 6, 5],
  [0, 4, 7, 3],
];

function rotatePoint(p: [number, number, number], ax: number, ay: number, az: number): [number, number, number] {
  const [cx, sx] = [Math.cos(ax), Math.sin(ax)];
  const [cy, sy] = [Math.cos(ay), Math.sin(ay)];
  const [cz, sz] = [Math.cos(az), Math.sin(az)];

  const y1 = p[1] * cx - p[2] * sx;
  const z1 = p[1] * sx + p[2] * cx;

  const x2 = p[0] * cy + z1 * sy;
  const z2 = -p[0] * sy + z1 * cy;

  const x3 = x2 * cz - y1 * sz;
  const y3 = x2 * sz + y1 * cz;

  return [x3, y3, z2];
}

function renderCube(
  params: Procedural3DParams,
  frameIndex: number,
  width: number,
  height: number,
  ramp: string
): string {
  const ax = frameIndex * 0.035 * params.rotation_speed_x;
  const ay = frameIndex * 0.045 * params.rotation_speed_y;
  const az = frameIndex * 0.015 * params.rotation_speed_z;
  const [lx, ly, lz] = normalizeVec(params.light_direction);
  const camDist = Math.max(2.0, params.camera_distance);

  const transformed = CUBE_VERTICES.map((v) => rotatePoint(v, ax, ay, az));
  const scale = Math.min(width * 0.32, height * 0.75);

  const projected = transformed.map((p) => {
    const depth = p[2] + camDist;
    if (depth <= 0.1) return null;
    return [width / 2 + (p[0] * scale) / depth, height / 2 - (p[1] * scale * 0.5) / depth, depth] as [
      number,
      number,
      number
    ];
  });

  const output: string[][] = Array.from({ length: height }, () => Array(width).fill(" "));
  const zbuffer: number[][] = Array.from({ length: height }, () => Array(width).fill(Infinity));

  for (const face of CUBE_FACES) {
    const v0 = transformed[face[0]];
    const v1 = transformed[face[1]];
    const v2 = transformed[face[2]];

    const a = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const b = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    const norm = normalizeVec([
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ]);

    const center = [
      (v0[0] + transformed[face[1]][0] + transformed[face[2]][0] + transformed[face[3]][0]) / 4,
      (v0[1] + transformed[face[1]][1] + transformed[face[2]][1] + transformed[face[3]][1]) / 4,
      (v0[2] + transformed[face[1]][2] + transformed[face[2]][2] + transformed[face[3]][2]) / 4,
    ];
    const view = [-center[0], -center[1], -camDist - center[2]];

    if (norm[0] * view[0] + norm[1] * view[1] + norm[2] * view[2] <= 0) continue;

    const dot = norm[0] * lx + norm[1] * ly + norm[2] * lz;
    const brightness = Math.max(0.12, Math.min(1.0, dot));
    const ch = brightnessToChar(brightness * 255, ramp);

    const p0 = projected[face[0]];
    const p1 = projected[face[1]];
    const p2 = projected[face[2]];
    const p3 = projected[face[3]];

    if (!p0 || !p1 || !p2 || !p3) continue;

    const triangles: [[number, number, number], [number, number, number], [number, number, number]][] = [
      [p0, p1, p2],
      [p0, p2, p3],
    ];

    for (const [t0, t1, t2] of triangles) {
      const minX = Math.max(0, Math.min(width - 1, Math.floor(Math.min(t0[0], t1[0], t2[0]))));
      const maxX = Math.max(0, Math.min(width - 1, Math.ceil(Math.max(t0[0], t1[0], t2[0]))));
      const minY = Math.max(0, Math.min(height - 1, Math.floor(Math.min(t0[1], t1[1], t2[1]))));
      const maxY = Math.max(0, Math.min(height - 1, Math.ceil(Math.max(t0[1], t1[1], t2[1]))));

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const w = calcBarycentric(px + 0.5, py + 0.5, t0, t1, t2);
          if (w) {
            const depth = w[0] * t0[2] + w[1] * t1[2] + w[2] * t2[2];
            if (depth < zbuffer[py][px]) {
              zbuffer[py][px] = depth;
              output[py][px] = ch;
            }
          }
        }
      }
    }
  }

  return output.map((row) => row.join("")).join("\n");
}

function calcBarycentric(
  px: number,
  py: number,
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number]
): [number, number, number] | null {
  const denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(denom) < 1e-6) return null;
  const w1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / denom;
  const w2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / denom;
  const w3 = 1.0 - w1 - w2;

  if (w1 < -1e-4 || w2 < -1e-4 || w3 < -1e-4) return null;
  return [w1, w2, w3];
}

// ---------------------------------------------------------------------------
// 4. Planet
// ---------------------------------------------------------------------------
function renderPlanet(
  params: Procedural3DParams,
  frameIndex: number,
  width: number,
  height: number,
  ramp: string
): string {
  const [lx, ly, lz] = normalizeVec(params.light_direction);
  const angle = frameIndex * 0.035 * params.rotation_speed_y;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  const output: string[][] = Array.from({ length: height }, () => Array(width).fill(" "));

  for (let py = 0; py < height; py++) {
    const screenY = ((py - height / 2) / (height / 2)) * 2.0;
    for (let px = 0; px < width; px++) {
      const screenX = (px - width / 2) / (width / 2);
      const radiusSquared = screenX * screenX + screenY * screenY;
      if (radiusSquared > 1.0) continue;

      const screenZ = Math.sqrt(1.0 - radiusSquared);
      const x = screenX * cosAngle + screenZ * sinAngle;
      const z = -screenX * sinAngle + screenZ * cosAngle;
      const y = screenY;

      let brightness = x * lx + y * ly + z * lz;
      const pattern = Math.sin(x * 7.0) + Math.sin(y * 9.0) + Math.sin(z * 8.0) + Math.sin((x + y + z) * 14.0) * 0.5;
      if (pattern > 0.8) brightness += 0.15;
      if (brightness < 0) brightness *= 0.15;

      const edge = 1.0 - screenZ;
      if (edge > 0.82) brightness += (edge - 0.82) * 1.5;

      output[py][px] = brightnessToChar(Math.min(1, Math.max(0, brightness)) * 255, ramp);
    }
  }

  return output.map((row) => row.join("")).join("\n");
}

// ---------------------------------------------------------------------------
// 5. Black Hole
// ---------------------------------------------------------------------------
function renderBlackHole(
  params: Procedural3DParams,
  frameIndex: number,
  width: number,
  height: number,
  ramp: string
): string {
  const angle = frameIndex * 0.045 * params.rotation_speed_y;
  const brightnessBuffer: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

  for (let i = 0; i < 100; i++) {
    const sx = ((i * 1013) % 1000) / 500 - 1.0;
    const sy = ((i * 3011) % 1000) / 500 - 1.0;
    const starBright = (((i * 7919) % 1000) / 1000) * 0.4;
    const px = Math.floor(width / 2 + (sx * width) / 2);
    const py = Math.floor(height / 2 + (sy * height) / 2);
    if (px >= 0 && px < width && py >= 0 && py < height) {
      brightnessBuffer[py][px] = starBright;
    }
  }

  const output: string[][] = Array.from({ length: height }, () => Array(width).fill(" "));
  const BLACK_HOLE_RADIUS = 0.42;
  const DISK_INNER = 0.52;
  const DISK_OUTER = 1.55;

  for (let py = 0; py < height; py++) {
    const y = ((py - height / 2) / (height / 2)) * 2.0;
    for (let px = 0; px < width; px++) {
      const x = (px - width / 2) / (width / 2);
      const radius = Math.sqrt(x * x + y * y);
      let intensity = brightnessBuffer[py][px];

      if (radius > DISK_INNER && radius < DISK_OUTER) {
        const theta = Math.atan2(y, x);
        const spiral = (Math.sin((theta + angle) * 8.0 + radius * 12.0) + 1.0) / 2.0;
        const distanceFactor = Math.max(0.0, 1.0 - Math.abs(radius - 0.95) / 0.63);
        let disk = spiral * distanceFactor;
        disk += Math.exp(-(radius - DISK_INNER) * 10.0) * 1.5;
        const doppler = 0.5 + 0.5 * Math.cos(theta);
        disk *= 0.55 + doppler * 0.8;
        intensity = Math.max(intensity, disk);
      }

      if (radius < BLACK_HOLE_RADIUS) {
        intensity = 0.0;
      } else if (radius < DISK_OUTER) {
        intensity += (BLACK_HOLE_RADIUS / radius) * 0.15;
      }

      const ringDist = Math.abs(radius - BLACK_HOLE_RADIUS);
      intensity += Math.exp(-ringDist * 80.0) * 1.5;

      output[py][px] = brightnessToChar(Math.min(1, Math.max(0, intensity)) * 255, ramp);
    }
  }

  return output.map((row) => row.join("")).join("\n");
}

function normalizeVec(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-6) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}
