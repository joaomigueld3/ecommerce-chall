import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../../../utils/pagination.js';

const CLIENT_SORT_FIELDS = [
  'clientId',
  'fullName',
  'contact',
  'country',
  'tier',
  'status',
  'createdAt',
  'updatedAt',
];

function serializeClient(client, isAdmin) {
  if (!client) return null;
  return typeof client.toDict === 'function'
    ? client.toDict({ includeInternal: isAdmin })
    : client;
}

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
  if (filters.country) {
    filterOptions.country = filters.country;
  }
  if (filters.tier) {
    filterOptions.tier = filters.tier;
  }
  if (filters.status !== undefined && filters.status !== '') {
    filterOptions.status = filters.status === true || filters.status === 'true';
  }
  return filterOptions;
}

class ClientController {
  constructor(clientService, clientProfileService = null) {
    this.clientService = clientService;
    this.clientProfileService = clientProfileService;
  }

  async assertClientOwnership(req, clientId) {
    if (req.user?.type === 'Admin') return true;
    const client = await this.clientService.getClientById(clientId);
    if (!client) return null;
    return Number(client.userId) === Number(req.user?.id);
  }

  async getAllClients(req, res) {
    try {
      const isAdmin = req.user?.type === 'Admin';
      const filterOptions = buildClientFilters(req.query);
      if (req.user?.type === 'Client') {
        filterOptions.userId = req.user.id;
      }

      const {
        isPaginated,
        page,
        limit,
        offset,
        order,
      } = parsePaginationAndSort(req.query, {
        allowedSortFields: CLIENT_SORT_FIELDS,
        defaultSortField: 'clientId',
        defaultSortOrder: 'DESC',
        tieBreakerField: 'clientId',
      });

      if (isPaginated) {
        const { rows, count } = await this.clientService.getClientsPaginated(filterOptions, {
          order,
          limit,
          offset,
        });
        const pagination = buildPaginationMeta(count, page, limit);
        setPaginationHeaders(res, pagination);
        return res.status(200).json({
          allClients: rows.map((c) => serializeClient(c, isAdmin)),
          pagination,
        });
      }

      const clients = Object.keys(filterOptions).length > 0
        ? await this.clientService.getClientsByFilters(filterOptions, { order })
        : await this.clientService.getAllClients({ order });

      return res.status(200).json({
        allClients: clients.map((c) => serializeClient(c, isAdmin)),
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getClientById(req, res) {
    try {
      const isAdmin = req.user?.type === 'Admin';
      const { clientId } = req.params;
      const client = await this.clientService.getClientById(clientId);
      if (!client) return errorHandlerCustom(res, 'Client not found.', 404);

      if (req.user?.type === 'Client' && Number(client.userId) !== Number(req.user.id)) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

      return res.status(200).json(serializeClient(client, isAdmin));
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createClient(req, res) {
    try {
      const isAdmin = req.user?.type === 'Admin';
      const clientPayload = { ...req.body };
      if (!isAdmin) {
        clientPayload.userId = req.user.id;
        delete clientPayload.tier;
        delete clientPayload.loyaltyPoints;
        delete clientPayload.creditBalance;
        delete clientPayload.internalNotes;
        delete clientPayload.blockedReason;
      }
      const newClient = await this.clientService.createClient(clientPayload);
      return res.status(201).json(serializeClient(newClient, isAdmin));
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateClient(req, res) {
    try {
      const isAdmin = req.user?.type === 'Admin';
      const { clientId } = req.params;
      const updatedClient = { ...req.body };
      const client = await this.clientService.getClientById(clientId);
      if (!client) return errorHandlerCustom(res, 'Client not found.', 404);

      if (!isAdmin) {
        if (Number(client.userId) !== Number(req.user.id)) {
          return errorHandlerCustom(res, 'Permission denied.', 403);
        }
        delete updatedClient.userId;
        delete updatedClient.tier;
        delete updatedClient.loyaltyPoints;
        delete updatedClient.creditBalance;
        delete updatedClient.internalNotes;
        delete updatedClient.blockedReason;
        delete updatedClient.status;
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
        updatedClient: serializeClient(refreshedClient, isAdmin),
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteClient(req, res) {
    try {
      const { clientId } = req.params;
      const result = await this.clientService.deleteClient(clientId);
      if (!result) return errorHandlerCustom(res, 'Client not found.', 404);

      if (result.deactivated) {
        return res.status(200).json({
          message: 'Client has order history and was safely deactivated (status=false).',
          deactivated: true,
          deletedClient: serializeClient(result.client, true),
        });
      }

      return res.status(200).json({
        message: 'Client deleted successfully.',
        deactivated: false,
        deletedClient: serializeClient(result.client, true),
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getClientOverview(req, res) {
    try {
      const overview = await this.clientProfileService.getClientOverview(req.params.clientId);
      return res.status(200).json(overview);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateClientCrm(req, res) {
    try {
      const updatedClient = await this.clientProfileService.updateClientCrm(
        req.params.clientId,
        req.body,
      );
      return res.status(200).json({
        message: 'Client CRM profile updated.',
        updatedClient,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async listAddresses(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const addresses = await this.clientProfileService.listAddresses(req.params.clientId);
      return res.status(200).json({ addresses });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createAddress(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const address = await this.clientProfileService.createAddress(req.params.clientId, req.body);
      return res.status(201).json({ message: 'Address added successfully.', address });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateAddress(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const address = await this.clientProfileService.updateAddress(
        req.params.clientId,
        req.params.addressId,
        req.body,
      );
      return res.status(200).json({ message: 'Address updated successfully.', address });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteAddress(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const deletedAddress = await this.clientProfileService.deleteAddress(
        req.params.clientId,
        req.params.addressId,
      );
      return res.status(200).json({ message: 'Address deleted successfully.', deletedAddress });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async listPaymentMethods(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const paymentMethods = await this.clientProfileService.listPaymentMethods(req.params.clientId);
      return res.status(200).json({ paymentMethods });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createPaymentMethod(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const paymentMethod = await this.clientProfileService.createPaymentMethod(
        req.params.clientId,
        req.body,
      );
      return res.status(201).json({ message: 'Payment method saved.', paymentMethod });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async setDefaultPaymentMethod(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const paymentMethod = await this.clientProfileService.setDefaultPaymentMethod(
        req.params.clientId,
        req.params.paymentMethodId,
      );
      return res.status(200).json({ message: 'Default payment method updated.', paymentMethod });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deletePaymentMethod(req, res) {
    try {
      const owned = await this.assertClientOwnership(req, req.params.clientId);
      if (owned === null) return errorHandlerCustom(res, 'Client not found.', 404);
      if (!owned) return errorHandlerCustom(res, 'Permission denied.', 403);

      const deletedMethod = await this.clientProfileService.deletePaymentMethod(
        req.params.clientId,
        req.params.paymentMethodId,
      );
      return res.status(200).json({ message: 'Payment method removed.', deletedMethod });
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
