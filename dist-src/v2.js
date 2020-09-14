import propertyMapper from "./property-mapper";
import { comment, nodeType, transformRef, tsArrayOf, tsIntersectionOf, tsUnionOf, } from "./utils";
export const PRIMITIVES = {
    boolean: "boolean",
    binary: "string",
    byte: "string",
    date: "string",
    dateTime: "string",
    password: "string",
    string: "string",
    double: "number",
    float: "number",
    integer: "number",
    number: "number",
};
export default function generateTypesV2(schema, options) {
    if (!schema.definitions) {
        throw new Error(`⛔️ 'definitions' missing from schema https://swagger.io/specification/v2/#definitions-object`);
    }
    const propertyMapped = options
        ? propertyMapper(schema.definitions, options.propertyMapper)
        : schema.definitions;
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
            case "object": {
                if ((!node.properties || !Object.keys(node.properties).length) &&
                    !node.allOf &&
                    !node.additionalProperties) {
                    return `{ [key: string]: any }`;
                }
                let properties = definitionsToTypes(node.properties || {}, node.required);
                if (node.additionalProperties) {
                    properties += `[key: string]: ${nodeType(node.additionalProperties) || "any"};\n`;
                }
                return tsIntersectionOf([
                    ...(node.allOf ? node.allOf.map(transform) : []),
                    ...(properties ? [`{ ${properties} }`] : []),
                ]);
                break;
            }
            case "array": {
                return tsArrayOf(transform(node.items));
            }
        }
        return "";
    }
    function definitionsToTypes(obj, required = []) {
        if (!obj) {
            return "";
        }
        let output = "";
        Object.entries(obj).forEach(([key, value]) => {
            if (value.description) {
                output += comment(value.description);
            }
            output += `"${key}"${!required || !required.includes(key) ? "?" : ""}: `;
            output += transform(value);
            output += ";\n";
        });
        return output;
    }
    function capitalize(str) {
        return String(str).replace(/^\w/, (l) => l.toUpperCase());
    }
    function pathToTypeName(str) {
        return capitalize(str
            .replace(/[\/\-{](\w)/g, (_, letter) => letter.toUpperCase())
            .replace(/\W/g, ""));
    }
    function pathsToTypes(obj) {
        if (!obj) {
            return "";
        }
        let output = "";
        let outputPerPath = "";
        Object.entries(obj).forEach(([path, pathItemObject]) => {
            outputPerPath += `'${path}': {`;
            Object.entries(pathItemObject).forEach(([key, operationObject]) => {
                const method = key;
                const endpointName = method + pathToTypeName(path);
                outputPerPath += `${method.toUpperCase()}: {`;
                if (operationObject.parameters) {
                    const groupedParameters = Object.values(operationObject.parameters).reduce((params, parameterObject) => {
                        if (parameterObject.in === "body") {
                            params[parameterObject.in] = parameterObject;
                        }
                        else {
                            const newValue = params[parameterObject.in] || {};
                            newValue[parameterObject.name] = parameterObject;
                            params[parameterObject.in] = newValue;
                        }
                        return params;
                    }, {});
                    Object.entries(groupedParameters).forEach(([key, paramGroup]) => {
                        if (!paramGroup) {
                            return;
                        }
                        const paramGroupName = key;
                        const groupNameToTypeName = {
                            body: "Body",
                            query: "Query",
                            header: "Headers",
                            formData: "FormData",
                            path: "PathParams",
                        };
                        if (paramGroupName === "body") {
                            output += `${endpointName}Request${groupNameToTypeName[paramGroupName]}: `;
                            outputPerPath += `request${groupNameToTypeName[paramGroupName]}: `;
                            output += transform(paramGroup.schema);
                            outputPerPath += transform(paramGroup.schema);
                            output += ";\n";
                            outputPerPath += ";\n";
                        }
                        else {
                            output += `${endpointName}Request${groupNameToTypeName[paramGroupName]}: `;
                            outputPerPath += `request${groupNameToTypeName[paramGroupName]}: `;
                            output += "{\n";
                            outputPerPath += "{\n";
                            Object.entries(paramGroup).forEach(([, schema]) => {
                                const parameterObject = schema;
                                output += `"${parameterObject.name}"${!parameterObject.required ? "?" : ""}: `;
                                outputPerPath += `"${parameterObject.name}"${!parameterObject.required ? "?" : ""}: `;
                                output += transform(parameterObject);
                                outputPerPath += transform(parameterObject);
                                output += ";\n";
                                outputPerPath += ";\n";
                            });
                            output += "};\n";
                            outputPerPath += "};\n";
                        }
                    });
                }
                Object.entries(operationObject.responses).forEach(([key, responseObject]) => {
                    if (!responseObject) {
                        return;
                    }
                    if ("$ref" in responseObject) {
                        return;
                    }
                    if (!responseObject.schema) {
                        return;
                    }
                    const responseType = key;
                    output += "\n";
                    outputPerPath += "\n";
                    let descriptionAndSummary = "";
                    if (operationObject.description) {
                        descriptionAndSummary += `@description ${operationObject.description}`;
                    }
                    if (operationObject.summary) {
                        const responseDescription = responseObject.description || "";
                        if (descriptionAndSummary) {
                            descriptionAndSummary += "\n";
                        }
                        descriptionAndSummary += `@summary ${operationObject.summary} ${responseType} ${responseDescription} response`;
                    }
                    if (descriptionAndSummary) {
                        output += comment(descriptionAndSummary);
                        outputPerPath += comment(descriptionAndSummary);
                    }
                    output += `${endpointName}${capitalize(responseType)}Response: `;
                    outputPerPath += `response: `;
                    output += transform(responseObject.schema);
                    outputPerPath += transform(responseObject.schema);
                    output += ";\n";
                    outputPerPath += ";\n";
                });
                outputPerPath += `};`;
            });
            outputPerPath += `};`;
        });
        return output + "\n" + `pathsDefinitions: { ${outputPerPath} }`;
    }
    return `export interface definitions {
    ${definitionsToTypes(propertyMapped, Object.keys(propertyMapped))}
    ${pathsToTypes(schema.paths)}
  }`;
}
