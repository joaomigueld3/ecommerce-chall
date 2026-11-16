import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';

function buildClientFilters(filters) {
  const filterOptions = {};
  if (filters.fullName) {
    filterOptions.fullName = { [Op.iLike]: `%${filters.fullName}%` };
  }
  if (filters.contact) {
    filterOptions.contact = { [Op.iLike]: `%${filters.contact}%` };
  }
  if (filters.address) {
    filterOptions.address = { [Op.iLike]: `%${filters.address}%` };
  }
  if (filters.status !== undefined && filters.status !== '') {
    filterOptions.status = filters.status === true || filters.status === 'true';
  }
  return filterOptions;
}

class ClientController {
  constructor(clientService) {
    this.clientService = clientService;
  }

  async getAllClients(req, res) {
    try {
      const filterOptions = buildClientFilters(req.query);
      if (req.user?.type === 'Client') {
        filterOptions.userId = req.user.id;
      }

      const clients = Object.keys(filterOptions).length > 0
        ? await this.clientService.getClientsByFilters(filterOptions)
        : await this.clientService.getAllClients();

      return res.status(200).json({ allClients: clients });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getClientById(req, res) {
    try {
      const { clientId } = req.params;
      const client = await this.clientService.getClientById(clientId);
      if (!client) return errorHandlerCustom(res, 'Client not found.', 404);

      if (req.user?.type === 'Client' && Number(client.userId) !== Number(req.user.id)) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

      return res.status(200).json(client);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createClient(req, res) {
    try {
      const clientPayload = { ...req.body };
      if (req.user?.type === 'Client') {
        clientPayload.userId = req.user.id;
      }
      const newClient = await this.clientService.createClient(clientPayload);
      return res.status(201).json(newClient);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateClient(req, res) {
    try {
      const { clientId } = req.params;
      const updatedClient = { ...req.body };
      const client = await this.clientService.getClientById(clientId);
      if (!client) return errorHandlerCustom(res, 'Client not found.', 404);

      if (req.user?.type === 'Client') {
        if (Number(client.userId) !== Number(req.user.id)) {
          return errorHandlerCustom(res, 'Permission denied.', 403);
        }
        delete updatedClient.userId;
      }

      if (updatedClient.contact) {
        const verifyContact = await this.clientService.getClientByContact(updatedClient.contact);
        if (verifyContact && Number(verifyContact.clientId) !== Number(clientId)) {
          return errorHandlerCustom(res, 'Contact already in use.', 400);
        }
      }

      await this.clientService.updateClient(clientId, updatedClient);
      const refreshedClient = await this.clientService.getClientById(clientId);
      return res.status(200).json({
        message: 'Client updated successfully.',
        updatedClient: refreshedClient,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteClient(req, res) {
    try {
      const { clientId } = req.params;
      const client = await this.clientService.getClientById(clientId);
      if (!client) return errorHandlerCustom(res, 'Client not found.', 404);

      const deletedClient = client;
      await this.clientService.deleteClient(clientId);
      return res.status(200).json({ message: 'Client deleted successfully.', deletedClient });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getClientByName(req, res) {
    try {
      const { fullName } = req.body;
      const client = await this.clientService.getClientByName(fullName);
      if (!client || client.length === 0) return errorHandlerCustom(res, 'Client not found.', 404);

      return res.status(200).json(client);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getClientsByFilters(req, res) {
    try {
      const filterOptions = buildClientFilters(req.body);
      if (req.user?.type === 'Client') {
        filterOptions.userId = req.user.id;
      }

      const filteredClients = await this.clientService.getClientsByFilters(filterOptions);
      if (filteredClients.length < 1) {
        return res.status(404).json({ error: 'Clients not found' });
      }

      return res.status(200).json(filteredClients);
    } catch (error) {
      return errorHandler(error, res);
    }
  }
}

export default ClientController;
