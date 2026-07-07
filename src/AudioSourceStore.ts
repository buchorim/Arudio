// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import type {AudioSourceRecord} from './Types';

const AUDIO_SOURCE_DATABASE_NAME = 'ArudioAudioSources';
const AUDIO_SOURCE_DATABASE_VERSION = 1;
const AUDIO_SOURCE_STORE_NAME = 'AudioSourceBlobs';

interface StoredAudioSourceBlob {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  importedAt: string;
  blob: Blob;
}

export async function saveAudioSourceBlob(projectId: string, source: AudioSourceRecord, blob: Blob) {
  const database = await openAudioSourceDatabase();
  const transaction = database.transaction(AUDIO_SOURCE_STORE_NAME, 'readwrite');
  const transactionComplete = waitForTransaction(transaction);
  const store = transaction.objectStore(AUDIO_SOURCE_STORE_NAME);
  store.put({
    id: source.id,
    projectId,
    fileName: source.fileName,
    mimeType: source.mimeType,
    importedAt: source.importedAt,
    blob,
  } satisfies StoredAudioSourceBlob);

  await transactionComplete;
  database.close();
}

export async function loadAudioSourceBlob(sourceId: string): Promise<Blob | null> {
  const database = await openAudioSourceDatabase();
  const transaction = database.transaction(AUDIO_SOURCE_STORE_NAME, 'readonly');
  const store = transaction.objectStore(AUDIO_SOURCE_STORE_NAME);
  try {
    const storedRecord = await requestToPromise<StoredAudioSourceBlob | undefined>(store.get(sourceId));
    return storedRecord?.blob ?? null;
  } finally {
    database.close();
  }

}

export async function hasAudioSourceBlob(sourceId: string): Promise<boolean> {
  const database = await openAudioSourceDatabase();
  const transaction = database.transaction(AUDIO_SOURCE_STORE_NAME, 'readonly');
  const store = transaction.objectStore(AUDIO_SOURCE_STORE_NAME);
  try {
    const matchingRecords = await requestToPromise<number>(store.count(sourceId));
    return matchingRecords > 0;
  } finally {
    database.close();
  }
}

export async function deleteAudioSourceBlob(sourceId: string) {
  const database = await openAudioSourceDatabase();
  const transaction = database.transaction(AUDIO_SOURCE_STORE_NAME, 'readwrite');
  const transactionComplete = waitForTransaction(transaction);
  const store = transaction.objectStore(AUDIO_SOURCE_STORE_NAME);
  store.delete(sourceId);
  await transactionComplete;
  database.close();
}

export async function clearAudioSourceBlobs() {
  const database = await openAudioSourceDatabase();
  const transaction = database.transaction(AUDIO_SOURCE_STORE_NAME, 'readwrite');
  const transactionComplete = waitForTransaction(transaction);
  const store = transaction.objectStore(AUDIO_SOURCE_STORE_NAME);
  store.clear();
  await transactionComplete;
  database.close();
}

function openAudioSourceDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('Local audio file storage is not available in this browser session.'));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(AUDIO_SOURCE_DATABASE_NAME, AUDIO_SOURCE_DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUDIO_SOURCE_STORE_NAME)) {
        database.createObjectStore(AUDIO_SOURCE_STORE_NAME, {keyPath: 'id'});
      }
    };

    request.onerror = () => {
      reject(new Error('Local audio file storage could not be opened.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(new Error('Local audio storage request failed.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.onabort = () => {
      reject(new Error('Local audio storage transaction was aborted.'));
    };

    transaction.onerror = () => {
      reject(new Error('Local audio storage transaction failed.'));
    };

    transaction.oncomplete = () => {
      resolve();
    };
  });
}
