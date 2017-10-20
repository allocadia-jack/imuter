import "jasmine";
import { addMatchers } from "../test/jasmine-matchers";
import {
    imuter,
    object_assign, object_delete, object_set,
    array_delete, array_remove, array_set, array_push, array_pop, array_shift, array_unshift, array_slice, array_insert, array_map, array_filter,
    write, writeValue, removeValue
} from "./imuter";


class Point {
    public constructor(public x: number = 0, public y: number = 0) {}

    public isZero() { return this.x === 0 && this.y === 0; }
}


declare var window: any;
declare var document: any;
declare var Blob: any;


describe("imuter", function() {
    beforeEach(addMatchers);

    describe("freezing", function() {
        it("should work on primitives", function() {
            imuter(1);
            imuter(NaN);
            imuter(true);
            imuter(false);
            imuter("");
            imuter("able");
        });

        it("should work on null/undefined", function() {
            imuter(undefined);
            imuter(null);
        });

        it("should work on plain objeccts", function() {
            const obj = {};
            imuter(obj);
            expect(obj).toBeFrozen();
        });

        it("should work on simple arrays", function() {
            const a = [];
            imuter(a);
            expect(a).toBeFrozen();
        });

        it("should return the same object", function() {
            const o = {};
            expect(imuter(o)).toBe(o);
        });

        it("should work on already frozen objects", function() {
            const o = {};
            expect(imuter(imuter(o))).toBe(o);
        });

        it("should work on wrapped already frozen objects", function() {
            const o = imuter({});
            const o2 = [o];
            expect(imuter(o2)).toBe(o2);
        });

        it("should work on simple arrays containing primitives", function() {
            const a = [1, "2", true, null, "5"];
            imuter(a);
            expect(a).toBeFrozen();
        });

        it("should work on plain objeccts containing primitives", function() {
            const obj = {1: 1, 2: "2", true: true, null: null, 5: 5};
            imuter(obj);
            expect(obj).toBeFrozen();
        });

        it("should work on objects in arrays", function() {
            const obj = {};
            const a = [obj];
            imuter(a);
            expect(a).toBeFrozen();
            expect(obj).toBeFrozen();
        });

        it("should work with [object].map method", function() {
            const a: Point[] = [new Point()].map(imuter);

            expect(a[0]).toBeFrozen();
        });

        it("should work with [primitive].map method", function() {
            const a: number[] = [1].map(imuter);

            expect(a[0]).toBeFrozen();
        });

        it("should work with [null].map method", function() {
            const a: null[] = [null].map(imuter);

            expect(a[0]).toBeFrozen();
        });

        it("should work with [primitive].map method", function() {
            const a: undefined[] = [undefined].map(imuter);

            expect(a[0]).toBeFrozen();
        });

        it("should work on arrays in objects", function() {
            const a: any[] = [];
            const obj = {a};
            imuter(obj);
            expect(a).toBeFrozen();
            expect(obj).toBeFrozen();
        });

        it("should work on Date instances", function() {
            const v = new Date();
            expect(imuter(v)).toBe(v);
            expect(v).toBeFrozen();
        });

        it("should work on RegExp instances", function() {
            const v = new RegExp("foo");
            expect(imuter(v)).toBe(v);
            expect(v).toBeFrozen();
        });

        it("should work on RegExp values", function() {
            const v = /foo/;
            expect(imuter(v)).toBe(v);
            expect(v).toBeFrozen();
        });

        it("should work on Number instances", function() {
            /* tslint:disable: no-construct */
            const v = new Number(5);
            expect(imuter(v)).toBe(v);
            expect(v).toBeFrozen();
        });

        it("should work on Boolean instances", function() {
            /* tslint:disable: no-construct */
            const v = new Boolean(false);
            expect(imuter(v)).toBe(v);
            expect(v).toBeFrozen();
        });

        it("should work on String instances", function() {
            /* tslint:disable: no-construct */
            const v = new String("v");
            expect(imuter(v)).toBe(v);
            expect(v).toBeFrozen();
        });

        it("should work on classes", function() {
            const p = new Point(1, 2);
            expect(imuter(p)).toBe(p);
            expect(p).toBeFrozen();
        });

        it("should work on self-referencing objects", function() {
            const o = {foo: <any>null};
            o.foo = o;
            expect(imuter(o)).toBe(o);
            expect(o).toBeFrozen();
            expect(o.foo).toBe(o);
        });

        it("should work on self-referencing arrays", function() {
            const a: any[] = [];
            a.push(a);
            expect(imuter(a)).toBe(a);
            expect(a).toBeFrozen();
            expect(a[0]).toBe(a);
        });

        it("should work on nested recursive objects", function() {
            const o = {foo: {bar: <any>null}};
            o.foo.bar = o;
            expect(imuter(o)).toBe(o);
            expect(o).toBeFrozen();
            expect(o.foo).toBeFrozen();
            expect(o.foo.bar).toBe(o);
        });

        it("should work on nested calls with objects", function() {
            const a1: Readonly<{x: {y: number}}> = imuter({x: {y: 1}});
            const a2: Readonly<{x: {y: number}}> = imuter({x: imuter({y: 1})});
            const a3: Readonly<{x: {y: number}}> = imuter(imuter({x: {y: 1}}));
            const a4: Readonly<{x: {y: {z: number}}}> = imuter({x: {y: imuter({z: 1})}});

            expect(a1).toBeFrozen();
            expect(a2).toBeFrozen();
            expect(a3).toBeFrozen();
            expect(a4).toBeFrozen();
        });

        it("should work on nested calls with arrays", function() {
            const a1: ReadonlyArray<number[]> = imuter([[1]]);
            const a2: ReadonlyArray<ReadonlyArray<number>> = imuter([imuter([1])]);
            const a3: ReadonlyArray<ReadonlyArray<number>> = imuter(imuter([[1]]));
            const a4: ReadonlyArray<ReadonlyArray<number>> = imuter([imuter([1]), [2]]);

            expect(a1).toBeFrozen();
            expect(a2).toBeFrozen();
            expect(a3).toBeFrozen();
            expect(a4).toBeFrozen();
        });
    });

    describe("unsupported", function() {
        const NO_FREEZE_MSG = "Freezing a Window, global, Node, Blob, TypedArray or ArrayBuffer is unsupported";

        it("should throw when passed Window", function() {
            expect(function() { imuter(window); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed nested Window", function() {
            expect(function() { imuter([window]); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed a DOM document", function() {
            expect(function() { imuter(window.document); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed a DOM Node", function() {
            expect(function() { imuter(document.body); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Blob", function() {
            expect(function() { imuter(new Blob()); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Int8Array", function() {
            expect(function() { imuter(new Int8Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Int16Array", function() {
            expect(function() { imuter(new Int16Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Float32Array", function() {
            expect(function() { imuter(new Float32Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Float64Array", function() {
            expect(function() { imuter(new Float64Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Uint8Array", function() {
            expect(function() { imuter(new Uint8Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Uint8ClampedArray", function() {
            expect(function() { imuter(new Uint8ClampedArray(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Uint16Array", function() {
            expect(function() { imuter(new Uint16Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed Uint32Array", function() {
            expect(function() { imuter(new Uint32Array(1)); }).toThrowError(NO_FREEZE_MSG);
        });

        it("should throw when passed ArrayBuffer", function() {
            expect(function() { imuter(new ArrayBuffer(1)); }).toThrowError(NO_FREEZE_MSG);
        });
    });

    describe("object_set", function() {
        it("should return a new frozen object", function() {
            const o1 = imuter({a: 1});
            const o2 = object_set(o1, "a", 2);

            expect(o1).not.toBe(o2);
            expect(o2.a).toBe(2);
            expect(o2).toBeFrozen();
        });

        it("should be a noop when no change", function() {
            const o1 = imuter({a: 1});
            const o2 = object_set(o1, "a", 1);
            expect(o2).toBe(o1);
        });

        it("should add new properties", function() {
            const o1 = imuter({a: 1});
            const o2 = object_set<any>(o1, "b", 2);

            expect(o1).not.toBe(o2);
            expect(o2.a).toBe(1);
            expect(o2.b).toBe(2);
            expect(o2).toBeFrozen();
        });

        it("should deep-freeze the value being written", function() {
            const o1 = imuter({a: 1});
            const nv = {b: [2]};
            const o2 = object_set<any>(o1, "a", nv);

            expect(o1).not.toBe(o2);
            expect(o2.a).toBe(nv);
            expect(o2).toBeFrozen();
            expect(o2.a).toBeFrozen();
            expect(o2.a.b).toBeFrozen();
        });

        it("should support classes", function() {
            const p1 = new Point(1, 2);
            const p2: Readonly<Point> = object_set(p1, "x", 2);
            expect(p2).not.toBe(p1);
            expect(p2 instanceof Point).toBe(true);
            expect(p1.x).toBe(1);
            expect(p2.x).toBe(2);
        });

        it("should support already frozen classes", function() {
            const p1 = imuter(new Point(1, 2));
            const p2: Readonly<Point> = object_set(p1, "x", 2);
            expect(p2).not.toBe(p1);
            expect(p2 instanceof Point).toBe(true);
            expect(p1.x).toBe(1);
            expect(p2.x).toBe(2);
        });
    });

    describe("object_delete", function() {
        it("should return a new frozen object", function() {
            const o1 = imuter({a: 1});
            const o2 = object_delete(o1, "a");
            expect(o2).not.toBe(o1);
            expect(o2).toBeFrozen();
        });

        it("should be a noop when no change", function() {
            const o1 = imuter({a: 1});
            const o2 = object_delete(o1, <any>"a2");
            expect(o2).toBe(o1);
        });

        it("should remove the specified key", function() {
            const o1 = imuter({a: 1});
            const o2 = object_delete(o1, "a");

            expect(o1).not.toBe(o2);
            expect("a" in o1).toBe(true);
            expect("a" in o2).toBe(false);
            expect(o2).toBeFrozen();
        });
    });

    describe("object_assign", function() {
        it("should invoke Object.assign", function() {
            const assignSpy = spyOn(Object, "assign");
            const o = object_assign({a: 1}, {b: 2}, {c: 3});
            expect(assignSpy).toHaveBeenCalledWith({}, {a: 1}, {b: 2}, {c: 3});
        });

        it("should return a new frozen object", function() {
            const o1 = {a: 1};
            const o2 = {b: 2};
            const o3 = object_assign(o1, o2);
            expect(o3).not.toBe(<any>o1);
            expect(o3).not.toBe(<any>o2);
            expect(o3).toBeFrozen();
        });

        it("should deep freeze the result object", function() {
            const o = object_assign({a: {b: 2}}, {c: {d: {e: 3}}});
            expect(o).toBeFrozen();
            expect(o.a).toBeFrozen();
            expect(o.a.b).toBe(2);
            expect(o.c).toBeFrozen();
            expect(o.c.d).toBeFrozen();
            expect(o.c.d.e).toBe(3);
        });

        it("should support classes", function() {
            const p = object_assign(new Point(1, 1), new Point(3, 2), {y: 3});
            expect(p).toBeFrozen();
            expect(p instanceof Point).toBe(false);
            expect(p.x).toBe(3);
            expect(p.y).toBe(3);
        });
    });

    describe("array_set", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_set(i, 0, 1);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
            expect(a.length).toBe(1);
            expect(a[0]).toBe(1);
        });

        it("should be a noop when no change", function() {
            const i = [0];
            const a = array_set(i, 0, 0);
            expect(a).toBe(i);
        });

        it("should deep freeze the new value", function() {
            const a = array_set<any>([{}], 0, {b: {c: 1}});
            expect(a).toBeFrozen();
            expect(a.length).toBe(1);
            expect(a[0].b).toBeFrozen();
        });

        it("should set the value like a plain assignment", function() {
            const a = array_set([0, undefined], 5, 1);

            expect(a).toEqual([0, undefined, undefined, undefined, undefined, 1]);
        });

        it("should freeze the set content", function() {
            const a = array_set([0, 1], 1, {});
            expect(a[1]).toEqual({});
            expect(a[1]).toBeFrozen();
        });

        it("should support classes", function() {
            const a: ReadonlyArray<Point> = array_set([], 0, new Point(1, 2));
            expect(a).toBeFrozen();
            expect(a.length).toBe(1);
        });

        it("should support already-frozen arrays", function() {
            array_set(imuter([{}]), 0, 1);
        });

        it("should support array of frozen objects", function() {
            array_set([imuter({})], 0, {});
        });
    });

    describe("array_delete", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_delete(i, 0);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should be a noop when no change", function() {
            const i = [0];
            const a = array_delete(i, 1);
            expect(a).toBe(i);
        });

        it("should delete the value like a plain delete", function() {
            expect(array_delete([0, 1, 2, undefined], 2)).toEqual([0, 1, undefined, undefined]);
            expect(array_delete([0, 1, 2, undefined], 1)).toEqual([0, undefined, 2, undefined]);
        });

        it("should do nothing for unset indexes like a plain delete", function() {
            expect(array_delete([0, 1, 2], 5)).toEqual([0, 1, 2]);
            expect(array_delete([0, 1, 2], -5)).toEqual([0, 1, 2]);
        });

        it("should support already-frozen arrays", function() {
            array_delete(imuter([0, 1, 2]), 1);
        });

        it("should support array of frozen objects", function() {
            array_delete([imuter({})], 0);
        });
    });

    describe("array_remove", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_remove(i, 0);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should be a noop when no change", function() {
            const i = [0];
            const a = array_remove(i, 1);
            expect(a).toBe(i);
        });

        it("should remove the value", function() {
            expect(array_remove([0, 1, 2], 2)).toEqual([0, 1]);
            expect(array_remove([0, 1, 2], 1)).toEqual([0, 2]);
        });

        it("should support already-frozen arrays", function() {
            array_remove(imuter([0, 1, 2]), 1);
        });

        it("should support array of frozen objects", function() {
            array_remove([imuter({})], 0);
        });
    });

    describe("array_push", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_push(i, 0);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should add a value to the end of the array", function() {
            const a = array_push([0], 1);
            expect(a).toEqual([0, 1]);
        });

        it("should support var args", function() {
            const a = array_push([0], 1, 2, 3);
            expect(a).toEqual([0, 1, 2, 3]);
        });

        it("should deep freeze the pushed content", function() {
            const pushed = {a: {}};
            const a = array_push([], pushed);
            expect(a[0]).toEqual(pushed);
            expect(a[0]).toBeFrozen();
        });

        it("should support classes", function() {
            const p1 = new Point(1, 2);
            const p2 = new Point(3, 4);
            const a1 = [p1];
            const a2 = array_push(a1, p2);
            expect(a2[1]).toBe(p2);
        });

        it("should support already frozen classes", function() {
            const p1 = new Point(1, 2);
            const p2 = imuter(new Point(3, 4));
            const a1 = [p1];
            const a2 = array_push(a1, p2);
            expect(a2[1]).toBe(p2);
        });

        it("should support already frozen class-array", function() {
            const p1 = new Point(1, 2);
            const p2 = new Point(3, 4);
            const a1 = Object.freeze([p1]);
            const a2 = array_push(a1, p2);
            expect(a2[1]).toBe(p2);
        });
    });

    describe("array_pop", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_pop(i);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should remove a value from the end of the array", function() {
            const i = [0, 1, 2];
            const a = array_pop(i);
            expect(a).toEqual([0, 1]);
        });

        it("should be a noop when empty", function() {
            const i: any[] = [];
            const a = array_pop(i);
            expect(a).toBe(i);
        });
    });

    describe("array_shift", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_shift(i);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should remove a value from the start of the array", function() {
            const i = [0, 1, 2];
            const a = array_shift(i);
            expect(a).toEqual([1, 2]);
        });

        it("should be a noop when empty", function() {
            const i: any[] = [];
            const a = array_shift(i);
            expect(a).toBe(i);
        });
    });

    describe("array_unshift", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_unshift(i, 0);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should add a value to the start of the array", function() {
            const a = array_unshift([0], 1);
            expect(a).toEqual([1, 0]);
        });

        it("should support var args", function() {
            const a = array_unshift([0], 1, 2, 3);
            expect(a).toEqual([1, 2, 3, 0]);
        });

        it("should deep freeze the unshifted content", function() {
            const a = array_unshift<any>([{}], {a: {b: {c: 1}}});
            expect(a[0]).toEqual({a: {b: {c: 1}}});
            expect(a[0]).toBeFrozen();
            expect(a[0].a.b).toBeFrozen();
        });
    });

    describe("array_slice", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_slice(i, 0, 1);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should slice from startIndex", function() {
            const i = [0, 1, 2, 3];
            const a = array_slice(i, 1);
            expect(a).toEqual([1, 2, 3]);
        });

        it("should slice up to (but not including) endEndex", function() {
            const i = [0, 1, 2, 3];
            expect(array_slice(i, 1, 2)).toEqual([1]);
            expect(array_slice(i, 1, i.length)).toEqual([1, 2, 3]);
        });

        it("should wrap indexes when startIndex<0", function() {
            const i = [0, 1, 2, 3];
            const a = array_slice(i, -2, 3);
            expect(a).toEqual([2]);
        });
    });

    describe("array_insert", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_insert(i, 0, 1);
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should add values at the specified index of the array", function() {
            const a = array_insert([0, 1, 2], 1, 3, 4);
            expect(a).toEqual([0, 3, 4, 1, 2]);
        });

        it("should deep freeze the inserted content", function() {
            const inserted = {a: {b: {c: 1}}};
            const a = array_insert<any>([0], 1, inserted);
            expect(a[1]).toBe(inserted);
            expect(a[1]).toBeFrozen();
            expect(a[1].a.b).toBeFrozen();
        });
    });

    describe("array_map", function() {
        it("should return a frozen array", function() {
            const i = [0];
            const a = array_map(i, function(v) { return v + 1; });
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should be a noop when empty", function() {
            const i: any[] = [];
            const a = array_map(i, function(v) { return v + 1; });
            expect(a).toBe(i);
        });

        it("should return a new array with mapped content", function() {
            const a = array_map([0, 1, 2, 3], function(n, i, a2) { return a2[i] + n; });
            expect(a).toEqual([0, 2, 4, 6]);
        });

        it("should freeze new array content", function() {
            const a = array_map([0, 1], function(v: number) { return {}; });
            expect(a[0]).toBeFrozen();
            expect(a[1]).toBeFrozen();
        });

        it("should deep freeze new array content", function() {
            const a = array_map([2, 3], function(v: number, i) { return {key: [i]}; });
            expect(a[0].key).toBeFrozen();
            expect(a[1].key).toBeFrozen();
        });
    });

    describe("array_filter", function() {
        it("should return a new frozen array", function() {
            const i = [0];
            const a = array_filter(i, function(v: number) { return false; });
            expect(a).toBeFrozen();
            expect(a).not.toBe(i);
        });

        it("should be a noop when empty", function() {
            const i: any[] = [];
            const a = array_filter(i, function(v: number) { return false; });
            expect(a).toBe(i);
        });

        it("should return a filtered array", function() {
            const a = array_filter([0, 1, 2, 3], function(n: number, i, a2) { return a2[i] === n && n % 2 === 0; });
            expect(a).toEqual([0, 2]);
        });
    });

    describe("writeValue", function() {
        it("should return a new frozen object", function() {
            const o = {p: 1};
            const o2 = writeValue(o, "p", 2);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(o2.p).toBe(2);
        });

        it("should create new nested frozen objects", function() {
            const o = {p: {p2: 1}};
            const o2 = writeValue(o, ["p", "p2"], 2);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(o2.p).not.toBe(o.p);
            expect(o2.p).toBeFrozen();
            expect(o2.p.p2).toBe(2);
        });

        it("should return a new frozen arrays", function() {
            const o = [0, 1];
            const o2 = writeValue(o, 1, 2);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(o2[1]).toBe(2);
        });

        it("should support numeric object keys", function() {
            const o = {0: {1: 1}};
            const o2 = writeValue(o, [0, 1], 2);
            expect(o2).not.toBe(o);
            expect(o2[0]).not.toBe(o[0]);
            expect(o2[0][1]).toBe(2);
        });

        it("should support stringified numeric object keys", function() {
            const o = {0: {1: 1}};
            const o2 = writeValue(o, ["0", "1"], 2);
            expect(o2).not.toBe(o);
            expect(o2[0]).not.toBe(o[0]);
            expect(o2[0][1]).toBe(2);
        });

        it("should write to the specified path", function() {
            const o = {
                f: {
                    s: {
                        t: {
                            p: 1
                        }
                    }
                }
            };

            const o2 = writeValue(o, ["f", "s", "t", "p"], 2);
            expect(o2.f.s.t.p).toBe(2);
        });

        it("should create a new instance of the written object and all parents", function() {
            const o = {
                f: {
                    s: {
                        t: {
                            p: 1
                        }
                    }
                }
            };

            const o2 = writeValue(o, ["f", "s", "t", "p"], 2);
            expect(o2).not.toBe(o);
            expect(o2.f).not.toBe(o.f);
            expect(o2.f.s).not.toBe(o.f.s);
            expect(o2.f.s.t).not.toBe(o.f.s.t);
            expect(o2.f.s.t.p).toBe(2);
        });

        it("should not create new instances of sibling objects", function() {
            const o = {
                f: {
                    s: {
                        t: {
                            p: 1,
                            ps: {}
                        },
                        ts: {}
                    },
                    ss: {}
                },
                fs: {}
            };

            const o2 = writeValue(o, ["f", "s", "t", "p"], 2);
            expect(o2).not.toBe(o);
            expect(o2.fs).toBe(o.fs);
            expect(o2.f.ss).toBe(o.f.ss);
            expect(o2.f.s.ts).toBe(o.f.s.ts);
            expect(o2.f.s.t.ps).toBe(o.f.s.t.ps);
            expect(o2.f.s.t.p).toBe(2);
        });

        it("should be a noop when setting an object value with no change", function() {
            const o = {f: {s: 2}};
            const o2 = writeValue(o, ["f", "s"], 2);
            expect(o2).toBe(o);
        });

        it("should be a noop when setting an array value with no change", function() {
            const o = {f: [0, 1, 2]};
            const o2 = writeValue(o, ["f", 1], 1);
            expect(o2).toBe(o);
        });

        it("should fail if the specified path does not exist", function() {
            expect(function() { writeValue({}, ["does", "not", "exist"], 1); }).toThrow();
        });

        it("should support mixed arrays/objects (root object)", function() {
            const o = {
                f: [{}, {
                    s: {
                        t: [1]
                    }
                }]
            };

            const o2 = writeValue(o, ["f", 1, "s", "t", 0], 2);
            expect(o2).not.toBe(o);
            expect(o2.f).not.toBe(o.f);
            expect(o2.f[0]).toBe(o.f[0]);
            expect(o2.f[1]).not.toBe(o.f[1]);
            expect((o2.f[1] as any).s.t).not.toBe((o.f[1] as any).s.t);
            expect((o2.f[1] as any).s.t[0]).toBe(2);
        });

        it("should support mixed arrays/objects (root array)", function() {
            const o = [{
                f: [{}, {
                    s: {
                        t: [1]
                    }
                }]
            }];

            const o2 = writeValue(o, [0, "f", 1, "s", "t", 0], 2);
            expect(o2).not.toBe(o);
            expect(o2[0]).not.toBe(o[0]);
            expect(o2[0].f).not.toBe(o[0].f);
            expect(o2[0].f[0]).toBe(o[0].f[0]);
            expect(o2[0].f[1]).not.toBe(o[0].f[1]);
            expect((o2[0].f[1] as any).s.t).not.toBe((o[0].f[1] as any).s.t);
            expect((o2[0].f[1] as any).s.t[0]).toBe(2);
        });

        it("should support writing functions as values", function() {
            const func = () => 2;
            const o = {f: <any>1};
            const o2 = writeValue(o, ["f"], func);
            expect(o2.f).toBe(func);
        });
    });

    describe("write", function() {
        it("should invoke the factory function to fetch the new value (single path key)", function() {
            const o = {p: 1};
            const o2 = write(o, "p", () => 2);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(o2.p).toBe(2);
        });

        it("should invoke the factory function to fetch the new value (multi path key)", function() {
            const o = {p: {p: 1}};
            const o2 = write(o, ["p", "p"], () => 2);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(o2.p.p).toBe(2);
        });

        it("should provide [old value, root object] as the factory args", function() {
            const o = {p: 1};
            const f = jasmine.createSpy("factory").and.returnValue(2);
            const o2 = write(o, ["p"], f);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(f).toHaveBeenCalledWith(1, o);
        });
    });

    describe("remove", function() {
        it("should return a new frozen object", function() {
            const o = {p: 1};
            const o2 = removeValue(o, "p");
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect("p" in o2).toBe(false);
        });

        it("should create new frozen nested objects", function() {
            const o = {p: {p2: 1}};
            const o2 = removeValue(o, ["p", "p2"]);
            expect(o2).not.toBe(o);
            expect(o2.p).not.toBe(o.p);
            expect(o2.p).toBeFrozen();
            expect("p2" in o2.p).toBe(false);
        });

        it("should return a new frozen arrays", function() {
            const o = [0, 1];
            const o2: ReadonlyArray<number> = removeValue(o, [1]);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(1 in o2).toBe(false);
        });

        it("should support readonly array inputs", function() {
            const o: ReadonlyArray<number> = imuter([0, 1]);
            const o2: ReadonlyArray<number> = removeValue(o, [1]);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(1 in o2).toBe(false);
        });

        it("should support readonly nested array inputs", function() {
            const o = imuter([imuter([0]), [1]]);
            const o2 = removeValue(o, [1]);
            expect(o2).not.toBe(o);
            expect(o2).toBeFrozen();
            expect(1 in o2).toBe(false);
        });

        it("should support numeric object keys", function() {
            const o = {0: {1: 1}};
            const o2 = removeValue(o, [0, 1]);
            expect(o2).not.toBe(o);
            expect(o2[0]).not.toBe(o[0]);
            expect(1 in o2[0]).toBe(false);
        });

        it("should support stringified numeric object keys", function() {
            const o = {0: {1: 1}};
            const o2 = removeValue(o, ["0", "1"]);
            expect(o2).not.toBe(o);
            expect(o2[0]).not.toBe(o[0]);
            expect(1 in o2[0]).toBe(false);
        });

        it("should write to the specified path", function() {
            const o = {
                f: {
                    s: {
                        t: {
                            p: 1
                        }
                    }
                }
            };

            const o2 = removeValue(o, ["f", "s", "t", "p"]);
            expect("p" in o2.f.s.t).toBe(false);
        });

        it("should create a new instance of the written object and all parents", function() {
            const o = {
                f: {
                    s: {
                        t: {
                            p: 1
                        }
                    }
                }
            };

            const o2 = removeValue(o, ["f", "s", "t", "p"]);
            expect(o2).not.toBe(o);
            expect(o2.f).not.toBe(o.f);
            expect(o2.f.s).not.toBe(o.f.s);
            expect(o2.f.s.t).not.toBe(o.f.s.t);
            expect("p" in o2.f.s.t).toBe(false);
        });

        it("should not create new instances of sibling objects", function() {
            const o = {
                f: {
                    s: {
                        t: {
                            p: 1,
                            ps: {}
                        },
                        ts: {}
                    },
                    ss: {}
                },
                fs: {}
            };

            const o2 = removeValue(o, ["f", "s", "t", "p"]);
            expect(o2).not.toBe(o);
            expect(o2.fs).toBe(o.fs);
            expect(o2.f.ss).toBe(o.f.ss);
            expect(o2.f.s.ts).toBe(o.f.s.ts);
            expect(o2.f.s.t.ps).toBe(o.f.s.t.ps);
            expect("p" in o2.f.s.t).toBe(false);
        });

        it("should be a noop when removing an object key that already does not exist", function() {
            const o = {f: {s: {}}};
            const o2 = removeValue(o, ["f", "s", "dne"]);
            expect(o2).toBe(o);
        });

        it("should be a noop when removing an array key that already does not exist", function() {
            const o = {f: {s: []}};

            const o2 = removeValue(o, ["f", "s", 0]);
            expect(o2).toBe(o);

            const o3 = removeValue(o, ["f", "s", 10]);
            expect(o3).toBe(o);
        });

        it("should fail if the specified path does not exist", function() {
            expect(function() { removeValue({}, ["does", "not", "exist"]); }).toThrow();
        });

        it("should support mixed arrays/objects (root object)", function() {
            const o = {
                f: [{}, {
                    s: {
                        t: [1]
                    }
                }]
            };

            const o2 = removeValue(o, ["f", 1, "s", "t", 0]);
            expect(o2).not.toBe(o);
            expect(o2.f).not.toBe(o.f);
            expect(o2.f[0]).toBe(o.f[0]);
            expect(o2.f[1]).not.toBe(o.f[1]);
            expect((o2.f[1] as any).s.t).not.toBe((o.f[1] as any).s.t);
            expect(0 in (o2.f[1] as any).s.t).toBe(false);
        });

        it("should support mixed arrays/objects (root array)", function() {
            const o = [{
                f: [{}, {
                    s: {
                        t: [1]
                    }
                }]
            }];

            const o2 = removeValue(o, [0, "f", 1, "s", "t", 0]);
            expect(o2).not.toBe(o);
            expect(o2[0]).not.toBe(o[0]);
            expect(o2[0].f).not.toBe(o[0].f);
            expect(o2[0].f[0]).toBe(o[0].f[0]);
            expect(o2[0].f[1]).not.toBe(o[0].f[1]);
            expect((o2[0].f[1] as any).s.t).not.toBe((o[0].f[1] as any).s.t);
            expect(0 in (o2[0].f[1] as any).s.t).toBe(false);
        });
    });
});