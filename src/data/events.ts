/** App-wide data events (e.g. sync reacting to an import replacing everything). */
export const dataEvents = new EventTarget()

/** Fired after import, backup restore or erase replaced all data on this device. */
export const DATA_REPLACED = 'data-replaced'
