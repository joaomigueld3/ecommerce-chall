import { CustomError } from '../../utils/errorHandler.js';
import { validateRegionalDocument } from '../../utils/documentValidator.js';

class ClientService {
  constructor(clientRepository, dependencies = {}) {
    this.clientRepository = clientRepository;
    this.Order = dependencies.Order ?? null;
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

  async getAllClients(options = {}) {
    return this.clientRepository.findAll(options);
  }

  static normalizePayload(payload) {
    const normalized = { ...payload };
    if (normalized.documentType === '') normalized.documentType = null;
    if (normalized.documentNumber === '') normalized.documentNumber = null;
    if (normalized.birthDate === '') normalized.birthDate = null;
    if (normalized.email === '') normalized.email = null;
    if (normalized.phone === '') normalized.phone = null;

    if (normalized.documentType || normalized.documentNumber) {
      const check = validateRegionalDocument(normalized.documentType, normalized.documentNumber);
      if (!check.valid) {
        throw new CustomError(check.message, 400);
      }
      normalized.documentNumber = check.normalized;
    }

    return normalized;
  }

  async createClient(client) {
    const payload = ClientService.normalizePayload(client);
    const { contact, userId, documentNumber } = payload;

    const verifyContact = await this.clientRepository.findByContact(contact);
    if (verifyContact) throw new CustomError('Contact already in use.', 400);

    if (documentNumber) {
      const existingDoc = await this.clientRepository.findByFilters({ documentNumber });
      if (existingDoc.length > 0) {
        throw new CustomError('Document number already registered to another client.', 409);
      }
    }

    if (userId) {
      const existingForUser = await this.clientRepository.findByUserId(userId);
      if (existingForUser) throw new CustomError('User already has a client profile.', 400);
    }

    return this.clientRepository.create(payload);
  }

  async updateClient(clientId, updatedClient) {
    const payload = ClientService.normalizePayload(updatedClient);
    if (payload.documentNumber) {
      const existingDoc = await this.clientRepository.findByFilters({ documentNumber: payload.documentNumber });
      const conflict = existingDoc.find((c) => Number(c.clientId) !== Number(clientId));
      if (conflict) {
        throw new CustomError('Document number already registered to another client.', 409);
      }
    }

    return this.clientRepository.update(clientId, payload);
  }

  async deleteClient(clientId) {
    const client = await this.clientRepository.findById(clientId);
    if (!client) return null;

    if (this.Order) {
      const ordersCount = await this.Order.count({ where: { clientId } });
      if (ordersCount > 0) {
        await this.clientRepository.update(clientId, {
          status: false,
          blockedReason: client.blockedReason || 'Deactivated by Admin (has order history)',
        });
        const deactivated = await this.clientRepository.findById(clientId);
        return { deactivated: true, client: deactivated };
      }
    }

    await this.clientRepository.delete(clientId);
    return { deactivated: false, client };
  }

  async getClientByName(name) {
    return this.clientRepository.findByName(name);
  }

  async getClientsByFilters(filters, options = {}) {
    return this.clientRepository.findByFilters(filters, options);
  }

  async getClientsPaginated(filters = {}, options = {}) {
    return this.clientRepository.findAndCountByFilters(filters, options);
  }
}

export default ClientService;
