export interface definitions {
    Model1: {
        id: number;
        slug: string;
        name: string;
        description?: string;
        isPublic: boolean;
        regularPrice: number;
        discountPrice?: number;
        type: "SINGLE" | "BUNDLE";
    };
    data: definitions["Model1"][];
    Model2: {
        data: definitions["data"];
    };
    user: {
        id: number;
        name?: string;
        email: string;
        role: "USER" | "ADMIN";
        createdAt?: string;
        updatedAt?: string;
    };
    Model3: {
        id: string;
        validUntil: string;
        userId: number;
        createdAt?: string;
        updatedAt?: string;
        user: definitions["user"];
    };
    Model4: {
        data: definitions["Model3"];
    };
    Model5: {
        name: string;
        description: string;
        isPublic: boolean;
        regularPrice: number;
        discountPrice?: number;
        type: "SINGLE" | "BUNDLE";
    };
    Model6: {
        data: definitions["Model1"];
    };
    Model7: {
        email: string;
        password: string;
    };
    getProducts200Response: definitions["Model2"];
    postProductsRequestBody: definitions["Model5"];
    postProducts200Response: definitions["Model6"];
    getAuthMe200Response: definitions["Model4"];
    postAuthLoginRequestBody: definitions["Model7"];
    postAuthLoginDefaultResponse: string;
    postAuthLogoutDefaultResponse: string;
    postAuthRegisterRequestBody: definitions["Model7"];
    postAuthRegisterDefaultResponse: string;
    putProductsProductIdRequestPathParams: {
        productId: number;
    };
    putProductsProductIdRequestBody: definitions["Model5"];
    putProductsProductIdDefaultResponse: string;
    deleteProductsProductIdRequestPathParams: {
        productId: number;
    };
    deleteProductsProductIdDefaultResponse: string;
}
