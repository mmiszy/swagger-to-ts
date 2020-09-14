import { OpenAPI2, SwaggerToTSOptions } from "./types";
export declare const PRIMITIVES: {
    [key: string]: "boolean" | "string" | "number";
};
export default function generateTypesV2(schema: OpenAPI2, options?: SwaggerToTSOptions): string;
