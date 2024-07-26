import type { Params } from "@remix-run/react";
import { getParamsOrFail } from "remix-params-helper";
import z, { type ZodTypeAny } from "zod";

// Takes in FormData, URLSearchParams or an object
// and returns a parsed object based on the schema
// throws and error if the object does not match the schema
export const validateSchema = <TSchema extends ZodTypeAny>(
  input: URLSearchParams | FormData | Params,
  schema: TSchema
): z.infer<TSchema> => {
  if (input instanceof URLSearchParams) {
    return getParamsOrFail(input, schema);
  } else if (input instanceof FormData) {
    return getParamsOrFail(input, schema);
  }
  return schema.parse(input);
};
