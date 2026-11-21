import '../../../utils/bufferCompat.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';
import transporter from '../../../utils/transporter.js';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../../../utils/pagination.js';

const USER_SORT_FIELDS = ['id', 'name', 'email', 'type', 'confirmed', 'createdAt', 'updatedAt'];

dotenv.config({ path: '.env' });

const secretKey = process.env.JWT_SECRET || 'dev-jwt-secret';
const secretKeyRefresh = process.env.JWT_SECRET_REFRESH || 'dev-jwt-refresh-secret';
const emailSecret = process.env.EMAIL_SECRET || 'dev-email-secret';

function sanitizeUser(user) {
  if (!user) return null;
  return typeof user.toDict === 'function' ? user.toDict() : user;
}

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getAllUsers(req, res) {
    try {
      const { name, email, type } = req.query;
      const filterOptions = {};
      if (name) filterOptions.name = { [Op.iLike]: `%${name}%` };
      if (email) filterOptions.email = { [Op.iLike]: `%${email}%` };
      if (type) filterOptions.type = type;

      const {
        isPaginated,
        page,
        limit,
        offset,
        order,
      } = parsePaginationAndSort(req.query, {
        allowedSortFields: USER_SORT_FIELDS,
        defaultSortField: 'id',
        defaultSortOrder: 'DESC',
        tieBreakerField: 'id',
      });

      if (isPaginated) {
        const { rows, count } = await this.userService.getUsersPaginated(filterOptions, {
          order,
          limit,
          offset,
        });
        const pagination = buildPaginationMeta(count, page, limit);
        setPaginationHeaders(res, pagination);
        return res.status(200).json({ allUsers: rows.map(sanitizeUser), pagination });
      }

      const users = Object.keys(filterOptions).length > 0
        ? await this.userService.getUsersByFilters(filterOptions, { order })
        : await this.userService.getAllUsers({ order });

      return res.status(200).json({ allUsers: users.map(sanitizeUser) });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      if (req.user?.type === 'Client' && Number(id) !== Number(req.user.id)) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

      const user = await this.userService.getUserById(id);
      if (!user) return errorHandlerCustom(res, 'User not found.', 404);

      return res.status(200).json(sanitizeUser(user));
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createUser(req, res) {
    try {
      const isAdminRequester = req.user?.type === 'Admin';
      const userPayload = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        type: isAdminRequester && req.body.type ? req.body.type : 'Client',
        confirmed: isAdminRequester ? Boolean(req.body.confirmed ?? true) : false,
      };

      const newUser = await this.userService.createUser(userPayload);

      const emailToken = jwt.sign(
        { user: newUser.id },
        emailSecret,
        { expiresIn: '1d' },
      );

      const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 9095}`;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const url = `${apiBaseUrl}/api/confirmation/${emailToken}`;
      const confirmationUrl = `${frontendUrl}/confirm-email/${emailToken}`;

      await transporter.sendMail({
        to: userPayload.email,
        subject: 'Confirm Email',
        html: `Please click this link to confirm your email: <a href="${confirmationUrl}">${confirmationUrl}</a>`,
      });

      return res.status(201).json({
        newUser: sanitizeUser(newUser),
        url,
        confirmationToken: emailToken,
        confirmationUrl,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      if (req.user?.type === 'Client' && Number(id) !== Number(req.user.id)) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

      const user = await this.userService.getUserById(id);
      if (!user) return errorHandlerCustom(res, 'User not found.', 404);

      const updatedFields = { ...req.body };
      if (req.user?.type !== 'Admin') {
        delete updatedFields.type;
        delete updatedFields.confirmed;
      }

      await this.userService.updateUser(id, updatedFields);
      const refreshed = await this.userService.getUserById(id);
      return res.status(200).json({
        message: 'User updated successfully.',
        updatedUser: sanitizeUser(refreshed),
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      if (!user) return errorHandlerCustom(res, 'User not found.', 404);

      const userDeleted = sanitizeUser(user);
      await this.userService.deleteUser(id);
      return res.status(200).json({ message: 'User removed successfully.', userDeleted });
    } catch (error) {
      return errorHandler(error, res);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await this.userService.login(email, password);

      const token = jwt.sign({ id: user.id, email: user.email, type: user.type }, secretKey, { expiresIn: '5h' });
      const refreshToken = jwt.sign({ id: user.id, email: user.email, type: user.type }, secretKeyRefresh, { expiresIn: '30 days' });

      return res.status(200).json({
        message: 'Login successful.',
        user: sanitizeUser(user),
        token,
        refreshToken,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async changePassword(req, res) {
    try {
      const { email, password } = req.body;
      if (req.email !== email) {
        return res.status(403).json({ message: 'You are not allowed to change this users password.' });
      }

      await this.userService.changePassword(email, password);
      const updatedUser = await this.userService.getUserByEmail(email);
      return res.status(200).json({
        message: 'Password changed successfully.',
        user: sanitizeUser(updatedUser),
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async refreshToken(req, res) {
    try {
      const { authorization } = req.headers;
      let token = null;

      if (authorization) {
        token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
      } else if (req.body?.refreshToken) {
        token = req.body.refreshToken;
      }

      if (!token) {
        return errorHandlerCustom(res, 'Authentication token not provided.', 401);
      }

      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, secretKeyRefresh, (err, payload) => {
          if (err) reject(err);
          else resolve(payload);
        });
      });

      const { id, email } = decoded;
      if (!id || !email) return res.status(401).json({ message: 'Invalid user.' });

      const verifyUser = await this.userService.getUserByEmail(email);
      if (!verifyUser) return res.status(404).json({ message: 'User not found.' });

      const newToken = jwt.sign(
        { id: verifyUser.id, email: verifyUser.email, type: verifyUser.type },
        secretKey,
        { expiresIn: '6h' },
      );
      const newRefreshToken = jwt.sign(
        { id: verifyUser.id, email: verifyUser.email, type: verifyUser.type },
        secretKeyRefresh,
        { expiresIn: '30 days' },
      );

      return res.status(200).json({
        token: newToken,
        refreshToken: newRefreshToken,
      });
    } catch (e) {
      if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid Token.' });
      }
      return errorHandler(e, res);
    }
  }

  async getUsersByFilters(req, res) {
    try {
      const filters = req.body;

      const filterOptions = {};
      if (filters.name) {
        filterOptions.name = { [Op.iLike]: `%${filters.name}%` };
      }
      if (filters.email) {
        filterOptions.email = { [Op.iLike]: `%${filters.email}%` };
      }
      if (filters.type) {
        filterOptions.type = filters.type;
      }

      const filteredUsers = await this.userService.getUsersByFilters(filterOptions);
      if (filteredUsers.length < 1) {
        return res.status(404).json({ error: 'Users not found' });
      }

      return res.status(200).json(filteredUsers.map(sanitizeUser));
    } catch (error) {
      return errorHandler(error, res);
    }
  }

  async emailConfirmation(req, res) {
    try {
      const decoded = jwt.verify(req.params.token, emailSecret);
      const userId = decoded.user;
      const userAux = await this.userService.getUserById(userId);
      if (!userAux) return errorHandlerCustom(res, 'User not found.', 404);

      await this.userService.updateUser(userId, { confirmed: true });

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(200).json({
          message: 'Email confirmed successfully.',
          confirmed: true,
        });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?confirmed=1`);
    } catch (e) {
      if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
        return errorHandlerCustom(res, 'Invalid or expired confirmation token.', 400);
      }
      return errorHandler(e, res);
    }
  }
}

export default UserController;
