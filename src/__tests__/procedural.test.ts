import { describe, it, expect } from "vitest";
import { renderProcedural3D } from "../engine/procedural-3d";
import { Procedural3DParams, ProceduralScene } from "../contracts";

describe("Procedural 3D ASCII Engine Math Verification", () => {
  const ramp = " .:-=+*#%@";

  const scenes: ProceduralScene[] = ["donut", "sphere", "cube", "planet", "blackhole"];

  for (const scene of scenes) {
    it(`renders ${scene} scene with exact dimensions and non-empty character distribution`, () => {
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

      expect(result).toBeTypeOf("string");
      expect(result.length).toBeGreaterThan(0);

      const lines = result.split("\n");
      expect(lines).toHaveLength(rows);
      for (const line of lines) {
        expect(line.length).toBe(cols);
      }

      // Verify that non-space characters exist (rendered geometry is visible)
      const nonSpaceChars = result.replace(/[\s\n]/g, "").length;
      expect(nonSpaceChars).toBeGreaterThan(50);
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

    expect(frame0).not.toBe(frame25);
  });
});
