import { errorHandler } from '../../../utils/errorHandler.js';

class StoreSettingController {
  constructor(storeSettingService) {
    this.storeSettingService = storeSettingService;
  }

  async getSettings(req, res) {
    try {
      const settings = await this.storeSettingService.getOrCreateSettings();
      return res.status(200).json({ settings: settings.toDict ? settings.toDict() : settings });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateSettings(req, res) {
    try {
      const updated = await this.storeSettingService.updateSettings(req.body);
      return res.status(200).json({
        message: 'Store settings updated successfully.',
        settings: updated.toDict ? updated.toDict() : updated,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default StoreSettingController;
