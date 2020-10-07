import propertyMapper from "./property-mapper";
import { OpenAPI2, OpenAPI2SchemaObject, SwaggerToTSOptions } from "./types";
import { OpenAPI2ParameterObject, OpenAPI2Reference } from "./types/OpenAPI2";
import {
  comment,
  nodeType,
  transformRef,
  tsArrayOf,
  tsIntersectionOf,
  tsUnionOf,
} from "./utils";

export const PRIMITIVES: { [key: string]: "boolean" | "string" | "number" } = {
  // boolean types
  boolean: "boolean",

  // string types
  binary: "string",
  byte: "string",
  date: "string",
  dateTime: "string",
  password: "string",
  string: "string",

  // number types
  double: "number",
  float: "number",
  integer: "number",
  number: "number",
};

export default function generateTypesV2(
  schema: OpenAPI2,
  options?: SwaggerToTSOptions
): string {
  if (!schema.definitions) {
    throw new Error(
      `⛔️ 'definitions' missing from schema https://swagger.io/specification/v2/#definitions-object`
    );
  }

  // propertyMapper
  const propertyMapped = options
    ? propertyMapper(schema.definitions, options.propertyMapper)
    : schema.definitions;

  // type conversions
  function transform(node: OpenAPI2SchemaObject): string {
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
        return tsUnionOf((node.enum as string[]).map((item) => `'${item}'`));
      }
      case "object": {
        if (
          (!node.properties || !Object.keys(node.properties).length) &&
          !node.allOf &&
          !node.additionalProperties
        ) {
          return `{ [key: string]: any }`;
        }

        let properties = definitionsToTypes(
          node.properties || {},
          node.required
        );

        // if additional properties, add to end of properties
        if (node.additionalProperties) {
          properties += `[key: string]: ${
            nodeType(node.additionalProperties) || "any"
          };\n`;
        }

        return tsIntersectionOf([
          ...(node.allOf ? (node.allOf as any[]).map(transform) : []), // append allOf first
          ...(properties ? [`{ ${properties} }`] : []), // then properties + additionalProperties
        ]);
        break;
      }
      case "array": {
        return tsArrayOf(transform(node.items as any));
      }
      case "x-alternatives": {
        return tsUnionOf(node["x-alternatives"]?.map(transform) || []);
      }
    }

    return "";
  }

  function definitionsToTypes(
    obj: OpenAPI2["definitions"],
    required: string[] = []
  ): string {
    if (!obj) {
      return "";
    }

    let output = "";

    Object.entries(obj).forEach(([key, value]) => {
      // 1. JSDoc comment (goes above property)
      if (value.description) {
        output += comment(value.description);
      }

      // 2. name (with “?” if optional property)
      output += `"${key}"${!required || !required.includes(key) ? "?" : ""}: `;

      // 3. get value
      output += transform(value);

      // 4. close type
      output += ";\n";
    });

    return output;
  }

  function capitalize(str: string | number): string {
    return String(str).replace(/^\w/, (l) => l.toUpperCase());
  }

  function pathToTypeName(str: string): string {
    return capitalize(
      str
        // get rid of slashes, dashes and opening braces
        .replace(/[\/\-{](\w)/g, (_, letter) => letter.toUpperCase())
        // remove all non-alpha characters
        .replace(/\W/g, "")
    );
  }

  function pathsToTypes(obj: OpenAPI2["paths"]): string {
    if (!obj) {
      return "";
    }

    let output = "";
    let outputPerPath = "";

    Object.entries(obj).forEach(([path, pathItemObject]) => {
      outputPerPath += `'${path}': {`;
      Object.entries(pathItemObject).forEach(([key, operationObject]) => {
        const method = key as keyof typeof pathItemObject;
        const endpointName = method + pathToTypeName(path);
        // const endpointName = operationObject.operationId;

        outputPerPath += `${method.toUpperCase()}: {`;

        type OtherTypesOfParams = Exclude<
          OpenAPI2ParameterObject["in"],
          "body"
        >;
        type GroupedParams = {
          body?: {
            required?: boolean;
            schema: OpenAPI2SchemaObject | OpenAPI2Reference;
          };
        } & {
          [key in OtherTypesOfParams]?: {
            [k: string]: OpenAPI2ParameterObject;
          };
        };

        if (operationObject.parameters) {
          const groupedParameters = Object.values(
            operationObject.parameters
          ).reduce<GroupedParams>((params, parameterObject) => {
            if (parameterObject.in === "body") {
              params[parameterObject.in] = parameterObject;
            } else {
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

            const paramGroupName = key as keyof typeof groupedParameters;
            const groupNameToTypeName: Record<typeof paramGroupName, string> = {
              body: "Body",
              query: "Query",
              header: "Headers",
              formData: "FormData",
              path: "PathParams",
            };

            if (paramGroupName === "body") {
              output += `${endpointName}Request${groupNameToTypeName[paramGroupName]}: `;
              outputPerPath += `request${groupNameToTypeName[paramGroupName]}: `;
              output += transform(paramGroup.schema as any);
              outputPerPath += transform(paramGroup.schema as any);
              output += ";\n";
              outputPerPath += ";\n";
            } else {
              output += `${endpointName}Request${groupNameToTypeName[paramGroupName]}: `;
              outputPerPath += `request${groupNameToTypeName[paramGroupName]}: `;
              output += "{\n";
              outputPerPath += "{\n";
              Object.entries(paramGroup).forEach(([, schema]) => {
                const parameterObject = schema as OpenAPI2ParameterObject;

                output += `"${parameterObject.name}"${
                  !parameterObject.required ? "?" : ""
                }: `;
                outputPerPath += `"${parameterObject.name}"${
                  !parameterObject.required ? "?" : ""
                }: `;
                output += transform(parameterObject as any);
                outputPerPath += transform(parameterObject as any);
                output += ";\n";
                outputPerPath += ";\n";
              });
              output += "};\n";
              outputPerPath += "};\n";
            }
          });
        }

        Object.entries(operationObject.responses).forEach(
          ([key, responseObject]) => {
            if (!responseObject) {
              return;
            }

            // @todo refs?
            if ("$ref" in responseObject) {
              return;
            }

            // Some tools generate responses without schemas, nothing to do here
            if (!responseObject.schema) {
              return;
            }

            const responseType = key as keyof typeof operationObject.responses;

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
          }
        );
        outputPerPath += `};`;
      });
      outputPerPath += `};`;
    });

    return output + "\n" + `pathsDefinitions: { ${outputPerPath} }`;
  }

  // note: make sure that base-level definitions are required
  return `export interface definitions {
    ${definitionsToTypes(propertyMapped, Object.keys(propertyMapped))}
    ${pathsToTypes(schema.paths)}
  }`;
}
