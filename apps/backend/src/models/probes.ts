import { t } from "elysia";

export const ProbesResponse = t.Object({
  name: t.String(),
  status: t.String({ enum: ["UP", "DOWN"] }),
  components: t.Optional(
    t.Array(
      t.Object({ name: t.String(), status: t.String({ enum: ["UP", "DOWN"] }) })
    )
  ),
});
