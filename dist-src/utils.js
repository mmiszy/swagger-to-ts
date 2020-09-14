export function comment(text) {
    return `/**
  * ${text.trim().replace("\n+$", "").replace(/\n/g, "\n  * ")}
  */
`;
}
export function fromEntries(entries) {
    return entries.reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
}
export function nodeType(obj) {
    if (!obj || typeof obj !== "object") {
        return undefined;
    }
    if (obj["$ref"]) {
        return "ref";
    }
    if (Array.isArray(obj.enum)) {
        return "enum";
    }
    if (obj.type === "boolean") {
        return "boolean";
    }
    if (["binary", "byte", "date", "dateTime", "password", "string"].includes(obj.type)) {
        return "string";
    }
    if (["double", "float", "integer", "number"].includes(obj.type)) {
        return "number";
    }
    if (Array.isArray(obj.anyOf)) {
        return "anyOf";
    }
    if (Array.isArray(obj.oneOf)) {
        return "oneOf";
    }
    if (obj.type === "array" || obj.items) {
        return "array";
    }
    return "object";
}
export function swaggerVersion(definition) {
    const { openapi } = definition;
    if (openapi && parseInt(openapi, 10) === 3) {
        return 3;
    }
    const { swagger } = definition;
    if (swagger && parseInt(swagger, 10) === 2) {
        return 2;
    }
    throw new Error(`🚏 version missing from schema; specify whether this is OpenAPI v3 or v2 https://swagger.io/specification`);
}
export function transformRef(ref) {
    const parts = ref.replace(/^#\//, "").split("/");
    return `${parts[0]}["${parts.slice(1).join('"]["')}"]`;
}
export function tsArrayOf(type) {
    return `(${type})[]`;
}
export function tsIntersectionOf(types) {
    return `(${types.join(") & (")})`;
}
export function tsPartial(type) {
    return `Partial<${type}>`;
}
export function tsUnionOf(types) {
    return `(${types.join(") | (")})`;
}
