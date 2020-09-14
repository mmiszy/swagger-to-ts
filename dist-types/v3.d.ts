import { OpenAPI3, SwaggerToTSOptions } from "./types";
export declare const PRIMITIVES: {
    [key: string]: "boolean" | "string" | "number";
};
export default function generateTypesV3(schema: OpenAPI3, options?: SwaggerToTSOptions): string;
