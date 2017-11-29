"use strict";

//Should be determined at compile time to allow tree-shaking
const FREEZING_ENABLED = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

const NO_FREEZE_MSG = "Freezing a Window, global, Node, Blob, TypedArray or ArrayBuffer is unsupported";

const toString = {}.toString;


export type ReadonlyArrayInput<T> = ReadonlyArray<T> | T[];
export type ReadonlyObjectInput<T> = Readonly<T> | T;

export function recursiveFreeze(value: number): number;
export function recursiveFreeze(value: string): string;
export function recursiveFreeze(value: boolean): boolean;
export function recursiveFreeze(value: symbol): symbol;
export function recursiveFreeze(value: null): null;
export function recursiveFreeze(value: undefined): undefined;
export function recursiveFreeze<T = number | string | boolean | symbol | null | undefined>(value: ReadonlyArray<T> | T[]): ReadonlyArray<T>;
export function recursiveFreeze<T>(value: ReadonlyArrayInput<T>): ReadonlyArray<Readonly<T>>;
export function recursiveFreeze<T>(value: ReadonlyObjectInput<T>): Readonly<T>;
export function recursiveFreeze(value: any): any {
    //Primitives
    switch (typeof value) {
        case "number":
        case "string":
        case "boolean":
        case "symbol":
        case "undefined":
            return value;
    }

    //Already frozen or already immutable, assume it was deep frozen
    if (Object.isFrozen(value)) {
        return value;
    }

    //Unfreezable
    if (+(<any>value).nodeType) {
        throw new Error(NO_FREEZE_MSG);
    }

    switch (toString.call(value)) {
        //Unfreezable types
        case "[object Int8Array]":
        case "[object Int16Array]":
        case "[object Int32Array]":
        case "[object Float32Array]":
        case "[object Float64Array]":
        case "[object Uint8Array]":
        case "[object Uint8ClampedArray]":
        case "[object Uint16Array]":
        case "[object Uint32Array]":
        case "[object ArrayBuffer]":
        case "[object Blob]":
        case "[object DOMWindow]":
        case "[object Window]":
        case "[object global]":
            throw new Error(NO_FREEZE_MSG);

        //No need to recurse
        case "[object Boolean]":
        case "[object Number]":
        case "[object String]":
        case "[object Date]":
        case "[object RegExp]":
            return Object.freeze(value);
    }

    //Freeze before recursing in case of recursive references
    Object.freeze(value);

    if (Array.isArray(value)) {
        for (const entry of value) {
            recursiveFreeze(entry);
        }
    }
    else {
        for (const key in value) {
            recursiveFreeze(value[key]);
        }
    }

    return value;
}


function identity<T>(o: T): T { return o; }
function valueFn<T>(v: T): () => T { return function() { return v; }; }

//The signature of recursiveFreeze is nicer then Object.freeze so use that
export type Freezer = typeof recursiveFreeze;

const shallowFreeze: Freezer = FREEZING_ENABLED ? Object.freeze   : identity;
const deepFreeze: Freezer    = FREEZING_ENABLED ? recursiveFreeze : identity;

export const imuter = deepFreeze;


const DELETE_VALUE: any = Object.freeze({});
const REMOVE_VALUE: any = Object.freeze({});

// Objects

export function object_set<K extends keyof T, T = any>(obj: ReadonlyObjectInput<T> | T, prop: K, value: T[K]): Readonly<T> {
    if ((value === DELETE_VALUE || value === REMOVE_VALUE) ? !(prop in <any>obj) : obj[prop] === value) {
        return obj;
    }

    const newObj: T = Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);

    if (value === DELETE_VALUE || value === REMOVE_VALUE) {
        delete newObj[prop];
    }
    else {
        newObj[prop] = <any>deepFreeze(value);
    }

    return shallowFreeze(newObj);
}

export function object_delete<T>(obj: ReadonlyObjectInput<T>, prop: keyof T): Readonly<T> {
    return object_set(obj, prop, DELETE_VALUE);
}

//Shallow merge like Object.assign, always into a plain JSON object
export function object_assign<T, U>(a: T, b: U): Readonly<T & U>;
export function object_assign<T, U, V>(a: T, b: U, c: V): Readonly<T & U & V>;
export function object_assign<T, U, V, W>(a: T, b: U, c: V, d: W): Readonly<T & U & V & W>;
export function object_assign(...sources: any[]): Readonly<any> {
    return deepFreeze(Object.assign({}, ...sources));
}


// Arrays

