import { ProceduralScene } from "../../types";

export interface SceneFrameData {
  luminanceBuffer: Float32Array; // values 0.0 to 1.0
  colorBuffer: Uint8ClampedArray; // RGBA 4 bytes per cell
  columns: number;
  rows: number;
}

export class ProceduralSceneGenerator {
  private width: number;
  private height: number;
  private time: number = 0;

  constructor(width: number = 120, height: number = 60) {
    this.width = width;
    this.height = height;
  }

  public setDimensions(width: number, height: number) {
    this.width = Math.max(20, width);
    this.height = Math.max(10, height);
  }

  public render(
    scene: ProceduralScene,
    deltaTime: number,
    speedX: number = 1.0,
    speedY: number = 1.0,
    speedZ: number = 0.5
  ): SceneFrameData {
    this.time += deltaTime;
    const count = this.width * this.height;
    const luminanceBuffer = new Float32Array(count);
    const colorBuffer = new Uint8ClampedArray(count * 4);

    const aspect = (this.width / this.height) * 0.55; // Monospace aspect correction

    const rotX = this.time * speedX;
    const rotY = this.time * speedY;
    const rotZ = this.time * speedZ;

    switch (scene) {
      case "donut":
        this.renderDonut(luminanceBuffer, colorBuffer, rotX, rotY, aspect);
        break;
      case "sphere":
        this.renderSphere(luminanceBuffer, colorBuffer, rotX, rotY, aspect);
        break;
      case "cube":
        this.renderCube(luminanceBuffer, colorBuffer, rotX, rotY, rotZ, aspect);
        break;
      case "planet":
        this.renderPlanet(luminanceBuffer, colorBuffer, rotX, rotY, aspect);
        break;
      case "blackhole":
        this.renderBlackHole(luminanceBuffer, colorBuffer, this.time, aspect);
        break;
      default:
        this.renderDonut(luminanceBuffer, colorBuffer, rotX, rotY, aspect);
    }

    return {
      luminanceBuffer,
      colorBuffer,
      columns: this.width,
      rows: this.height
    };
  }

  private renderDonut(
    lum: Float32Array,
    col: Uint8ClampedArray,
    A: number,
    B: number,
    _aspect: number
  ) {
    const cosA = Math.cos(A), sinA = Math.sin(A);
    const cosB = Math.cos(B), sinB = Math.sin(B);
    const zBuffer = new Float32Array(this.width * this.height);

    const R1 = 1.0; // Torus cross-section radius
    const R2 = 2.0; // Distance from center
    const K2 = 5.0; // Distance from camera
    const K1 = this.width * K2 * 3 / (8 * (R1 + R2));

    // theta sweeps around the tube (0 to 2pi)
    for (let theta = 0; theta < 6.28; theta += 0.05) {
      const costheta = Math.cos(theta), sintheta = Math.sin(theta);
      // phi sweeps around center of revolution (0 to 2pi)
      for (let phi = 0; phi < 6.28; phi += 0.02) {
        const cosphi = Math.cos(phi), sinphi = Math.sin(phi);

        const circlex = R2 + R1 * costheta;
        const circley = R1 * sintheta;

        const x = circlex * (cosB * cosphi + sinA * sinB * sinphi) - circley * cosA * sinB;
        const y = circlex * (sinB * cosphi - sinA * cosB * sinphi) + circley * cosA * cosB;
        const z = K2 + cosA * circlex * sinphi + circley * sinA;
        const ooz = 1 / z;

        const xp = Math.floor(this.width / 2 + K1 * ooz * x * 1.5);
        const yp = Math.floor(this.height / 2 - K1 * ooz * y);

        // Lighting calculation (L = Normal . Light vector)
        const L = cosphi * costheta * sinB - cosA * costheta * sinphi - sinA * sintheta + cosB * (cosA * sintheta - costheta * sinA * sinphi);

        if (xp >= 0 && xp < this.width && yp >= 0 && yp < this.height) {
          const idx = yp * this.width + xp;
          if (ooz > zBuffer[idx]) {
            zBuffer[idx] = ooz;
            const luminance = Math.max(0, (L + 1.414) / 2.828);
            lum[idx] = luminance;

            const cIdx = idx * 4;
            col[cIdx] = Math.floor(luminance * 0); // R
            col[cIdx + 1] = Math.floor(luminance * 255); // G phosphor
            col[cIdx + 2] = Math.floor(luminance * 136); // B
            col[cIdx + 3] = 255;
          }
        }
      }
    }
  }

