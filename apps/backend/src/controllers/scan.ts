import { randomUUID } from "crypto";
import { JsonSchemaLinter, Linter } from "../linter";
import type { Scan, ScanRequest } from "../models/scan";
import { InMemoryStore } from "../store/inmemory";
import type { Store } from "../store/store";

interface ScanController {
    scan(req: ScanRequest, rulesetName?: string, tags?: string[], includeSpec?: boolean): Promise<Scan>;
    getScan(id: string, includeSpec?: boolean): Promise<Scan>;
    getScans(status?: string, tags?: string[]): Promise<Scan[]>;
}

export class ScanControllerImpl implements ScanController {

    readonly linter = new Linter();
    readonly schemaLinter = new JsonSchemaLinter();
    readonly store: Store<Scan> = new InMemoryStore<Scan>();
    readonly defaultRuleset: string;

    constructor(defaultRuleset = "oas") {
        this.defaultRuleset = defaultRuleset;
    }

    async scan(req: ScanRequest, rulesetName = "oas", tags?: string[], includeSpec = false): Promise<Scan> {
        const id = randomUUID();
        const scan: Scan = {
            id: id,
            spec: req,
            tags: tags || [],
            status: "pending",
            created_at: new Date().toISOString(),
            info: {
                valid: false,
                infos: 0,
                warnings: 0,
                errors: 0
            },
            violations: []
        }
        // let res = await this.schemaLinter.lint(req.spec as any);
        // scan.violations = res.violations || [] as any[];
        // scan.status = res.valid ? "done" : "failed";

        const res = await this.linter.lintRaw(req, rulesetName);
        scan.violations = scan.violations.concat(res.violations);
        scan.info = {
            valid: res.valid,
            infos: res.infos,
            warnings: res.warnings,
            errors: res.errors
        }
        scan.status = res.valid ? "valid" : "invalid";

        this.store.set(id, scan);
        const shallowCopy = { ...scan };
        if (!includeSpec) {
            delete shallowCopy.spec;
        }
        return shallowCopy;
    }

    async getScan(id: string, includeSpec = false): Promise<Scan> {
        const scan = await this.store.get(id);
        if (scan === null) {
            throw new Error("Scan not found");
        }
        const shallowCopy = { ...scan };
        if (!includeSpec) {
            delete shallowCopy.spec;
        }
        return shallowCopy;
    }

    async getScans(status?: string, tags?: string[]): Promise<Scan[]> {
        const scanFilter = (scan: Scan) => !status || scan.status === status
        const tagFilter = (scan: Scan) => !tags || tags.every(tag => scan.tags.includes(tag));
        return (await this.store.getAll()).filter(scanFilter).filter(tagFilter).map(scan => {
            const shallowCopy = { ...scan };
            delete shallowCopy.spec;
            return shallowCopy;
        });
    }
}



