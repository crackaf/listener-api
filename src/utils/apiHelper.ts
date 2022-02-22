import { IParams, IQuery } from './types';

// eslint-disable-next-line require-jsdoc
export function makeQuery<T>(
  params: IParams,
  query: IQuery<T>,
): {
  filter: any;
  sort: any;
  limit: any;
  skip: any;
  select: any;
} {
  // filter
  let filter = {};
  for (const key in query) {
    if (
      Object.prototype.hasOwnProperty.call(query, key) &&
      !!query[key] &&
      !(key in ['sort', 'range', 'select'])
    ) {
      try {
        filter = {
          ...query,
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
  if (!!query['events']) {
    filter['events'] = { $in: query['events'] };
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
    for (const sel of query.sort.split(' ')) {
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
    limit = parseInt(r[1]);
  }

  return { filter, sort, skip, limit, select };
}