export function array_set<T = any>(arr: ReadonlyArrayInput<T>, index: number, value: T): ReadonlyArray<T> {
    if ((value === DELETE_VALUE || value === REMOVE_VALUE) ? !(index in arr) : arr[index] === value) {
        return arr;
    }

    const newArr = arr.slice();
    if (value === DELETE_VALUE) {
        delete newArr[index];
    }
    else if (value === REMOVE_VALUE) {
        newArr.splice(index, 1);
    }
    else {
        newArr[index] = deepFreeze(value);
    }
    return shallowFreeze(newArr);
}

export function array_delete<T = any>(arr: ReadonlyArrayInput<T>, index: number): ReadonlyArray<T> {
    return array_set<T>(arr, index, DELETE_VALUE);
}

export function array_remove<T = any>(arr: ReadonlyArrayInput<T>, index: number, deleteCount: number = 1): ReadonlyArray<T> {
    if (arr.length <= index || deleteCount === 0) {
        return arr;
    }

    const newArr = arr.slice();
    newArr.splice(index, deleteCount);
    return shallowFreeze(newArr);
}

export function array_exclude<T = any>(arr: ReadonlyArrayInput<T>, value: T): ReadonlyArray<T> {
    return array_filter(arr, (v) => v !== value);
}

export function array_replace<T = any>(arr: ReadonlyArrayInput<T>, oldValue: T, newValue: T): ReadonlyArray<T> {
    deepFreeze(newValue);

    return array_map(arr, (v) => v === oldValue ? newValue : v);
}

export function array_push<T = any>(arr: ReadonlyArrayInput<T>, ...values: T[]): ReadonlyArray<T> {
    deepFreeze(values);

    const newArr = arr.slice();
    newArr.push(...values);
    return shallowFreeze(newArr);
}

export function array_shift<T = any>(arr: ReadonlyArrayInput<T>): ReadonlyArray<T> {
    if (arr.length === 0) {
        return arr;
    }

    const newArr = arr.slice();
    newArr.shift();
    return shallowFreeze(newArr);
}

export function array_pop<T = any>(arr: ReadonlyArrayInput<T>): ReadonlyArray<T> {
    if (arr.length === 0) {
        return arr;
    }

    const newArr = arr.slice();
    newArr.pop();
    return shallowFreeze(newArr);
}

export function array_unshift<T = any>(arr: ReadonlyArrayInput<T>, ...values: T[]): ReadonlyArray<T> {
    deepFreeze(values);

    const newArr = arr.slice();
    newArr.unshift(...values);
    return shallowFreeze(newArr);
}

export function array_slice<T = any>(arr: ReadonlyArrayInput<T>, start: number, end?: number) {
    return shallowFreeze(arr.slice(start, end));
}

export function array_insert<T = any>(arr: ReadonlyArrayInput<T>, index: number, ...values: T[]): ReadonlyArray<T> {
    deepFreeze(values);

    const newArr = arr.slice();
    newArr.splice(index, 0, ...values);
    return shallowFreeze(newArr);
}

export function array_map<T = any, U = any>(arr: ReadonlyArrayInput<T>, callbackfn: (value: T, index: number, array: ReadonlyArray<T>) => U, context?: any): ReadonlyArray<U> {
    if (arr.length === 0) {
        return <any>arr;
    }

    const mapped: U[] = (arr as ReadonlyArray<T>).map(callbackfn, context);
    return deepFreeze(mapped);
}

export function array_filter<T = any>(arr: ReadonlyArrayInput<T>, callbackfn: (value: T, index: number, array: ReadonlyArray<T>) => any, context?: any): ReadonlyArray<T> {
    if (arr.length === 0) {
        return arr;
    }

    const filtered = (arr as ReadonlyArray<T>).filter(callbackfn, context);
    return shallowFreeze(filtered);
}


