import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../src/utils/pagination.js';

describe('pagination & sorting helper (unit)', () => {
  it('returns non-paginated defaults with deterministic sort order when page and limit are omitted', () => {
    const parsed = parsePaginationAndSort({}, {
      allowedSortFields: ['productId', 'price', 'productName'],
      defaultSortField: 'productId',
      defaultSortOrder: 'DESC',
      tieBreakerField: 'productId',
    });

    assert.equal(parsed.isPaginated, false);
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.offset, 0);
    assert.deepEqual(parsed.order, [['productId', 'DESC']]);
  });

  it('parses valid pagination, caps limit at maxLimit, and appends tie-breaker when sorting by non-id field', () => {
    const parsed = parsePaginationAndSort(
      { page: '3', limit: '500', sortBy: 'price', sortOrder: 'asc' },
      {
        allowedSortFields: ['productId', 'price', 'productName'],
        defaultSortField: 'productId',
        defaultSortOrder: 'DESC',
        maxLimit: 50,
        tieBreakerField: 'productId',
      },
    );

    assert.equal(parsed.isPaginated, true);
    assert.equal(parsed.page, 3);
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.offset, 100);
    assert.equal(parsed.sortBy, 'price');
    assert.equal(parsed.sortOrder, 'ASC');
    assert.deepEqual(parsed.order, [['price', 'ASC'], ['productId', 'DESC']]);
  });

  it('ignores disallowed sortBy fields and invalid numbers safely', () => {
    const parsed = parsePaginationAndSort(
      { page: '-2', limit: 'abc', sortBy: 'DROP TABLE; --', sortOrder: 'SIDEWAYS' },
      {
        allowedSortFields: ['productId', 'price'],
        defaultSortField: 'productId',
        defaultSortOrder: 'DESC',
      },
    );

    assert.equal(parsed.isPaginated, true);
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.sortBy, 'productId');
    assert.equal(parsed.sortOrder, 'DESC');
    assert.deepEqual(parsed.order, [['productId', 'DESC']]);
  });

  it('computes pagination metadata and writes standard headers', () => {
    const meta = buildPaginationMeta(45, 2, 20);
    assert.deepEqual(meta, {
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });

    const emptyMeta = buildPaginationMeta(0, 1, 20);
    assert.equal(emptyMeta.totalPages, 0);
    assert.equal(emptyMeta.hasNextPage, false);
    assert.equal(emptyMeta.hasPrevPage, false);

    const headers = {};
    setPaginationHeaders({ setHeader: (k, v) => { headers[k] = v; } }, meta);
    assert.deepEqual(headers, {
      'X-Total-Count': '45',
      'X-Page': '2',
      'X-Limit': '20',
      'X-Total-Pages': '3',
    });
  });
});
