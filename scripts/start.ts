// deno-lint-ignore-file no-explicit-any
import "npm:@graphql-codegen/typescript";
import "npm:@graphql-codegen/typescript-operations";
import "npm:@graphql-codegen/add";

import { CodegenConfig, generate } from "npm:@graphql-codegen/cli";
import { compile } from "npm:json-schema-to-typescript";
import { OpenAPIV3 } from "npm:openapi-types";
import camel from "npm:camelcase";
import { walk } from "std/fs/mod.ts";
import { dirname, join } from "std/path/mod.ts";
import { basename } from "std/path/win32.ts";
import { setupGithooks } from "https://deno.land/x/githooks@0.0.4/githooks.ts";

await setupGithooks();

const OPENAPI_EXTENSION = ".openapi.json";
const GRAPHQL_EXTENSION = ".graphql.json";

const allOpenAPIPaths: string[] = [];
const allGraphqlPaths: string[] = [];

function processTypeInNestedObject(obj: any) {
  if (typeof obj === "object" && obj !== null) {
    if ("nullable" in obj && obj.nullable === true) {
      if ("type" in obj) {
        if (Array.isArray(obj.type)) {
          obj.type.unshift("null");
        } else {
          obj.type = ["null", obj.type];
        }
      }
    }

    for (const key in obj) {
      obj[key] = processTypeInNestedObject(obj[key]);
    }
  }

  return obj;
}

for await (const entry of walk(".")) {
  if (entry.isFile) {
    if (entry.path.endsWith(OPENAPI_EXTENSION)) {
      allOpenAPIPaths.push(entry.path);
    }
    if (entry.path.endsWith(GRAPHQL_EXTENSION)) {
      allGraphqlPaths.push(entry.path);
    }
  }
}

const BANNER = `
// deno-lint-ignore-file no-explicit-any ban-types ban-unused-ignore
//
// DO NOT EDIT. This file is generated by deco.
// This file SHOULD be checked into source version control.
// To generate this file: deno task start
//        
`;

const fmtAndLint = async (file: string) => {
  const deno = Deno.execPath();

  await new Deno.Command(deno, { args: ["fmt", file] }).output();
  await new Deno.Command(deno, { args: ["lint", file] }).output();
};

const toOutfile = (path: string) => path.replace(".json", ".gen.ts");

// transforms: /a/{b}/c => /a/:b/c
const toPathTemplate = (path: string) =>
  path
    .split("/")
    .map((segment) => {
      const param = segment.replace(/{/g, ":").replace(/}/g, "");

      return param.startsWith(":") ? camel(param) : param;
    }).join("/");

const generateOpenAPI = async () => {
  const isOpenAPIv3 = (x: any): x is OpenAPIV3.Document =>
    x?.openapi?.startsWith("3.");

  const isReferenceObject = (x: any): x is OpenAPIV3.ReferenceObject =>
    Boolean(x?.$ref);

  const HTTP_VERBS = ["get", "post", "put", "delete", "patch", "head"] as const;

  const MEDIA_TYPE_JSON = "application/json";

  for (const path of allOpenAPIPaths) {
    const outfile = toOutfile(path);

    console.info(`Generating OpenAPI types for specs at ${path}`);
    const document = JSON.parse(await Deno.readTextFile(path));

    if (!isOpenAPIv3(document)) {
      throw new Error("Only OpenAPI@3x is supported");
    }

    const resolve = (obj: any) => {
      if (!isReferenceObject(obj)) return obj;

      const schema = { ...obj, ...document };

      return schema.$ref.split("/").slice(1).reduce(
        (acc: any, curr) => acc?.[curr],
        schema,
      );
    };

    const finalSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {},
      required: [],
    };

    for (const [path, pathItem] of Object.entries(document.paths)) {
      const pathTemplate = toPathTemplate(path);

      for (const verb of HTTP_VERBS) {
        const item = pathItem?.[verb];

        if (!item) {
          continue;
        }
        const {
          parameters = [],
          requestBody,
          responses,
        } = item;

        const schema: OpenAPIV3.SchemaObject = {
          type: "object",
          externalDocs: item.externalDocs,
          deprecated: item.deprecated,
          description: item.description || item.summary,
          properties: {},
          required: [],
        };

        let hasParams = false;
        const searchParams = parameters
          .map(resolve)
          .reduce((schema, item) => {
            if (item?.schema && item.in === "query") {
              hasParams = true;
              schema.properties[item.name] = {
                description: item.description,
                ...item.schema,
              };

              if (item.required) {
                schema.required.push(item.name);
              }
            }

            return schema;
          }, {
            type: "object" as const,
            required: [] as string[],
            properties: {} as Record<string, OpenAPIV3.SchemaObject>,
          });

        if (hasParams) {
          schema.required?.push("searchParams");
          schema.properties!["searchParams"] = processTypeInNestedObject(
            searchParams,
          );
        }

        const body = resolve(requestBody)
          ?.content[MEDIA_TYPE_JSON]?.schema;

        if (body) {
          schema.required?.push("body");
          schema.properties!["body"] = processTypeInNestedObject(body);
        }

        const ok = responses?.["200"] ||
          responses?.["201"] ||
          responses?.["206"];
        const response = resolve(ok)?.content?.[MEDIA_TYPE_JSON].schema;

        if (response) {
          schema.required?.push("response");
          schema.properties!["response"] = processTypeInNestedObject(response);
        }

        const type = `${verb.toUpperCase()} ${pathTemplate}`;
        finalSchema.required?.push(type);
        finalSchema.properties![type] = schema;
      }
    }

    const final = await compile(
      {
        ...finalSchema,
        ...document,
      },
      "OpenAPI",
      {
        unknownAny: false,
        additionalProperties: false,
        format: false,
        bannerComment: BANNER,
      },
    );

    await Deno.writeTextFile(outfile, final);
    await fmtAndLint(outfile);
  }
};

const generateGraphQL = async () => {
  for (const path of allGraphqlPaths) {
    const [folder, base] = [dirname(path), basename(path)];
    const outfile = toOutfile(base);

    console.info(`Generating GraphQL types for specs at ${folder}`);
    const config: CodegenConfig = {
      silent: true,
      schema: join(Deno.cwd(), path),
      documents: [`**/*.ts`],
      generates: {
        [outfile]: {
          // This order matters
          plugins: [
            {
              add: {
                content: BANNER,
              },
            },
            "typescript",
            "typescript-operations",
          ],
          config: {
            skipTypename: true,
            enumsAsTypes: true,
          },
        },
      },
    };

    await generate({ ...config, cwd: folder }, true);
    await fmtAndLint(join(folder, outfile));
  }
};

const generateDeco = () => import("deco/scripts/apps/bundle.ts");

await generateOpenAPI();
await generateGraphQL();
await generateDeco();
