
export type EventType = string

export type Callback<T> = (payload: T) => void

export class EventEmitter<T> {
    callbackMap = new Map<EventType, Array<Callback<T>>>

    on(eventType: EventType, cb: Callback<T>) {
        if (!this.callbackMap.has(eventType)) {
            this.callbackMap.set(eventType, [])
        }
        this.callbackMap.get(eventType)?.push(cb)
    }

    emit(eventType: EventType, payload: T) {
        if (!this.callbackMap.has(eventType)) {
            return
        }
        const cbs = this.callbackMap.get(eventType)
        cbs?.forEach(cb => cb(payload))
    }
}

export interface Event {
    message: string
    level: 'info' | 'warn' | 'error'
    [key: string]: any
}