import {
  IContractSchema,
  IEventSchema,
  IMongoQ,
  IParams,
  IQuery,
  ITokenSchema,
} from './types';

// eslint-disable-next-line require-jsdoc
export function makeQuery<T>(
  params: IParams,
  query: IQuery<T>,
  queryName?: string,
): IMongoQ {
  // filter
  let filter = {};
  for (const key in query) {
    if (
      Object.prototype.hasOwnProperty.call(query, key) &&
      !['sort', 'range', 'select'].includes(key) &&
      !!query[key]
    ) {
      try {
        filter = {
          ...filter,
          [key]: JSON.parse(query[key]),
        };
      } catch {
        filter = {
          ...filter,
          [key]: query[key],
        };
      }
    }
  }
  if (!!filter['events']) {
    filter['events'] = { $in: filter['events'] };
  }
  if (queryName && !!filter && Object.keys(filter).length > 0) {
    // renaming the keys
    const keyCheckContract: IContractSchema = {
      address: '',
      network: '',
      latestBlock: 0,
      events: [],
    };
    const keyCheckEvent: IEventSchema = {
      address: '',
      network: '',
      blockNumber: 0,
      transactionHash: '',
      event: '',
      returnValues: {},
    };
    const keyCheckToken: ITokenSchema = {
      address: '',
      network: '',
      tokenId: '',
      blockNumber: 0,
      data: {},
    };
    for (const key in filter) {
      if (
        Object.prototype.hasOwnProperty.call(filter, key) &&
        !(
          key in
          [
            ...Object.keys(keyCheckContract),
            ...Object.keys(keyCheckEvent),
            ...Object.keys(keyCheckToken),
          ]
        )
      ) {
        delete Object.assign(filter, { [`${queryName}.${key}`]: filter[key] })[
          key
        ];
      }
    }
  }
  filter = { ...params, ...filter };

  // making sorting
  let sort = {};
  if (query.sort) {
    for (const sorting of query.sort.split(',')) {
      sort = {
        ...sort,
        [sorting.slice(1)]: sorting[0] === '-' ? -1 : +1,
      };
    }
  }

  // select
  let select = {};
  if (query.select) {
    for (const sel of query.select.split(' ')) {
      select = {
        ...select,
        [sel]: 1,
      };
    }
  }

  // range
  let skip = undefined;
  let limit = undefined;
  if (query.range) {
    const r = query.range.split('-');
    skip = parseInt(r[0]);
    limit = parseInt(r[1]) - parseInt(r[0]);
  }

  return { filter, sort, skip, limit, select };
}
