import { VIVID } from './palette'

/** Segment under the pointer (top) for a wheel turned `angle` degrees clockwise. */
export const segmentAt = (angle: number, count: number) => Math.floor((((((360 - (angle % 360)) % 360) + 360) % 360) / 360) * count) % count

/** Segment colour, avoiding the same colour on the last and first segments. */
export const segmentColor = (i: number, count: number) => VIVID[i === count - 1 && i > 0 && i % VIVID.length === 0 ? 1 : i % VIVID.length]

/** Five full turns plus a random stop. */
export const spinTarget = (angle: number) => angle + 360 * 5 + Math.random() * 360
