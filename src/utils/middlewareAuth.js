/* eslint-disable import/no-extraneous-dependencies */
// middleware de autenticação
import './bufferCompat.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../entities/models/User.js';

dotenv.config({ path: '.env' });

const secretKey = process.env.JWT_SECRET;

async function authenticateToken(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    res.status(400).json({ message: 'Missing authentication token.' });
    return;
  }

  // const [, token] = authorization.split(' '); // separando o Bearer do token lá do headers do postman

  let token;
  if (authorization.startsWith('Bearer ')) token = authorization.slice(7);
  else token = authorization;

  try {
    // eslint-disable-next-line consistent-return
    jwt.verify(token, secretKey, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid Token.' });
      }
      // Decodificou com sucesso o token, podemos armazenar o ID do usuário para uso posterior se necessário
      req.id = decoded.id;
      req.email = decoded.email;
      req.type = decoded.type;
      const { id } = req;
      const verifyUser = await User.findByPk(id);
      if (!verifyUser) {
        return res.status(404).json({ message: 'User not found.' });
      }
      const user = {
        id: req.id,
        email: req.email,
        type: req.type,
      };
      req.user = user;

      // Verificar o tipo do usuário antes de permitir o acesso
      if (req.user.type === 'Client') {
        // Adicione as rotas específicas que os usuários do tipo 'Client' podem acessar
        if (
          (req.originalUrl === '/signin' && req.method === 'POST')
          || (req.originalUrl.startsWith('/users/') && req.method === 'PUT' && req.params.id === req.user.id.toString())
          || (req.originalUrl === '/products' && req.method === 'GET')
          || (req.originalUrl === '/orders' && req.method === 'POST')
        ) {
          // Acesso permitido para as rotas especificadas
          return next();
        }

        // Adicione outras verificações conforme necessário
        return res.status(403).json({ message: 'Permission denied: User is type Client' });
      }
      next();
    });
  } catch (error) {
    res.status(500).json({ message: `Token error: ${error.message}` });
  }
}

export default authenticateToken;
