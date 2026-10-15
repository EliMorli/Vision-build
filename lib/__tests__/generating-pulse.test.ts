import fs from "fs";
import path from "path";
import { pulseAt, PULSE } from "../generating/pulse";

describe("Generating room pulse", () => {
  test("stays within opacity 0.85-1 and scale 0.97-1 (never invisible)", () => {
    for (let i = -2; i <= 12; i++) {
      const { opacity, scale } = pulseAt(i / 10);
      expect(opacity).toBeGreaterThanOrEqual(0.85);
      expect(opacity).toBeLessThanOrEqual(1);
      expect(scale).toBeGreaterThanOrEqual(0.97);
      expect(scale).toBeLessThanOrEqual(1);
    }
    expect(pulseAt(0)).toEqual({ opacity: PULSE.opacityMin, scale: PULSE.scaleMin });
    expect(pulseAt(1)).toEqual({ opacity: 1, scale: 1 });
  });
  test("the screen uses the pulse helper, not the old 0.3 opacity / 0.9 scale loop", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../app/generating/[id].tsx"), "utf8");
    expect(src).toMatch(/pulseAt\(/);
    expect(src).not.toMatch(/toValue:\s*0\.3|outputRange:\s*\[0\.9/);
  });
});
