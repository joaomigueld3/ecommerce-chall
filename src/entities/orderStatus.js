const OrderStatus = {
  Received: 'Received',
  InPreparation: 'In Preparation',
  Dispatched: 'Dispatched',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

const ALLOWED_TRANSITIONS = {
  [OrderStatus.Received]: [OrderStatus.InPreparation, OrderStatus.Cancelled],
  [OrderStatus.InPreparation]: [OrderStatus.Dispatched, OrderStatus.Cancelled],
  [OrderStatus.Dispatched]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
};

const CANCELLABLE_STATUSES = [OrderStatus.Received, OrderStatus.InPreparation];

function isTransitionAllowed(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export {
  OrderStatus,
  ALLOWED_TRANSITIONS,
  CANCELLABLE_STATUSES,
  isTransitionAllowed,
};
