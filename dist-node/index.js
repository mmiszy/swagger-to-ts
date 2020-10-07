'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var prettier = _interopDefault(require('prettier'));

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function comment(text) {
  return `/**
  * ${text.trim().replace("\n+$", "").replace(/\n/g, "\n  * ")}
  */
`;
}
function fromEntries(entries) {
  return entries.reduce((obj, [key, val]) => _objectSpread2({}, obj, {
    [key]: val
  }), {});
}
function nodeType(obj) {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  if (Array.isArray(obj["x-alternatives"])) {
    return "x-alternatives";
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
function swaggerVersion(definition) {
  const {
    openapi
  } = definition;

  if (openapi && parseInt(openapi, 10) === 3) {
    return 3;
  }

  const {
    swagger
  } = definition;

  if (swagger && parseInt(swagger, 10) === 2) {
    return 2;
  }

  throw new Error(`🚏 version missing from schema; specify whether this is OpenAPI v3 or v2 https://swagger.io/specification`);
}
function transformRef(ref) {
  const parts = ref.replace(/^#\//, "").split("/");
  return `${parts[0]}["${parts.slice(1).join('"]["')}"]`;
}
function tsArrayOf(type) {
  return `(${type})[]`;
}
function tsIntersectionOf(types) {
  return `(${types.join(") & (")})`;
}
function tsPartial(type) {
  return `Partial<${type}>`;
}
function tsUnionOf(types) {
  return `(${types.join(") | (")})`;
}

function propertyMapper(schema, transform) {
  if (!transform) {
    return schema;
  }

  return JSON.parse(JSON.stringify(schema), (_, node) => {
    if (!node.properties) {
      return node;
    }

    node.properties = fromEntries(Object.entries(node.properties).map(([key, val]) => {
      if (val.$ref) {
        return [key, val];
      }

      const schemaObject = val;
      const property = transform(schemaObject, {
        interfaceType: schemaObject.type,
        optional: !Array.isArray(node.required) || node.required.includes(key),
        description: schemaObject.description
      });

      if (property.optional) {
        if (Array.isArray(node.required)) {
          node.required = node.required.filter(r => r !== key);
        }
      } else {
        node.required = [...(node.required || []), key];
      }

      return [key, _objectSpread2({}, val, {
        type: property.interfaceType,
        description: property.description
      })];
    }));
    return node;
  });
}

function generateTypesV2(schema, options) {
  if (!schema.definitions) {
    throw new Error(`⛔️ 'definitions' missing from schema https://swagger.io/specification/v2/#definitions-object`);
  }

  const propertyMapped = options ? propertyMapper(schema.definitions, options.propertyMapper) : schema.definitions;

  function transform(node) {
    switch (nodeType(node)) {
      case "ref":
        {
          return transformRef(node.$ref);
        }

      case "string":
      case "number":
      case "boolean":
        {
          return nodeType(node) || "any";
        }

      case "enum":
        {
          return tsUnionOf(node.enum.map(item => `'${item}'`));
        }

      case "object":
        {
          if ((!node.properties || !Object.keys(node.properties).length) && !node.allOf && !node.additionalProperties) {
            return `{ [key: string]: any }`;
          }

          let properties = definitionsToTypes(node.properties || {}, node.required);

          if (node.additionalProperties) {
            properties += `[key: string]: ${nodeType(node.additionalProperties) || "any"};\n`;
          }

          return tsIntersectionOf([...(node.allOf ? node.allOf.map(transform) : []), ...(properties ? [`{ ${properties} }`] : [])]);
        }

      case "array":
        {
          return tsArrayOf(transform(node.items));
        }

      case "x-alternatives":
        {
          var _node$xAlternatives;

          return tsUnionOf(((_node$xAlternatives = node["x-alternatives"]) === null || _node$xAlternatives === void 0 ? void 0 : _node$xAlternatives.map(transform)) || []);
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
    return String(str).replace(/^\w/, l => l.toUpperCase());
  }

  function pathToTypeName(str) {
    return capitalize(str.replace(/[\/\-{](\w)/g, (_, letter) => letter.toUpperCase()).replace(/\W/g, ""));
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

            const paramGroupName = key;
            const groupNameToTypeName = {
              body: "Body",
              query: "Query",
              header: "Headers",
              formData: "FormData",
              path: "PathParams"
            };

            if (paramGroupName === "body") {
              output += `${endpointName}Request${groupNameToTypeName[paramGroupName]}: `;
              outputPerPath += `request${groupNameToTypeName[paramGroupName]}: `;
              output += transform(paramGroup.schema);
              outputPerPath += transform(paramGroup.schema);
              output += ";\n";
              outputPerPath += ";\n";
            } else {
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

function generateTypesV3(schema, options) {
  if (!schema.components || !schema.components.schemas) {
    throw new Error(`⛔️ 'components' missing from schema https://swagger.io/specification`);
  }

  const propertyMapped = options ? propertyMapper(schema.components.schemas, options.propertyMapper) : schema.components.schemas;

  function transform(node) {
    switch (nodeType(node)) {
      case "ref":
        {
          return transformRef(node.$ref);
        }

      case "string":
      case "number":
      case "boolean":
        {
          return nodeType(node) || "any";
        }

      case "enum":
        {
          return tsUnionOf(node.enum.map(item => `'${item}'`));
        }

      case "oneOf":
        {
          return tsUnionOf(node.oneOf.map(transform));
        }

      case "anyOf":
        {
          return tsIntersectionOf(node.anyOf.map(anyOf => tsPartial(transform(anyOf))));
        }

      case "object":
        {
          if ((!node.properties || !Object.keys(node.properties).length) && !node.allOf && !node.additionalProperties) {
            return `{ [key: string]: any }`;
          }

          let properties = createKeys(node.properties || {}, node.required);

          if (node.additionalProperties) {
            properties += `[key: string]: ${nodeType(node.additionalProperties) || "any"};\n`;
          }

          return tsIntersectionOf([...(node.allOf ? node.allOf.map(transform) : []), ...(properties ? [`{ ${properties} }`] : [])]);
        }

      case "array":
        {
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
  const responses = !schema.components.responses ? `` : `responses: {
    ${createKeys(schema.components.responses, Object.keys(schema.components.responses))}
  }`;
  return `export interface components {
    ${schemas}
    ${responses}
  }`;
}

const WARNING_MESSAGE = `/**
* This file was auto-generated by swagger-to-ts.
* Do not make direct changes to the file.
*/


`;
function swaggerToTS(schema, options) {
  const version = swaggerVersion(schema);
  let output = `${WARNING_MESSAGE}`;

  switch (version) {
    case 2:
      {
        output = output.concat(generateTypesV2(schema, options));
        break;
      }

    case 3:
      {
        output = output.concat(generateTypesV3(schema, options));
        break;
      }
  }

  let prettierOptions = {
    parser: "typescript"
  };

  if (options && options.prettierConfig) {
    try {
      const userOptions = prettier.resolveConfig.sync(path.resolve(process.cwd(), options.prettierConfig));
      prettierOptions = _objectSpread2({}, prettierOptions, {}, userOptions);
    } catch (err) {
      console.error(`❌ ${err}`);
    }
  }

  return prettier.format(output, prettierOptions);
}

exports.WARNING_MESSAGE = WARNING_MESSAGE;
exports.default = swaggerToTS;
//# sourceMappingURL=index.js.map
