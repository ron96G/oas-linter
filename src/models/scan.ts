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
	tags: t.Array(t.String()),
	status: t.String({ enum: ['valid', 'pending', 'failed', 'invalid'] }),
	created_at: t.String({ format: 'date-time', default: new Date().toISOString() }),
	violations: t.Array(Violation)
}, { description: 'Scan result' })

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

export interface Scan {
	id: string;
	tags: string[];
	status: ScanStatus;
	created_at: string;
	violations: Violation[];
}

export type ScanRequest = string;