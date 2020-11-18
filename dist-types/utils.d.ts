import { OpenAPI2, OpenAPI3 } from "./types";
export declare function comment(text: string): string;
export declare function fromEntries(entries: [string, any][]): object;
declare type SchemaObjectType = "anyOf" | "array" | "boolean" | "enum" | "number" | "object" | "oneOf" | "ref" | "string" | "file" | "x-alternatives";
export declare function nodeType(obj: any): SchemaObjectType | undefined;
export declare function swaggerVersion(definition: OpenAPI2 | OpenAPI3): 2 | 3;
export declare function transformRef(ref: string): string;
export declare function tsArrayOf(type: string): string;
export declare function tsIntersectionOf(types: string[]): string;
export declare function tsPartial(type: string): string;
export declare function tsUnionOf(types: string[]): string;
export {};
