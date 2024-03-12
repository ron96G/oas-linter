import type { Store } from "./store";

export class InMemoryStore<T> implements Store<T> {

    private store: Map<string, T> = new Map();

    async get(key: string): Promise<T | null> {
        return this.store.get(key) || null;
    }

    async set(key: string, value: T): Promise<void> {
        this.store.set(key, value);
    }

    async getAll(): Promise<T[]> {
        return Array.from(this.store.values());
    }
}