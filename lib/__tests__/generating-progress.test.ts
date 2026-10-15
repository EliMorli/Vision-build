import fs from "fs";
import path from "path";
import { getGeneratingProgress, countReadyDesigns } from "../generating/progress";

const project = (urls: number, status = "generated") => ({
  id: "p1",
  status,
  generated_image_urls: Array.from({ length: urls }, (_, i) => `u${i}.png`),
});

describe("Generating progress (real signals only)", () => {
  test("nothing ready while the request runs: segment 1 active, label and a11y say so", () => {
    const p = getGeneratingProgress({ loading: true, projectId: "p1", project: project(4) });
    expect(p.readyCount).toBe(0);
    expect(p.segments).toEqual(["active", "waiting", "waiting", "waiting"]);
    expect(p.label).toBe("Design 1 of 4");
    expect(p.accessibilityLabel).toBe("Creating design 1 of 4");
    expect(p.accessibilityValue).toMatchObject({ min: 0, max: 4, now: 0 });
  });

  test("ready designs snap segments to done and the a11y label updates", () => {
    const two = getGeneratingProgress({ loading: false, projectId: "p1", project: project(2) });
    expect(two.segments).toEqual(["done", "done", "active", "waiting"]);
    expect(two.accessibilityLabel).toBe("Design 2 of 4 ready");
    expect(two.accessibilityValue.now).toBe(2);
    const all = getGeneratingProgress({ loading: false, projectId: "p1", project: project(4) });
    expect(all.segments).toEqual(["done", "done", "done", "done"]);
    expect(all.activeIndex).toBeNull();
    expect(all.accessibilityLabel).toBe("All 4 designs ready");
  });

  test("other projects, unfinished projects and extra images never count", () => {
    expect(countReadyDesigns({ loading: false, projectId: "p2", project: project(4) })).toBe(0);
    expect(countReadyDesigns({ loading: false, projectId: "p1", project: project(4, "analyzed") })).toBe(0);
    expect(countReadyDesigns({ loading: false, projectId: "p1", project: project(9) })).toBe(4);
    expect(countReadyDesigns({ loading: false, projectId: "p1", project: null })).toBe(0);
  });

  test("bar value is not derived from elapsed time: same state, same bar, whatever the clock says", () => {
    const input = { loading: true, projectId: "p1", project: project(0, "generating") };
    const now = jest.spyOn(Date, "now");
    now.mockReturnValue(0);
    const atStart = getGeneratingProgress(input);
    now.mockReturnValue(10 * 60 * 1000);
    const muchLater = getGeneratingProgress(input);
    now.mockRestore();
    expect(muchLater).toEqual(atStart);
  });

  test("no clock or time estimate in the helper or the bar on the Generating screen", () => {
    const helper = fs.readFileSync(path.join(__dirname, "../generating/progress.ts"), "utf8");
    expect(helper).not.toMatch(/Date\.now|performance\.now|setInterval|setTimeout|new Date/);
    const screen = fs.readFileSync(path.join(__dirname, "../../app/generating/[id].tsx"), "utf8");
    expect(screen).toMatch(/getGeneratingProgress\(/);
    expect(screen).not.toMatch(/elapsedProgress|displayProgress|\/\s*20000|sec left/);
  });
});
