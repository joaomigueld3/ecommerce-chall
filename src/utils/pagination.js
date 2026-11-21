function parsePositiveInt(rawValue, fallback) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(rawValue), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function parsePaginationAndSort(query = {}, options = {}) {
  const {
    allowedSortFields = [],
    defaultSortField = 'id',
    defaultSortOrder = 'DESC',
    defaultLimit = 20,
    maxLimit = 100,
    tieBreakerField = defaultSortField,
  } = options;

  const isPaginated = (query.page !== undefined && query.page !== '')
    || (query.limit !== undefined && query.limit !== '');

  const page = parsePositiveInt(query.page, 1);
  const rawLimit = parsePositiveInt(query.limit, defaultLimit);
  const limit = Math.min(rawLimit, maxLimit);
  const offset = (page - 1) * limit;

  const fieldMap = Array.isArray(allowedSortFields)
    ? Object.fromEntries(allowedSortFields.map((field) => [field, field]))
    : allowedSortFields;

  const requestedSortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : '';
  const sortField = Object.prototype.hasOwnProperty.call(fieldMap, requestedSortBy)
    ? fieldMap[requestedSortBy]
    : (fieldMap[defaultSortField] || defaultSortField);

  const requestedOrder = typeof query.sortOrder === 'string' ? query.sortOrder.trim().toUpperCase() : '';
  const sortOrder = requestedOrder === 'ASC' || requestedOrder === 'DESC'
    ? requestedOrder
    : defaultSortOrder.toUpperCase();

  const order = [[sortField, sortOrder]];
  if (tieBreakerField && tieBreakerField !== sortField) {
    order.push([tieBreakerField, 'DESC']);
  }

  return {
    isPaginated,
    page,
    limit,
    offset,
    sortBy: Object.prototype.hasOwnProperty.call(fieldMap, requestedSortBy)
      ? requestedSortBy
      : defaultSortField,
    sortOrder,
    order,
  };
}

function buildPaginationMeta(total, page, limit) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / limit);
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && totalPages > 0,
  };
}

function setPaginationHeaders(res, meta) {
  if (!res || typeof res.setHeader !== 'function' || !meta) return;
  res.setHeader('X-Total-Count', String(meta.total));
  res.setHeader('X-Page', String(meta.page));
  res.setHeader('X-Limit', String(meta.limit));
  res.setHeader('X-Total-Pages', String(meta.totalPages));
}

export {
  parsePaginationAndSort,
  buildPaginationMeta,
  setPaginationHeaders,
};
