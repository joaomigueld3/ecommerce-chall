import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import ClientRepository from '../../../entities/repositories/ClientRepository.js';
import ClientService from '../../../entities/services/ClientService.js';
import ClientProfileService from '../../../entities/services/ClientProfileService.js';
import ClientController from '../../primary/controllers/ClientController.js';
import Client from '../../../entities/models/Client.js';
import ClientAddress from '../../../entities/models/ClientAddress.js';
import SavedPaymentMethod from '../../../entities/models/SavedPaymentMethod.js';
import Order from '../../../entities/models/Order.js';
import User from '../../../entities/models/User.js';
import ClientValidation from '../../../validation/ClientValidation.js';
import Phase3Validation from '../../../validation/Phase3Validation.js';
import connection from '../../../database/index.js';

const clientRouter = express.Router();

const clientRepository = new ClientRepository(Client);
const clientService = new ClientService(clientRepository, { Order });
const clientProfileService = new ClientProfileService(
  {
    Client, ClientAddress, SavedPaymentMethod, Order, User,
  },
  connection,
);
const clientController = new ClientController(clientService, clientProfileService);

clientRouter.get('/', ClientValidation.getAllClientsSchema, clientController.getAllClients.bind(clientController));
clientRouter.post('/search', requireAdmin, ClientValidation.getClientByNameSchema, clientController.getClientByName.bind(clientController));
clientRouter.post('/filters', requireAdmin, ClientValidation.getClientsByFiltersSchema, clientController.getClientsByFilters.bind(clientController));

clientRouter.get('/:clientId/overview', requireAdmin, ClientValidation.getClientByIdSchema, clientController.getClientOverview.bind(clientController));
clientRouter.patch('/:clientId/crm', requireAdmin, ClientValidation.getClientByIdSchema, Phase3Validation.updateClientCrmSchema, clientController.updateClientCrm.bind(clientController));

clientRouter.get('/:clientId/addresses', ClientValidation.getClientByIdSchema, clientController.listAddresses.bind(clientController));
clientRouter.post('/:clientId/addresses', ClientValidation.getClientByIdSchema, Phase3Validation.createAddressSchema, clientController.createAddress.bind(clientController));
clientRouter.put('/:clientId/addresses/:addressId', Phase3Validation.updateAddressSchema, clientController.updateAddress.bind(clientController));
clientRouter.delete('/:clientId/addresses/:addressId', clientController.deleteAddress.bind(clientController));

clientRouter.get('/:clientId/payment-methods', ClientValidation.getClientByIdSchema, clientController.listPaymentMethods.bind(clientController));
clientRouter.post('/:clientId/payment-methods', ClientValidation.getClientByIdSchema, Phase3Validation.createPaymentMethodSchema, clientController.createPaymentMethod.bind(clientController));
clientRouter.patch('/:clientId/payment-methods/:paymentMethodId/default', clientController.setDefaultPaymentMethod.bind(clientController));
clientRouter.delete('/:clientId/payment-methods/:paymentMethodId', clientController.deletePaymentMethod.bind(clientController));

clientRouter.get('/:clientId', ClientValidation.getClientByIdSchema, clientController.getClientById.bind(clientController));
clientRouter.post('/', ClientValidation.createClientSchema, clientController.createClient.bind(clientController));
clientRouter.put('/:clientId', ClientValidation.updateClientSchema, clientController.updateClient.bind(clientController));
clientRouter.delete('/:clientId', requireAdmin, ClientValidation.deleteClientSchema, clientController.deleteClient.bind(clientController));

export default clientRouter;