  private renderSphere(
    lum: Float32Array,
    col: Uint8ClampedArray,
    rotX: number,
    rotY: number,
    aspect: number
  ) {
    const light = [Math.sin(rotY), Math.cos(rotX) * 0.5 + 0.5, -1.0];
    const len = Math.sqrt(light[0] * light[0] + light[1] * light[1] + light[2] * light[2]);
    const lx = light[0] / len;
    const ly = light[1] / len;
    const lz = light[2] / len;

    const radius = 0.85;

    for (let y = 0; y < this.height; y++) {
      const ny = (y / this.height) * 2 - 1;
      for (let x = 0; x < this.width; x++) {
        const nx = ((x / this.width) * 2 - 1) * aspect;
        const d2 = nx * nx + ny * ny;
        const idx = y * this.width + x;

        if (d2 <= radius * radius) {
          const nz = -Math.sqrt(radius * radius - d2);
          // Lambertian diffuse cosine
          const dot = -(nx * lx + ny * ly + nz * lz);
          const intensity = Math.max(0.05, Math.min(1.0, dot));
          lum[idx] = intensity;

          const cIdx = idx * 4;
          col[cIdx] = Math.floor(intensity * 40);
          col[cIdx + 1] = Math.floor(intensity * 255);
          col[cIdx + 2] = Math.floor(intensity * 170);
          col[cIdx + 3] = 255;
        } else {
          lum[idx] = 0;
        }
      }
    }
  }

  private renderCube(
    lum: Float32Array,
    col: Uint8ClampedArray,
    rotX: number,
    rotY: number,
    rotZ: number,
    aspect: number
  ) {
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

    for (let y = 0; y < this.height; y++) {
      const vy = (y / this.height) * 2 - 1;
      for (let x = 0; x < this.width; x++) {
        const vx = ((x / this.width) * 2 - 1) * aspect;
        const idx = y * this.width + x;

        // Raymarching cube signed distance function
        let rayZ = -2.5;
        let hit = false;
        let normal = [0, 0, 1];

        for (let step = 0; step < 24; step++) {
          const px = vx;
          const py = vy;
          const pz = rayZ;

          // Rotate point inversely
          let rx = px * cy + pz * sy;
          let rz = -px * sy + pz * cy;
          let ry = py * cx - rz * sx;
          rz = py * sx + rz * cx;
          const finalX = rx * cz - ry * sz;
          const finalY = rx * sz + ry * cz;
          const finalZ = rz;

          // Box SDF: max(abs(p) - size)
          const b = 0.55;
          const dx = Math.abs(finalX) - b;
          const dy = Math.abs(finalY) - b;
          const dz = Math.abs(finalZ) - b;
          const dist = Math.max(dx, Math.max(dy, dz));

          if (dist < 0.02) {
            hit = true;
            if (dx > dy && dx > dz) normal = [finalX > 0 ? 1 : -1, 0, 0];
            else if (dy > dz) normal = [0, finalY > 0 ? 1 : -1, 0];
            else normal = [0, 0, finalZ > 0 ? 1 : -1];
            break;
          }
          rayZ += Math.max(dist * 0.7, 0.04);
          if (rayZ > 1.5) break;
        }

        if (hit) {
          const diffuse = Math.max(0.1, 0.4 * normal[0] + 0.7 * normal[1] - 0.5 * normal[2]);
          const intensity = Math.min(1.0, diffuse);
          lum[idx] = intensity;

          const cIdx = idx * 4;
          col[cIdx] = Math.floor(intensity * 100);
          col[cIdx + 1] = Math.floor(intensity * 255);
          col[cIdx + 2] = Math.floor(intensity * 220);
          col[cIdx + 3] = 255;
        } else {
          lum[idx] = 0;
        }
      }
    }
  }

