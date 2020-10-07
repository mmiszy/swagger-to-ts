declare type HttpMethods = "get" | "put" | "post" | "delete" | "options" | "head" | "patch";
declare type HttpStatuses = 100 | 101 | 102 | 103 | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226 | 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 421 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451 | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
export interface OpenAPI2 {
    definitions?: {
        [key: string]: OpenAPI2SchemaObject;
    };
    swagger: string;
    paths: OpenAPI2PathsObject;
    [key: string]: any;
}
export declare type OpenAPI2PathsObject = {
    [path: string]: OpenAPI2PathItemObject;
};
declare type OpenAPI2PathItemObject = {
    [method in HttpMethods]: OpenAPI2OperationObject;
};
export declare type OpenAPI2OperationObject = {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId: string;
    responses: OpenAPI2ResponsesObject;
    parameters?: OpenAPI2ParametersObject;
};
export declare type OpenAPI2ResponsesObject = {
    default?: OpenAPI2Reference | OpenAPI2ResponseObject;
} & {
    [status in HttpStatuses]: OpenAPI2Reference | OpenAPI2ResponseObject;
};
export declare type OpenAPI2ResponseObject = {
    description: string;
    schema?: OpenAPI2SchemaObject | OpenAPI2Reference;
};
export declare type OpenAPI2ParameterType = "string" | "number" | "integer" | "boolean" | "array" | "file";
export declare type OpenAPI2ParametersObject = {
    [k in string | number]: OpenAPI2ParameterObject;
};
export declare type OpenAPI2ParameterObject = {
    name: string;
    description?: string;
} & ({
    in: "body";
    required?: boolean;
    schema: OpenAPI2SchemaObject | OpenAPI2Reference;
} | {
    in: "query" | "header" | "formData";
    required?: boolean;
    type: OpenAPI2ParameterType;
    enum?: ReadonlyArray<unknown>;
} | {
    in: "path";
    required: true;
    type: OpenAPI2ParameterType;
    enum?: ReadonlyArray<unknown>;
});
export declare type OpenAPI2Type = "array" | "binary" | "boolean" | "byte" | "date" | "dateTime" | "double" | "float" | "integer" | "long" | "number" | "object" | "password" | "string";
export declare type OpenAPI2Reference = {
    $ref: string;
};
export interface OpenAPI2SchemaObject {
    additionalProperties?: OpenAPI2SchemaObject | OpenAPI2Reference | boolean;
    allOf?: OpenAPI2SchemaObject[];
    description?: string;
    enum?: string[];
    format?: string;
    items?: OpenAPI2SchemaObject | OpenAPI2Reference;
    oneOf?: (OpenAPI2SchemaObject | OpenAPI2Reference)[];
    properties?: {
        [index: string]: OpenAPI2SchemaObject | OpenAPI2Reference;
    };
    required?: string[];
    title?: string;
    type?: OpenAPI2Type;
    "x-alternatives"?: (OpenAPI2SchemaObject | OpenAPI2Reference)[];
    [key: string]: any;
}
export {};
