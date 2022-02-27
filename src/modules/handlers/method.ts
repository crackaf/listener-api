import { ITokenSchema } from '../../utils/types';
import { getDb } from '../database';

/**
 * @dev insert token into database
 * @param {ITokenSchema} data
 * @return {void}
 */
export function methodHandler(data: ITokenSchema) {
  try {
    const db = getDb();
    return db.methodHandler(data);
  } catch (err) {
    if (!!err.code && err.code !== 11000) console.error(err);
  }
}
