function authorize(...allowedTypes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }
    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ message: `Permission denied for user type '${req.user.type}'.` });
    }
    return next();
  };
}

function selfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    if (req.user.type === 'Admin' || String(req.user.id) === String(req.params[paramName])) {
      return next();
    }
    return res.status(403).json({ message: 'Permission denied: you can only access your own resource.' });
  };
}

export { authorize, selfOrAdmin };
