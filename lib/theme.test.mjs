import assert from "node:assert/strict";
import test from "node:test";
import { applyThemePreference, readThemePreference, writeThemePreference } from "./theme.ts";

function installBrowser(t, initialTheme) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const stored = new Map();
  const attributes = new Map();

  if (initialTheme) attributes.set("data-theme", initialTheme);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
      },
      matchMedia: () => ({
        addEventListener: () => {},
        matches: false,
        removeEventListener: () => {},
      }),
    },
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {
        getAttribute: (name) => attributes.get(name) ?? null,
        removeAttribute: (name) => attributes.delete(name),
        setAttribute: (name, value) => attributes.set(name, value),
      },
    },
    writable: true,
  });

  t.after(() => {
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      delete globalThis.window;
    }
    if (documentDescriptor) {
      Object.defineProperty(globalThis, "document", documentDescriptor);
    } else {
      delete globalThis.document;
    }
  });

  return { attributes, stored };
}

test("保存値がない場合や不正な場合はシステム設定に戻る", (t) => {
  const { stored } = installBrowser(t);

  assert.equal(readThemePreference(), "system");
  stored.set("fin.theme", "sepia");
  assert.equal(readThemePreference(), "system");
});

test("有効なテーマ設定は保存して読み戻せる", (t) => {
  installBrowser(t);

  for (const preference of ["system", "light", "dark"]) {
    writeThemePreference(preference);
    assert.equal(readThemePreference(), preference);
  }
});

test("ライトは属性を外し、ダークは属性を設定する", (t) => {
  const { attributes } = installBrowser(t, "dark");

  applyThemePreference("light");
  assert.equal(attributes.get("data-theme") ?? null, null);
  applyThemePreference("dark");
  assert.equal(attributes.get("data-theme"), "dark");
});
