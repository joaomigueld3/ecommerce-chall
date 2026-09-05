import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';
import transporter from '../../../utils/transporter.js';

const secretKey = process.env.JWT_SECRET;
const secretKeyRefresh = process.env.JWT_SECRET_REFRESH;
const emailSecret = process.env.EMAIL_SECRET;

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getAllUsers(req, res) {
    try {
      const users = await this.userService.getAllUsers();
      return res.status(200).json({ allUsers: users });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      if (!user) return errorHandlerCustom(res, 'User not found.', 404);

      return res.status(200).json(user);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createUser(req, res) {
    try {
      const user = req.body;
      const newUser = await this.userService.createUser(user);

      let url = '';
      const emailToken = jwt.sign(
        {
          user: newUser.id,
        },
        emailSecret,
        {
          expiresIn: '1d',
        },
      );

      url = `http://localhost:9095/api/confirmation/${emailToken}`;

      await transporter.sendMail({
        to: user.email,
        subject: 'Confirm Email',
        html: `Please click this email to confirm your email: <a href="${url}">${url}</a>`,
      });

      return res.status(201).json({ newUser, url });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updatedUser = req.body;
      const user = await this.userService.getUserById(id);
      if (!user) return errorHandlerCustom(res, 'User not found.', 404);

      await this.userService.updateUser(id, updatedUser);
      return res.status(200).json({ message: 'User updated successfully.', updatedUser });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      if (!user) return errorHandlerCustom(res, 'User not found.', 404);

      const userDeleted = user;

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
        user,
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

      const user = await this.userService.changePassword(email, password);
      return res.status(200).json({ message: 'Password changed successfully.', user });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  // eslint-disable-next-line consistent-return
  async refreshToken(req, res) {
    try {
      const { authorization } = req.headers;
      if (!authorization) return errorHandlerCustom(res, 'Authentication token not provided.', 401);

      const [, refreshToken] = authorization.split(' ');
      jwt.verify(refreshToken, secretKeyRefresh, async (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid Token.' });

        const { id, email, type } = decoded;

        if (!id || !email) return res.status(401).json({ message: 'Invalid user.' });

        const verifyUser = await this.userService.getUserByEmail(email);
        if (!verifyUser) return res.status(404).json({ message: 'User not found.' });

        const newToken = jwt.sign({ id, email, type }, secretKey, { expiresIn: '6h' });
        const newRefreshToken = jwt.sign(
          { id, email, type },
          secretKeyRefresh,
          { expiresIn: '30 days' },
        );

        return res.status(200).json({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      });
    } catch (e) {
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

      return res.status(200).json(filteredUsers);
    } catch (error) {
      return errorHandler(error, res);
    }
  }

  async emailConfirmation(req, res) {
    try {
      const id = jwt.verify(req.params.token, emailSecret);
      const userAux = await this.userService.getUserById(id.user);
      userAux.confirmed = true;
      await this.userService.updateUser(id, userAux);
      return res.redirect('http://localhost:9095/api/login');
      // return res.status(200).json({ message: 'User updated successfully.', updatedUser });
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default UserController;
