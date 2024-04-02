import { logger } from '../log'
import type { Store } from './store'

interface DeletionItem {
    available_until: Date
}

export class InMemoryStore<T extends DeletionItem> implements Store<T> {
    private store: Map<string, T> = new Map()

    constructor(deleteInterval: number) {
        setInterval(() => {
            const now = new Date()
            for (const [key, value] of this.store.entries()) {
                if (value.available_until < now) {
                    logger.info(
                        `Deleting store entry ${key} because it is expired`
                    )
                    this.store.delete(key)
                }
            }
        }, deleteInterval)
    }

    async get(key: string): Promise<T | null> {
        return this.store.get(key) || null
    }

    async set(key: string, value: T): Promise<void> {
        this.store.set(key, value)
    }

    async getAll(): Promise<T[]> {
        return Array.from(this.store.values())
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key)
    }
}
