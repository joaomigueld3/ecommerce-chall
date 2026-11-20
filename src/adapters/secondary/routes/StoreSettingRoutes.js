import express from 'express';
import authToken, { requireAdmin } from '../../../utils/middlewareAuth.js';
import StoreSetting from '../../../entities/models/StoreSetting.js';
import StoreSettingService from '../../../entities/services/StoreSettingService.js';
import StoreSettingController from '../../primary/controllers/StoreSettingController.js';
import Phase3Validation from '../../../validation/Phase3Validation.js';

const storeSettingRouter = express.Router();
const storeSettingService = new StoreSettingService(StoreSetting);
const storeSettingController = new StoreSettingController(storeSettingService);

storeSettingRouter.get('/', storeSettingController.getSettings.bind(storeSettingController));
storeSettingRouter.put('/', authToken, requireAdmin, Phase3Validation.updateStoreSettingsSchema, storeSettingController.updateSettings.bind(storeSettingController));

export default storeSettingRouter;
