export interface Store<T> {
    getAll(): Promise<T[]>
    get(key: string): Promise<T | null>
    set(key: string, value: T): Promise<void>
    delete(key: string): Promise<void>
}
