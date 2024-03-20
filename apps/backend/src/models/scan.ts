import { t } from 'elysia';
import { ID } from './common';


const Point = t.Object({
	line: t.Number(),
	column: t.Number()
}, { description: 'Point' })

const Location = t.Object({
	path: t.Optional(t.String()),
	start: t.Optional(Point),
	end: t.Optional(Point)
}, { description: 'Location' })

const Violation = t.Object({
	severity: t.String({ enum: ['information', 'warning', 'error'] }),
	code: t.Optional(t.String()),
	message: t.String(),
	location: t.Optional(Location)
}, { description: 'Violation' })

export const Scan = t.Object({
	id: ID,
	editor_href: t.Optional(t.String()),
	tags: t.Array(t.String()),
	spec: t.Optional(t.String()),
	ruleset: t.Object({
		name: t.String(),
		hash: t.String()
	}),
	status: t.String({ enum: ['valid', 'pending', 'failed', 'invalid'] }),
	created_at: t.Date({ format: 'date-time', default: new Date().toISOString() }),
	available_until: t.Date({ format: 'date-time' }),
	info: t.Object({
		valid: t.Boolean(),
		infos: t.Number(),
		warnings: t.Number(),
		errors: t.Number()
	}),
	violations: t.Array(Violation)

}, {
	description: 'Scan result'
})

export const ScanRequest = t.Any();


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
	code?: string;
	message: string;
	location?: Location;
}

type ScanStatus = 'valid' | 'pending' | 'failed' | 'invalid';


export interface ViolationsInfo {
	valid: boolean;
	infos: number;
	warnings: number;
	errors: number;
}

export interface RulesetRef {
	name: string;
	hash: string;
}

export interface Scan {
	id: string;
	editor_href?: string;
	spec?: string;
	tags: string[];
	ruleset: RulesetRef;
	status: ScanStatus;
	created_at: Date;
	available_until: Date;
	info: ViolationsInfo;
	violations: Violation[];
}

export type ScanRequest = string;