import fs from "fs";
import path from "path";
import { pressVisual, PRESS_SCALE, PRESS_DIM_OPACITY } from "../pressFeedback";

describe("press feedback", () => {
  test("motion allowed: scale (and edge translate) only, full opacity", () => {
    expect(pressVisual(0, false, true)).toEqual({ scale: 1, translateY: 0, opacity: 1 });
    expect(pressVisual(1, false, true)).toEqual({ scale: PRESS_SCALE, translateY: 2, opacity: 1 });
    expect(pressVisual(1, false, false).translateY).toBe(0);
  });
  test("Reduce Motion: no movement, still visible as a dim", () => {
    const v = pressVisual(1, true, true);
    expect(v.scale).toBe(1);
    expect(v.translateY).toBe(0);
    expect(v.opacity).toBeCloseTo(PRESS_DIM_OPACITY);
  });
  test("Button never changes margin, padding or border width on press", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/Button.tsx"), "utf8");
    expect(src).not.toMatch(/pressed[^\n]*(margin|padding|borderBottomWidth|borderWidth|height|width)/);
    expect(src).toMatch(/pressVisual\(/);
  });
});
