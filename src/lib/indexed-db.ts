const DB_NAME = 'popo-doc-to-markdown'
const DB_VERSION = 1
const STORE_NAME = 'keyval'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开 IndexedDB'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = run(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 事务失败'))
    transaction.oncomplete = () => database.close()
  })
}

export async function getIndexedDbValue<T>(key: string): Promise<T | undefined> {
  const result = await withStore<T | undefined>('readonly', (store) => store.get(key))
  return result
}

export async function setIndexedDbValue<T>(key: string, value: T): Promise<void> {
  await withStore('readwrite', (store) => store.put(value, key))
}

export async function deleteIndexedDbValue(key: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(key))
}
