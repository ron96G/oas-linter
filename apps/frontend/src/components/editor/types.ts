export interface DecorationItem {
    start: {
        line: number,
        column: number
    },
    end: {
        line: number,
        column: number
    },
    severity: 'error' | 'warning' | 'information',
    message: string,
    code: string | number,
    action?: string
}

export interface Position {
    line: number,
    column: number
}
