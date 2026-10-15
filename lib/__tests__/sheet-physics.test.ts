import { project, rubberband, shouldDismiss } from "../sheetPhysics";

describe("sheet physics", () => {
  const H = 400;
  test("a long slow drag closes, a short slow drag springs back", () => {
    expect(shouldDismiss(200, 0, H)).toBe(true);
    expect(shouldDismiss(30, 0, H)).toBe(false);
  });
  test("flick velocity decides: a short fast flick down closes, a fast flick up keeps it", () => {
    expect(shouldDismiss(20, 1500, H)).toBe(true);
    expect(shouldDismiss(200, -2000, H)).toBe(false);
  });
  test("projection grows with velocity and is 0 at rest", () => {
    expect(project(0)).toBe(0);
    expect(project(1000)).toBeGreaterThan(project(500));
  });
  test("rubber band resists: less than 1:1, monotonic, never past the dimension", () => {
    expect(Math.abs(rubberband(-100, H))).toBeLessThan(100);
    expect(Math.abs(rubberband(-200, H))).toBeGreaterThan(Math.abs(rubberband(-100, H)));
    expect(Math.abs(rubberband(-100000, H))).toBeLessThan(H);
    expect(rubberband(50, H)).toBeGreaterThan(0);
  });
});
