import assert from "node:assert/strict";
import test from "node:test";
import {
  canSaveTemplate,
  deleteTaskTemplate,
  FREE_TEMPLATE_LIMIT,
  readTaskTemplates,
  saveTaskTemplate,
} from "./task-templates.ts";

function installBrowser(t) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored = new Map();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, String(value)),
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
  });

  return { stored };
}

test("canSaveTemplate: 無料プランは上限で保存を止め、Proは止めない", () => {
  assert.equal(canSaveTemplate(0, false), true);
  assert.equal(canSaveTemplate(FREE_TEMPLATE_LIMIT - 1, false), true);
  assert.equal(canSaveTemplate(FREE_TEMPLATE_LIMIT, false), false);
  assert.equal(canSaveTemplate(FREE_TEMPLATE_LIMIT + 5, false), false);
  assert.equal(canSaveTemplate(FREE_TEMPLATE_LIMIT + 5, true), true);
});

test("保存して読み戻すと4項目すべて（サブタスク含む）が保たれる", (t) => {
  installBrowser(t);

  saveTaskTemplate({ name: "郵便を出す", min: 10, icon: "mail", subtasks: ["封筒を用意する", "切手を貼る"] });
  const templates = readTaskTemplates();

  assert.equal(templates.length, 1);
  assert.equal(templates[0].name, "郵便を出す");
  assert.equal(templates[0].min, 10);
  assert.equal(templates[0].icon, "mail");
  assert.deepEqual(templates[0].subtasks, ["封筒を用意する", "切手を貼る"]);
  assert.equal(typeof templates[0].id, "string");
  assert.ok(templates[0].id.length > 0);
});

test("同じ名前と所要時間で保存すると複製せず上書きする", (t) => {
  installBrowser(t);

  saveTaskTemplate({ name: "洗濯を回す", min: 15, icon: "local_laundry_service" });
  const firstId = readTaskTemplates()[0].id;

  saveTaskTemplate({ name: "洗濯を回す", min: 15, icon: "checklist", subtasks: ["干す"] });
  const templates = readTaskTemplates();

  assert.equal(templates.length, 1);
  assert.equal(templates[0].id, firstId);
  assert.equal(templates[0].icon, "checklist");
  assert.deepEqual(templates[0].subtasks, ["干す"]);
});

test("名前か所要時間が違えば別テンプレートとして追加される", (t) => {
  installBrowser(t);

  saveTaskTemplate({ name: "洗濯を回す", min: 15, icon: "local_laundry_service" });
  saveTaskTemplate({ name: "洗濯を回す", min: 20, icon: "local_laundry_service" });
  saveTaskTemplate({ name: "食器を洗う", min: 15, icon: "restaurant" });

  assert.equal(readTaskTemplates().length, 3);
});

test("削除するとそのテンプレートだけが取り除かれる", (t) => {
  installBrowser(t);

  saveTaskTemplate({ name: "郵便を出す", min: 10, icon: "mail" });
  saveTaskTemplate({ name: "洗濯を回す", min: 15, icon: "local_laundry_service" });
  const [first, second] = readTaskTemplates();

  deleteTaskTemplate(first.id);
  const remaining = readTaskTemplates();

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, second.id);
});

test("壊れたJSONは空配列として読み戻る", (t) => {
  const { stored } = installBrowser(t);

  stored.set("fin.task-templates", "{not json");
  assert.deepEqual(readTaskTemplates(), []);
});

test("未知のschemaVersionは空配列として読み戻る", (t) => {
  const { stored } = installBrowser(t);

  stored.set("fin.task-templates", JSON.stringify({ schemaVersion: 2, templates: [{ id: "x", name: "a", min: 1, icon: "mail" }] }));
  assert.deepEqual(readTaskTemplates(), []);
});

test("templatesが配列でない、または要素の型が不正なら空配列として読み戻る", (t) => {
  const { stored } = installBrowser(t);

  stored.set("fin.task-templates", JSON.stringify({ schemaVersion: 1, templates: "oops" }));
  assert.deepEqual(readTaskTemplates(), []);

  stored.set("fin.task-templates", JSON.stringify({ schemaVersion: 1, templates: [{ id: "x", name: "", min: 1, icon: "mail" }] }));
  assert.deepEqual(readTaskTemplates(), []);
});
