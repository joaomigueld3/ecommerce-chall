import './bufferCompat.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../entities/models/User.js';

dotenv.config({ path: '.env' });

const secretKey = process.env.JWT_SECRET || 'dev-jwt-secret';

function normalizePath(req) {
  const combined = `${req.baseUrl || ''}${req.path || ''}`;
  const withoutTrailing = combined.replace(/\/+$/, '') || '/';
  return withoutTrailing.startsWith('/api')
    ? withoutTrailing.slice(4) || '/'
    : withoutTrailing;
}

function isClientAllowed(req, userId) {
  const { method } = req;
  const path = normalizePath(req);

  if (path === '/products' && method === 'GET') return true;
  if (/^\/products\/\d+$/.test(path) && method === 'GET') return true;
  if (path === '/products/filters' && method === 'POST') return true;
  if (/^\/products\/\d+\/reviews$/.test(path) && (method === 'GET' || method === 'POST')) return true;
  if (/^\/products\/\d+\/reviews\/\d+\/helpful$/.test(path) && method === 'POST') return true;
  if (/^\/products\/\d+\/questions$/.test(path) && (method === 'GET' || method === 'POST')) return true;
  if (/^\/products\/\d+\/related$/.test(path) && method === 'GET') return true;

  if (path === '/change-password' && method === 'PUT') return true;

  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch && (method === 'GET' || method === 'PUT')) {
    return Number(userMatch[1]) === Number(userId);
  }

  if (path === '/clients' && (method === 'GET' || method === 'POST')) return true;
  if (/^\/clients\/\d+$/.test(path) && (method === 'GET' || method === 'PUT')) return true;
  if (/^\/clients\/\d+\/addresses$/.test(path) && (method === 'GET' || method === 'POST')) return true;
  if (/^\/clients\/\d+\/addresses\/\d+$/.test(path) && (method === 'PUT' || method === 'DELETE')) return true;
  if (/^\/clients\/\d+\/payment-methods$/.test(path) && (method === 'GET' || method === 'POST')) return true;
  if (/^\/clients\/\d+\/payment-methods\/\d+\/default$/.test(path) && method === 'PATCH') return true;
  if (/^\/clients\/\d+\/payment-methods\/\d+$/.test(path) && method === 'DELETE') return true;

  if (path === '/wishlists' && method === 'GET') return true;
  if (path === '/wishlists/items' && method === 'POST') return true;
  if (/^\/wishlists\/items\/\d+$/.test(path) && method === 'DELETE') return true;

  if (path === '/orders' && (method === 'GET' || method === 'POST')) return true;
  if (path === '/orders/checkout' && method === 'POST') return true;
  if (path === '/orders/filters' && method === 'POST') return true;
  if (/^\/orders\/\d+$/.test(path) && method === 'GET') return true;
  if (/^\/orders\/\d+\/summary$/.test(path) && method === 'GET') return true;
  if (/^\/orders\/\d+\/payment$/.test(path) && method === 'POST') return true;
  if (/^\/orders\/\d+\/cancel$/.test(path) && method === 'POST') return true;

  if (path === '/order-items' && (method === 'GET' || method === 'POST')) return true;
  if (/^\/order-items\/\d+$/.test(path) && method === 'GET') return true;

  return false;
}

async function authenticateToken(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(400).json({ message: 'Missing authentication token.' });
  }

  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, secretKey, (err, payload) => {
        if (err) reject(err);
        else resolve(payload);
      });
    });

    const verifyUser = await User.findByPk(decoded.id);
    if (!verifyUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.id = verifyUser.id;
    req.email = verifyUser.email;
    req.type = verifyUser.type;
    req.user = {
      id: verifyUser.id,
      email: verifyUser.email,
      type: verifyUser.type,
    };

    if (req.user.type === 'Admin') {
      return next();
    }

    if (req.user.type === 'Client' && isClientAllowed(req, req.user.id)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Permission denied: User is type Client',
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Invalid Token.' });
    }
    return res.status(500).json({ message: `Token error: ${error.message}` });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.type !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Permission denied: Admin access required.',
    });
  }
  return next();
}

async function optionalAuthenticateToken(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization) {
    return next();
  }

  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  if (!token) {
    return next();
  }

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, secretKey, (err, payload) => {
        if (err) reject(err);
        else resolve(payload);
      });
    });

    const verifyUser = await User.findByPk(decoded.id);
    if (verifyUser) {
      req.id = verifyUser.id;
      req.email = verifyUser.email;
      req.type = verifyUser.type;
      req.user = {
        id: verifyUser.id,
        email: verifyUser.email,
        type: verifyUser.type,
      };
    }
  } catch {
    // Public endpoint: ignore invalid/expired optional tokens and proceed as guest
  }

  return next();
}

export default authenticateToken;
export { requireAdmin, optionalAuthenticateToken };
