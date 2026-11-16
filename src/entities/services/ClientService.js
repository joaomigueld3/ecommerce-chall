import { CustomError } from '../../utils/errorHandler.js';

class ClientService {
  constructor(clientRepository) {
    this.clientRepository = clientRepository;
  }

  async getClientById(clientId) {
    return this.clientRepository.findById(clientId);
  }

  async getClientByUserId(userId) {
    return this.clientRepository.findByUserId(userId);
  }

  async getClientByContact(contact) {
    return this.clientRepository.findByContact(contact);
  }

  async getAllClients() {
    return this.clientRepository.findAll();
  }

  async createClient(client) {
    const { contact, userId } = client;
    const verifyContact = await this.clientRepository.findByContact(contact);
    if (verifyContact) throw new CustomError('Contact already in use.', 400);

    if (userId) {
      const existingForUser = await this.clientRepository.findByUserId(userId);
      if (existingForUser) throw new CustomError('User already has a client profile.', 400);
    }

    return this.clientRepository.create(client);
  }

  async updateClient(clientId, updatedClient) {
    return this.clientRepository.update(clientId, updatedClient);
  }

  async deleteClient(clientId) {
    return this.clientRepository.delete(clientId);
  }

  async getClientByName(name) {
    return this.clientRepository.findByName(name);
  }

  async getClientsByFilters(filters) {
    return this.clientRepository.findByFilters(filters);
  }
}

export default ClientService;
