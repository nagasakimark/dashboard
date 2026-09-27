import { getApp, getApps, initializeApp } from 'firebase/app'
import { firebaseConfig } from './firebaseConfig'

/** The one Firebase app instance (polls and sync share it, and so share sign-in). */
export const firebaseApp = () => (getApps().length ? getApp() : initializeApp(firebaseConfig))
