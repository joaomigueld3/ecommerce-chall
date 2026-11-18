import bcrypt from 'bcrypt';
import { CustomError } from '../../utils/errorHandler.js';

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getUserById(id) {
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email) {
    return this.userRepository.findByEmail(email);
  }

  async getAllUsers() {
    return this.userRepository.findAll();
  }

  async createUser(user) {
    const { email, password } = user;
    const verifyEmail = await this.userRepository.findByEmail(email);
    if (verifyEmail) throw new CustomError('Email already in use.', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.userRepository.create({
      name: user.name,
      email: user.email,
      password: hashedPassword,
      type: user.type || 'Client',
      confirmed: Boolean(user.confirmed),
    });
  }

  async updateUser(id, updatedUser) {
    return this.userRepository.update(id, updatedUser);
  }

  async deleteUser(id) {
    return this.userRepository.delete(id);
  }

  async login(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new CustomError('User not found.', 404);

    if (!user.confirmed) throw new CustomError('Please confirm your email to login', 400);

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new CustomError('Wrong password.', 400);

    return user;
  }

  async changePassword(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new CustomError('User not found.', 404);

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.userRepository.updateByEmail(email, { password: hashedPassword });
  }

  async getUsersByFilters(filters) {
    return this.userRepository.findByFilters(filters);
  }
}

export default UserService;
