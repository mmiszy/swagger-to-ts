import propertyMapper from "./property-mapper";
import { comment, nodeType, transformRef, tsArrayOf, tsIntersectionOf, tsPartial, tsUnionOf, } from "./utils";
export const PRIMITIVES = {
    boolean: "boolean",
    string: "string",
    integer: "number",
    number: "number",
};
export default function generateTypesV3(schema, options) {
    if (!schema.components || !schema.components.schemas) {
        throw new Error(`⛔️ 'components' missing from schema https://swagger.io/specification`);
    }
    const propertyMapped = options
        ? propertyMapper(schema.components.schemas, options.propertyMapper)
        : schema.components.schemas;
    function transform(node) {
        switch (nodeType(node)) {
            case "ref": {
                return transformRef(node.$ref);
            }
            case "string":
            case "number":
            case "boolean": {
                return nodeType(node) || "any";
            }
            case "enum": {
                return tsUnionOf(node.enum.map((item) => `'${item}'`));
            }
            case "oneOf": {
                return tsUnionOf(node.oneOf.map(transform));
            }
            case "anyOf": {
                return tsIntersectionOf(node.anyOf.map((anyOf) => tsPartial(transform(anyOf))));
            }
            case "object": {
                if ((!node.properties || !Object.keys(node.properties).length) &&
                    !node.allOf &&
                    !node.additionalProperties) {
                    return `{ [key: string]: any }`;
                }
                let properties = createKeys(node.properties || {}, node.required);
                if (node.additionalProperties) {
                    properties += `[key: string]: ${nodeType(node.additionalProperties) || "any"};\n`;
                }
                return tsIntersectionOf([
                    ...(node.allOf ? node.allOf.map(transform) : []),
                    ...(properties ? [`{ ${properties} }`] : []),
                ]);
            }
            case "array": {
                return tsArrayOf(transform(node.items));
            }
        }
        return "";
    }
    function createKeys(obj, required) {
        let output = "";
        Object.entries(obj).forEach(([key, value]) => {
            if (value.description) {
                output += comment(value.description);
            }
            output += `"${key}"${!required || !required.includes(key) ? "?" : ""}: `;
            if (value.nullable) {
                output += "(";
            }
            output += transform(value);
            if (value.nullable) {
                output += ") | null";
            }
            output += ";\n";
        });
        return output;
    }
    const schemas = `schemas: {
    ${createKeys(propertyMapped, Object.keys(propertyMapped))}
  }`;
    const responses = !schema.components.responses
        ? ``
        : `responses: {
    ${createKeys(schema.components.responses, Object.keys(schema.components.responses))}
  }`;
    return `export interface components {
    ${schemas}
    ${responses}
  }`;
}
