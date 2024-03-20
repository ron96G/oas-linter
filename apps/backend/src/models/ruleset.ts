import { t } from "elysia";

export const Ruleset = t.Object({
    ok: t.Boolean(),
    ruleset: t.Any(),
    raw: t.Optional(t.Any()),
    error: t.Optional(t.String()),
    hash: t.Optional(t.String())
},
    {
        description: 'Ruleset'
    }
)