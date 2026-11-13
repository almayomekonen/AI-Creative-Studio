import { test } from "node:test";
import assert from "node:assert/strict";
import { validateShotlist } from "../scripts/pipeline/studio.mjs";

const good = { id: "S01", durationSec: 2, type: "motion-graphics", camera: { size: "WS", movement: "push-in" }, transitionIn: "cut", status: "planned" };

test("valid shot list passes", () => assert.deepEqual(validateShotlist({ shots: [good] }), []));
test("empty shot list fails", () => assert.equal(validateShotlist({ shots: [] }).length, 1));
test("procedural 3d shot needs a build note", () => {
  const errs = validateShotlist({ shots: [{ ...good, type: "3d", build: "" }] });
  assert.ok(errs.some((e) => e.includes("build note")));
});
test("duplicate ids and bad transition are caught", () => {
  const errs = validateShotlist({ shots: [good, { ...good, transitionIn: "star-wipe" }] });
  assert.ok(errs.some((e) => e.includes("duplicate")));
  assert.ok(errs.some((e) => e.includes("transitionIn")));
});
test("approved shots must have an asset", () => {
  const errs = validateShotlist({ shots: [{ ...good, status: "approved" }] });
  assert.ok(errs.some((e) => e.includes("asset")));
});
