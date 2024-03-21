import { t } from "elysia";

export const ID = t.String({
  format: "uuid",
  default: "00000000-0000-0000-0000-000000000000",
  description: "The unique identifier of the scan",
});
