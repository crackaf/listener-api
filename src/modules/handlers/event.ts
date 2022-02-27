import { IEventSchema } from '../../utils/types';
import { getDb } from '../database';

/**
 * @dev insert new event(s) and update latest block in database if needed
 * @param {IEventSchema | IEventSchema[]} data adas
 * @return {void} nothing
 */
export function eventHandler(data: IEventSchema | IEventSchema[]) {
  try {
    const db = getDb();
    return db.eventHandler(data);
  } catch (err) {
    if (!!err.code && err.code !== 11000) console.error(err);
  }
}
