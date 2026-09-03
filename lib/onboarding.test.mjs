import assert from "node:assert/strict";
import test from "node:test";
import { ONBOARDING_STORAGE_KEY, readOnboardingCompleted, writeOnboardingCompleted } from "./onboarding.ts";

function installWindow(t, localStorage) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage }, writable: true });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else delete globalThis.window;
  });
}

function memoryStorage() {
  const stored = new Map();
  return {
    stored,
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error("storage disabled");
  },
  setItem: () => {
    throw new Error("storage disabled");
  },
};

test("未保存なら未完了、保存後は完了として読める", (t) => {
  const storage = memoryStorage();
  installWindow(t, storage);

  assert.equal(readOnboardingCompleted(), false);
  assert.equal(writeOnboardingCompleted(), true);
  assert.equal(storage.stored.get(ONBOARDING_STORAGE_KEY), "1");
  assert.equal(readOnboardingCompleted(), true);
});

test("ストレージが例外を投げる端末でも落ちず、完了扱いに倒れる", (t) => {
  installWindow(t, throwingStorage);

  // ここを false に倒すと、保存できない端末が毎回オンボーディングに送り返される。
  assert.equal(readOnboardingCompleted(), true);
  assert.equal(writeOnboardingCompleted(), false);
});
