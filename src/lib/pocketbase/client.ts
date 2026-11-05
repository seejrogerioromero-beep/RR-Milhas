import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

/** Absolute base URL of the backend (PocketBase) — never the SPA origin. */
export const BACKEND_URL = pb.baseURL

export default pb
