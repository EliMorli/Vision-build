import { createHaptics, HAPTIC_MAP } from "../haptics/core";

function fakeModule() {
  const calls: string[] = [];
  return {
    calls,
    mod: {
      ImpactFeedbackStyle: { Light: "light" },
      NotificationFeedbackType: { Success: "success", Warning: "warning" },
      impactAsync: jest.fn(async (s: unknown) => { calls.push(`impact:${s}`); }),
      notificationAsync: jest.fn(async (t: unknown) => { calls.push(`notification:${t}`); }),
    },
  };
}

describe("haptics", () => {
  test("Ui's map: light impact for land/save/XP, success when all 4 are done, warning on delete", () => {
    const { mod, calls } = fakeModule();
    const fire = createHaptics("ios", mod);
    fire("designLanded"); fire("saved"); fire("xpEarned"); fire("allDone"); fire("deleteAccount");
    expect(calls).toEqual(["impact:light", "impact:light", "impact:light", "notification:success", "notification:warning"]);
    expect(Object.keys(HAPTIC_MAP).sort()).toEqual(["allDone", "deleteAccount", "designLanded", "saved", "xpEarned"]);
  });

  test("one call per event (no repeats)", () => {
    const { mod } = fakeModule();
    createHaptics("android", mod)("saved");
    expect(mod.impactAsync).toHaveBeenCalledTimes(1);
    expect(mod.notificationAsync).not.toHaveBeenCalled();
  });

  test("web is a safe no-op but still records the moment", () => {
    const { mod } = fakeModule();
    const seen: string[] = [];
    const fire = createHaptics("web", mod, (e) => seen.push(e));
    fire("allDone");
    expect(mod.notificationAsync).not.toHaveBeenCalled();
    expect(seen).toEqual(["allDone"]);
  });

  test("a throwing or rejecting module never breaks the action", async () => {
    const throwing = { ...fakeModule().mod, impactAsync: () => { throw new Error("no taptic"); } };
    expect(() => createHaptics("ios", throwing)("saved")).not.toThrow();
    const rejecting = { ...fakeModule().mod, notificationAsync: () => Promise.reject(new Error("off")) };
    expect(() => createHaptics("ios", rejecting)("allDone")).not.toThrow();
    await new Promise((r) => setImmediate(r));
    expect(() => createHaptics("ios", null)("saved")).not.toThrow();
  });
});
