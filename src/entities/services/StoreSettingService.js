class StoreSettingService {
  constructor(storeSettingModel) {
    this.storeSettingModel = storeSettingModel;
  }

  async getOrCreateSettings() {
    let settings = await this.storeSettingModel.findOne({ order: [['settingId', 'ASC']] });
    if (!settings) {
      settings = await this.storeSettingModel.create({
        storeName: 'omni.store',
        shortPrefix: 'omni',
        shortSuffix: '.store',
        tagline: 'Everything you need, delivered fast.',
        primaryColor: '#0094b6',
        accentColor: '#00b4d8',
        defaultRegion: 'US',
        freeShippingThresholdBr: 200.0,
        freeShippingThresholdUs: 50.0,
        freeShippingThresholdEu: 50.0,
        supportEmail: 'support@omni.store',
        legalEntityName: 'Omni Store Commerce Ltd.',
      });
    }
    return settings;
  }

  async updateSettings(payload) {
    const settings = await this.getOrCreateSettings();
    const updated = await settings.update(payload);
    return updated;
  }
}

export default StoreSettingService;
