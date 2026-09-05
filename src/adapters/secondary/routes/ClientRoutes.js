import express from 'express';
import { authorize } from '../../../utils/authorize.js';
import ClientRepository from '../../../entities/repositories/ClientRepository.js';
import ClientService from '../../../entities/services/ClientService.js';
import ClientController from '../../primary/controllers/ClientController.js';
import Client from '../../../entities/models/Client.js';
import ClientValidation from '../../../validation/ClientValidation.js';

const clientRouter = express.Router();

const clientRepository = new ClientRepository(Client);
const clientService = new ClientService(clientRepository);
const clientController = new ClientController(clientService);

clientRouter.use(authorize('Admin'));

clientRouter.get('/', ClientValidation.getAllClientsSchema, clientController.getAllClients.bind(clientController));
clientRouter.get('/:clientId', ClientValidation.getClientByIdSchema, clientController.getClientById.bind(clientController));
clientRouter.post('/search', ClientValidation.getClientByNameSchema, clientController.getClientByName.bind(clientController));
clientRouter.post('/', ClientValidation.createClientSchema, clientController.createClient.bind(clientController));
clientRouter.put('/:clientId', ClientValidation.updateClientSchema, clientController.updateClient.bind(clientController));
clientRouter.delete('/:clientId', ClientValidation.deleteClientSchema, clientController.deleteClient.bind(clientController));
clientRouter.post('/filters', ClientValidation.getClientsByFiltersSchema, clientController.getClientsByFilters.bind(clientController));

export default clientRouter;