  private renderPlanet(
    lum: Float32Array,
    col: Uint8ClampedArray,
    rotX: number,
    rotY: number,
    aspect: number
  ) {
    const radius = 0.55;
    const ringInner = 0.75;
    const ringOuter = 1.25;

    for (let y = 0; y < this.height; y++) {
      const ny = (y / this.height) * 2 - 1;
      for (let x = 0; x < this.width; x++) {
        const nx = ((x / this.width) * 2 - 1) * aspect;
        const d2 = nx * nx + ny * ny;
        const idx = y * this.width + x;

        // Tilted ring projection
        const ringY = ny * Math.cos(0.45) - nx * Math.sin(0.45) * 0.2;
        const ringX = nx * Math.cos(0.45) + ny * Math.sin(0.45);
        const ringD = Math.sqrt(ringX * ringX + (ringY * 3.5) * (ringY * 3.5));

        if (d2 <= radius * radius) {
          const nz = -Math.sqrt(radius * radius - d2);
          const dot = -(nx * 0.6 + ny * 0.4 + nz * 0.7);
          const surfaceTexture = Math.sin((nx + rotY * 0.2) * 20) * 0.15;
          const intensity = Math.max(0.1, Math.min(1.0, dot + surfaceTexture));
          lum[idx] = intensity;

          const cIdx = idx * 4;
          col[cIdx] = Math.floor(intensity * 30);
          col[cIdx + 1] = Math.floor(intensity * 220);
          col[cIdx + 2] = Math.floor(intensity * 255);
          col[cIdx + 3] = 255;
        } else if (ringD >= ringInner && ringD <= ringOuter && Math.abs(ringY) < 0.18) {
          const band = Math.sin(ringD * 40 + rotX) * 0.3 + 0.6;
          lum[idx] = band * 0.75;

          const cIdx = idx * 4;
          col[cIdx] = Math.floor(band * 255);
          col[cIdx + 1] = Math.floor(band * 180);
          col[cIdx + 2] = Math.floor(band * 50);
          col[cIdx + 3] = 255;
        } else {
          lum[idx] = 0;
        }
      }
    }
  }

  private renderBlackHole(
    lum: Float32Array,
    col: Uint8ClampedArray,
    time: number,
    aspect: number
  ) {
    const eventHorizon = 0.32;
    const photonSphere = 0.48;
    const accretionOuter = 1.35;

    for (let y = 0; y < this.height; y++) {
      const ny = (y / this.height) * 2 - 1;
      for (let x = 0; x < this.width; x++) {
        const nx = ((x / this.width) * 2 - 1) * aspect;
        const r = Math.sqrt(nx * nx + ny * ny);
        const theta = Math.atan2(ny, nx);
        const idx = y * this.width + x;

        if (r < eventHorizon) {
          // Inside Schwarzchild Event Horizon
          lum[idx] = 0.0;
        } else if (r < photonSphere) {
          // Photon ring lensing glare
          const glare = Math.pow((photonSphere - r) / (photonSphere - eventHorizon), 2);
          lum[idx] = glare * 0.95;

          const cIdx = idx * 4;
          col[cIdx] = 255;
          col[cIdx + 1] = Math.floor(glare * 200);
          col[cIdx + 2] = Math.floor(glare * 100);
          col[cIdx + 3] = 255;
        } else if (r < accretionOuter) {
          // Swirling Doppler-boosted accretion disk
          const swirl = theta + (1.2 / (r + 0.1)) - time * 2.0;
          const doppler = Math.cos(theta) * 0.45; // Relativistic beaming
          const noise = Math.sin(swirl * 6.0) * 0.3 + 0.7;
          const decay = Math.pow(1.0 - (r - photonSphere) / (accretionOuter - photonSphere), 1.5);
          const intensity = Math.max(0.0, Math.min(1.0, (noise + doppler) * decay));

          lum[idx] = intensity;

          const cIdx = idx * 4;
          // Cyberpunk / Phosphor accretion glow
          col[cIdx] = Math.floor(intensity * 255);
          col[cIdx + 1] = Math.floor(intensity * 120);
          col[cIdx + 2] = Math.floor(intensity * 60);
          col[cIdx + 3] = 255;
        } else {
          // Background space with slight gravitational deflection
          lum[idx] = 0.0;
        }
      }
    }
  }
}
