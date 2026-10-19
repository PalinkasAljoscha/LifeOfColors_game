import { HIDE_START_CELL_IF_NOT_REQUIRED } from '../config.js'
import { initialBoard, startHidden } from '../engine/engine.js'

/** The board a puzzle starts from in this app build (start cell hidden or not, see config.js). */
export function startBoard(inst) {
  return initialBoard(inst, { hideStart: startHidden(inst, HIDE_START_CELL_IF_NOT_REQUIRED) })
}
