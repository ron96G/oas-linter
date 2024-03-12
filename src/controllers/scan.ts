import { randomUUID } from "crypto";
import { JsonSchemaLinter } from "../libs/linter/json-schema";
import { Linter } from "../libs/linter/spectral";
import { InMemoryStore } from "../libs/store/inmemory";
import type { Store } from "../libs/store/store";
import type { Scan, ScanRequest } from "../models/scan";

interface ScanController {
    scan(req: ScanRequest, rulesetName?: string, tags?: string[]): Promise<Scan>;
    getScan(id: string): Promise<Scan>;
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

    async scan(req: ScanRequest, rulesetName = "oas", tags?: string[]): Promise<Scan> {
        const id = randomUUID();
        const scan: Scan = {
            id: id,
            tags: tags || [],
            status: "pending",
            created_at: new Date().toISOString(),
            violations: []
        }
        // let res = await this.schemaLinter.lint(req.spec as any);
        // scan.violations = res.violations || [] as any[];
        // scan.status = res.valid ? "done" : "failed";

        const res = await this.linter.lintRaw(req, rulesetName);
        scan.violations = scan.violations.concat(res.violations);
        scan.status = res.valid ? "valid" : "invalid";

        this.store.set(id, scan);
        return scan;
    }

    async getScan(id: string): Promise<Scan> {
        const scan = await this.store.get(id);
        if (scan === null) {
            throw new Error("Scan not found");
        }
        return scan;
    }

    async getScans(status?: string, tags?: string[]): Promise<Scan[]> {
        const scanFilter = (scan: Scan) => !status || scan.status === status
        const tagFilter = (scan: Scan) => !tags || tags.every(tag => scan.tags.includes(tag));
        return (await this.store.getAll()).filter(scanFilter).filter(tagFilter);
    }
}