//Write a deep value via a factory function
export function write<T = any>(data: ReadonlyArrayInput<T>, path: number | [number], factory: (oldValue: T, data: ReadonlyArray<T>) => T): ReadonlyArray<T>;
export function write<K1 extends keyof T, T = any>(data: ReadonlyArrayInput<T>, path: [number, K1], factory: (oldValue: T[K1], data: ReadonlyArray<T>) => T[K1]): ReadonlyArray<T>;
export function write<K1 extends keyof T, K2 extends keyof T[K1], T = any>(data: ReadonlyArrayInput<T>, path: [number, K1, K2], factory: (oldValue: T[K1][K2], data: ReadonlyArray<T>) => T[K1][K2]): ReadonlyArray<T>;
export function write<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2], T = any>(data: ReadonlyArrayInput<T>, path: [number, K1, K2, K3], factory: (oldValue: T[K1][K2][K3], data: ReadonlyArray<T>) => T[K1][K2][K3]): ReadonlyArray<T>;
export function write<K1 extends keyof T, T = any>(data: ReadonlyObjectInput<T>, path: K1 | [K1], factory: (oldValue: T[K1], data: Readonly<T>) => T[K1]): Readonly<T>;
export function write<K1 extends keyof T, K2 extends keyof T[K1], T = any>(data: ReadonlyObjectInput<T>, path: [K1, K2], factory: (oldValue: T[K1][K2], data: Readonly<T>) => T[K1][K2]): Readonly<T>;
export function write<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2], T = any>(data: ReadonlyObjectInput<T>, path: [K1, K2, K3], factory: (oldValue: T[K1][K2][K3], data: Readonly<T>) => T[K1][K2][K3]): Readonly<T>;
export function write<T = any>(data: T, pathOrKey: Array<string | number> | number | keyof T, factory: Function) {
    const path = Array.isArray(pathOrKey) ? pathOrKey : [pathOrKey];

    //Follow the path into the object, except for the last value being replaced
    const objs: any[] = [data];
    for (let i = 0; i < path.length; i++) {
        objs.push( objs[i][path[i]] );
    }

    //Replace the last object with the new value
    objs[objs.length - 1] = factory(objs[objs.length - 1], data);

    //Write the new immutable data back into the objects
    for (let i = objs.length - 2; i >= 0; i--) {
        const key = path[i];
        const obj = objs[i];
        const val = objs[i + 1];

        if (Array.isArray(obj)) {
            objs[i] = array_set(obj, <number>key, val);
        }
        else {
            objs[i] = object_set(obj, <string>key, val);
        }
    }

    return objs[0];
}

//Write a deep value
export function writeValue<T = any>(data: ReadonlyArrayInput<T>, path: number | [number], value: T): ReadonlyArray<T>;
export function writeValue<K1 extends keyof T, T = any>(data: ReadonlyArrayInput<T>, path: [number, K1], value: T[K1]): ReadonlyArray<T>;
export function writeValue<K1 extends keyof T, K2 extends keyof T[K1], T = any>(data: ReadonlyArrayInput<T>, path: [number, K1, K2], value: T[K1][K2]): ReadonlyArray<T>;
export function writeValue<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2], T = any>(data: ReadonlyArrayInput<T>, path: [number, K1, K2, K3], value: T[K1][K2][K3]): ReadonlyArray<T>;
export function writeValue<T = any>(data: ReadonlyArrayInput<T>, path: Array<string | number>, value: any): ReadonlyArray<T>;
export function writeValue<K1 extends keyof T, T = any>(data: ReadonlyObjectInput<T>, path: K1 | [K1], value: T[K1]): Readonly<T>;
export function writeValue<K1 extends keyof T, K2 extends keyof T[K1], T = any>(data: ReadonlyObjectInput<T>, path: [K1, K2], value: T[K1][K2]): Readonly<T>;
export function writeValue<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2], T = any>(data: ReadonlyObjectInput<T>, path: [K1, K2, K3], value: T[K1][K2][K3]): Readonly<T>;
export function writeValue<T = any>(data: ReadonlyObjectInput<T>, path: Array<string | number>, value: any): Readonly<T>;
export function writeValue<T = any>(data: T, path: Array<string | number> | number | keyof T, value: any): any {
    return write<any>(data, path, valueFn(value));
}

//Delete a deep value
export function removeValue<K1 extends keyof T, T = any>(data: ReadonlyArrayInput<T>, path: [number, K1]): ReadonlyArray<T>;
export function removeValue<K1 extends keyof T, K2 extends keyof T[K1], T = any>(data: ReadonlyArrayInput<T>, path: [number, K1, K2]): ReadonlyArray<T>;
export function removeValue<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2], T = any>(data: ReadonlyArrayInput<T>, path: [number, K1, K2, K3]): ReadonlyArray<T>;
export function removeValue<T = any>(data: ReadonlyArrayInput<T>, path: Array<string | number> | number | string): ReadonlyArray<T>;
export function removeValue<K1 extends keyof T, T = any>(data: ReadonlyObjectInput<T>, path: K1 | [K1]): Readonly<T>;
export function removeValue<K1 extends keyof T, K2 extends keyof T[K1], T = any>(data: ReadonlyObjectInput<T>, path: [K1, K2]): Readonly<T>;
export function removeValue<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2], T = any>(data: ReadonlyObjectInput<T>, path: [K1, K2, K3]): Readonly<T>;
export function removeValue<T = any>(data: ReadonlyObjectInput<T>, path: Array<string | number>): Readonly<T>;
export function removeValue<T = any>(data: T, path: Array<string | number> | number | keyof T) {
    return write<any>(data, path, valueFn(REMOVE_VALUE));
}