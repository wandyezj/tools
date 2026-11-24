// @ts-check

import { equal } from "node:assert/strict";
import { isPlainObject } from "./isPlainObject.js";
import { report, test } from "./test.js";

test("returns true for object literals", () => {
    equal(isPlainObject({}), true);
    equal(isPlainObject({ key: "value", nested: { count: 1 } }), true);
});

test("returns true for objects created via Object constructors", () => {
    equal(isPlainObject(Object.create(null)), true);
    equal(isPlainObject(new Object()), true);
});

test("returns false for null and undefined", () => {
    equal(isPlainObject(null), false);
    equal(isPlainObject(undefined), false);
});

test("returns false for arrays", () => {
    equal(isPlainObject([]), false);
    equal(isPlainObject([1, 2, 3]), false);
    equal(isPlainObject([{ key: "value" }]), false);
});

test("returns false for primitive values", () => {
    equal(isPlainObject(""), false);
    equal(isPlainObject("object"), false);
    equal(isPlainObject(0), false);
    equal(isPlainObject(42), false);
    equal(isPlainObject(NaN), false);
    equal(isPlainObject(true), false);
    equal(isPlainObject(false), false);
    equal(isPlainObject(Symbol("test")), false);
    equal(isPlainObject(10n), false);
});

test("returns false for functions and classes", () => {
    equal(
        isPlainObject(() => {}),
        false
    );
    equal(
        isPlainObject(function namedFn() {}),
        false
    );
    equal(isPlainObject(class Example {}), false);
});

report();
