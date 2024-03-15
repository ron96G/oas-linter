import type { ISpectralDiagnostic } from "@stoplight/spectral-core"
import type { Violation } from "../../models/scan"
import type { LintResult } from "./common"

export function determineInputType(input: string) { // TODO improve this
    if (input[0] == "{") {
        return 'json'
    }
    return 'yaml'
}

export function determineSeverity(severity: number, code: string | number): Violation['severity'] {
    if (code === "unrecognized-format") {
        return 'error'
    }
    if (severity == 0) {
        return "error"
    } else if (severity == 1) {
        return "warning"
    }
    return "information"
}

function decideValidity(res: LintResult) {
    res.valid = res.errors == 0 && res.warnings == 0
    return res;
}

export function formatResult(inputs: Array<ISpectralDiagnostic>): LintResult {

    let infos = 0
    let warnings = 0
    let errors = 0

    var res: LintResult = {
        valid: false,
        instance: "spectral",
        violations: inputs.map(input => {
            if (input.severity == 0) {
                errors++
            } else if (input.severity == 1) {
                warnings++
            } else {
                infos++
            }
            return {
                message: input.message,
                severity: determineSeverity(input.severity, input.code),
                code: "" + input.code,
                location: {
                    path: input.path.toString(),
                    start: {
                        line: input.range.start.line + 1,
                        column: input.range.start.character + 1
                    },
                    end: {
                        line: input.range.end.line + 1,
                        column: input.range.end.character + 1
                    }
                }
            }
        }),
        infos: infos,
        warnings: warnings,
        errors: errors
    }
    return decideValidity(res)
}

