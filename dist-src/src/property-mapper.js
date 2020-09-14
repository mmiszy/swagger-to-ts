import { fromEntries } from "./utils";
export default function propertyMapper(schema, transform) {
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
                description: schemaObject.description,
            });
            if (property.optional) {
                if (Array.isArray(node.required)) {
                    node.required = node.required.filter((r) => r !== key);
                }
            }
            else {
                node.required = [...(node.required || []), key];
            }
            return [
                key,
                {
                    ...val,
                    type: property.interfaceType,
                    description: property.description,
                },
            ];
        }));
        return node;
    });
}
