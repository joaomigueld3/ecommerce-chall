import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import ClientRepository from '../../../entities/repositories/ClientRepository.js';
import ClientService from '../../../entities/services/ClientService.js';
import ClientController from '../../primary/controllers/ClientController.js';
import Client from '../../../entities/models/Client.js';
import ClientValidation from '../../../validation/ClientValidation.js';

const clientRouter = express.Router();

const clientRepository = new ClientRepository(Client);
const clientService = new ClientService(clientRepository);
const clientController = new ClientController(clientService);

clientRouter.get('/', ClientValidation.getAllClientsSchema, clientController.getAllClients.bind(clientController));
clientRouter.post('/search', requireAdmin, ClientValidation.getClientByNameSchema, clientController.getClientByName.bind(clientController));
clientRouter.post('/filters', requireAdmin, ClientValidation.getClientsByFiltersSchema, clientController.getClientsByFilters.bind(clientController));
clientRouter.get('/:clientId', ClientValidation.getClientByIdSchema, clientController.getClientById.bind(clientController));
clientRouter.post('/', ClientValidation.createClientSchema, clientController.createClient.bind(clientController));
clientRouter.put('/:clientId', ClientValidation.updateClientSchema, clientController.updateClient.bind(clientController));
clientRouter.delete('/:clientId', requireAdmin, ClientValidation.deleteClientSchema, clientController.deleteClient.bind(clientController));

export default clientRouter;
