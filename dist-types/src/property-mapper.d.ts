import { SwaggerToTSOptions } from "./types";
export default function propertyMapper<T = any>(schema: T, transform: SwaggerToTSOptions["propertyMapper"]): T;
