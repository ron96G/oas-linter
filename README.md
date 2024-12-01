# OAS Linter

## Description

This project is a linter for OpenAPI Specification (OAS) files. It will check the OAS for errors and provide feedback on how to fix them.
To do this it uses [Spectral](https://stoplight.io/open-source/spectral/), a JSON/YAML linter that can be used to lint OAS.

This project is divided into two parts:
- The backend is a REST API that receives the OAS and returns the linting results.
- The frontend is a web application that allows the user to upload, edit and view the OAS. It will display the linting results and may also be used to display the [swagger-ui](https://swagger.io/tools/swagger-ui/) of the OAS.

> The frontend is a standalone application that can be used without the backend. If a backend exists, it will fetch the rulesets from the backend. **The frontend will never send the OAS to the backend.**

## Backend

Bun-Application written using [Elysiajs](https://elysiajs.com/). It offers different endpoints:
- to lint an OAS
- to get/list linted OAS
- to get the rulesets
- to get the schemas

### Configuration

It can be configured using the yaml-files in the `config` folder. The following configuration options are available:

| Field | Description | Default |
|-------|-------------|---------|
| `auth.enabled` | Enable authentication | `true` |
| `auth.trustedIssuers` | List of trusted issuers | `[]` |
| `ui.enabled` | Enable support for UI links in responses | `false` |
| `ui.apiBase` | The basePath of the API. Used for links | `` |
| `ui.url` | The URL on which the UI is running. Used for links | `` |
| `api.url` | URL of the API. Used in the Swagger-UI | `` |
| `rulesets` | List of Ruleset definition used for linting | `[]` |
| `rulesets[].name` | Name of the ruleset | `` |
| `rulesets[].url` | URL to the ruleset file | `` |
| `rulesets[].refreshInterval` | Interval in seconds to refresh the ruleset | `0` |
| `schemas` | List of JSON-schema definition used for linting | `[]` |
| `schemas[].name` | Name of the schema | `` |
| `schemas[].url` | URL to the schema file | `` |


> The config-file can contains variables `${VAR_NAME}` that will be replaced by environment variables.

The name of the config-file must match the `NODE_ENV` environment variable.

### Installation

To install the backend, run the following commands:

```bash
cd apps/backend
bun install
```

### Running

To run the backend, run the following command:

```bash
cd apps/backend
bun run dev
```

### Building

To build the backend, run the following command:

```bash
npm run docker:build:server
# or
npm run docker:build:all
```

## Frontend

The frontend is a standalone application that can be used without the backend. If a backend exists, it will fetch the rulesets from the backend. **The frontend will never send the OAS to the backend.**

You may use the [scripts](#scripts) to update the frontend assets.

The following query-parameters are supported:

- `ruleset`: The name of the ruleset to use. If not set, the default ruleset will be used.
- `schema`: The name of the schema to use. If not set, the default schema will be used.
- `input`: The URL of the OAS to load, display and lint. **Requires CORS support.**
- `showSwaggerUI`: If set, the swagger-ui will be displayed.

### Installation

To install the frontend, run the following commands:

```bash
cd apps/frontend
bun install
```

### Running

To run the frontend, run the following command:

```bash
cd apps/frontend
bun run dev
```

### Building

To build the frontend, run the following command:

```bash
npm run docker:build:ui
# or
npm run docker:build:all
```

### Scripts

The following scripts can be used to update the frontend assets:

- [update-swagger-ui](./apps//frontend/scripts/update-swagger-ui.js): This script will download the configured version of swagger-ui and copy the necessary files to the frontend assets folder.

- [update-schemas](./apps/frontend/scripts/update-schemas.js): This script will download the schemas from the official OAS repository.