import { describe, it, expect } from "vitest";
import { renderProcedural3D } from "../engine/procedural-3d";
import { Procedural3DParams, ProceduralScene } from "../contracts";

describe("Procedural 3D ASCII Engine Math Verification", () => {
  const ramp = " .:-=+*#%@";

  const scenes: ProceduralScene[] = ["donut", "sphere", "cube", "planet", "blackhole"];

  for (const scene of scenes) {
    it(`renders ${scene} scene with exact dimensions, valid colorBuffer, and non-empty character distribution`, () => {
      const params: Procedural3DParams = {
        scene,
        rotation_speed_x: 1.0,
        rotation_speed_y: 1.0,
        rotation_speed_z: 0.0,
        camera_distance: 5.0,
        field_of_view: 60,
        light_direction: [0, 1, -1],
        ambient_light: 0.2,
        specular_strength: 0.5,
      };

      const cols = 80;
      const rows = 40;
      const result = renderProcedural3D(params, 0, cols, rows, ramp);

      expect(result.text).toBeTypeOf("string");
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.colorBuffer).toBeInstanceOf(Uint8Array);
      expect(result.colorBuffer.length).toBe(cols * rows * 3);

      const lines = result.text.split("\n");
      expect(lines).toHaveLength(rows);
      for (const line of lines) {
        expect(line.length).toBe(cols);
      }

      // Verify that non-space characters exist (rendered geometry is visible)
      const nonSpaceChars = result.text.replace(/[\s\n]/g, "").length;
      expect(nonSpaceChars).toBeGreaterThan(50);

      // Verify non-zero color channels exist in colorBuffer for rendered scene
      const hasColor = result.colorBuffer.some((val) => val > 0);
      expect(hasColor).toBe(true);
    });
  }

  it("produces varying frame output across animation ticks", () => {
    const params: Procedural3DParams = {
      scene: "donut",
      rotation_speed_x: 1.0,
      rotation_speed_y: 1.0,
      rotation_speed_z: 0.0,
      camera_distance: 5.0,
      field_of_view: 60,
      light_direction: [0, 1, -1],
      ambient_light: 0.2,
      specular_strength: 0.5,
    };

    const frame0 = renderProcedural3D(params, 0, 60, 30, ramp);
    const frame25 = renderProcedural3D(params, 25, 60, 30, ramp);

    expect(frame0.text).not.toBe(frame25.text);
  });
});
