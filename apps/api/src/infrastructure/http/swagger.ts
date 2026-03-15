import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Semaforo API",
      version: "0.1.0",
      description: "Feature toggle management platform API",
    },
    servers: [{ url: "/api" }],
    components: {
      schemas: {
        App: {
          type: "object",
          properties: {
            id: { type: "object", properties: { value: { type: "string", format: "uuid" } } },
            name: { type: "string", example: "My App" },
            key: { type: "string", example: "my-app" },
            description: { type: "string", example: "A feature-flagged application" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Environment: {
          type: "object",
          properties: {
            id: { type: "object", properties: { value: { type: "string", format: "uuid" } } },
            appId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Production" },
            key: { type: "string", example: "production" },
            cacheTtlSeconds: { type: "number", example: 300 },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        FeatureToggle: {
          type: "object",
          properties: {
            id: { type: "object", properties: { value: { type: "string", format: "uuid" } } },
            appId: { type: "string", format: "uuid" },
            name: { type: "string", example: "New Checkout" },
            key: { type: "string", example: "newCheckout" },
            description: { type: "string", example: "Enables the new checkout flow" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ToggleValue: {
          type: "object",
          properties: {
            id: { type: "object", properties: { value: { type: "string", format: "uuid" } } },
            toggleId: { type: "string", format: "uuid" },
            environmentId: { type: "string", format: "uuid" },
            enabled: { type: "boolean", example: true },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/infrastructure/http/routes/*.ts", "./src/infrastructure/http/app.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
