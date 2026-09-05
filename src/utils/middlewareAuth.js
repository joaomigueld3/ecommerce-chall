import jwt from 'jsonwebtoken';
import User from '../entities/models/User.js';

async function authenticateToken(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: 'Missing authentication token.' });
  }

  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const secretKey = process.env.JWT_SECRET;

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, secretKey, (err, payload) => {
        if (err) reject(err);
        else resolve(payload);
      });
    });

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid Token.' });
  }
}

export default authenticateToken;
