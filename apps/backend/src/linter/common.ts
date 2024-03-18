
export interface Point {
    line: number;
    column: number;
}

export interface Location {
    path?: string;
    start?: Point
    end?: Point;
}

export interface Violation {
    severity: 'information' | 'warning' | 'error'
    message: string
    location?: Location
    code?: string,
}

export interface LintResult {
    valid: boolean
    instance: "schema" | "spectral"
    violations: Array<Violation>
    infos: number
    warnings: number
    errors: number
}
