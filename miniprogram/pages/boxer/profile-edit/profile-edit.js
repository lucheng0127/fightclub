// 拳手档案编辑页
const { callFunction } = require('../../../utils/request');
const { getProvinceNames, getCitiesByProvince } = require('../../../utils/city-data');

Page({
  data: {
    formData: {
      nickname: '',
      gender: 'male',
      birthdate: '',
      height: '',
      weight: '',
      city: '',
      cityDisplay: '',
      phone: '',
      record_wins: 0,
      record_losses: 0,
      record_draws: 0
    },
    genderOptions: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' }
    ],
    genderIndex: 0,
    today: '',
    isFormValid: false,
    submitting: false,
    // City picker
    showCityPicker: false,
    provinces: [],
    cities: [],
    cityPickerValue: [0, 0],
    selectedProvince: '',
    selectedCity: ''
  },

  onLoad() {
    // 设置今天的日期
    const today = new Date();
    this.setData({
      today: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    });

    // 初始化省市数据
    const provinces = getProvinceNames();
    const cities = getCitiesByProvince(provinces[0]);

    this.setData({
      provinces,
      cities
    });

    this.loadProfile();
  },

  /**
   * 加载现有档案
   */
  async loadProfile() {
    try {
      const profile = await callFunction('boxer/get', {}, { showLoading: true });

      // 找到性别索引
      const genderIndex = this.data.genderOptions.findIndex(g => g.value === profile.gender);

      this.setData({
        formData: {
          nickname: profile.nickname,
          gender: profile.gender,
          birthdate: profile.birthdate,
          height: profile.height,
          weight: profile.weight,
          city: profile.city || '',
          cityDisplay: profile.city || '',
          phone: profile.phone || '',
          record_wins: profile.record_wins || 0,
          record_losses: profile.record_losses || 0,
          record_draws: profile.record_draws || 0
        },
        genderIndex: genderIndex >= 0 ? genderIndex : 0
      });

      this.validateForm();
    } catch (err) {
      console.error('加载拳手档案失败:', err);
      wx.showToast({
        title: err.errmsg || '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 城市选择器相关
   */
  onShowCityPicker() {
    this.setData({ showCityPicker: true });
  },

  onHideCityPicker() {
    this.setData({ showCityPicker: false });
  },

  onCityPickerChange(e) {
    const value = e.detail.value;
    const provinceIndex = value[0];
    const cityIndex = value[1];

    const provinces = this.data.provinces;
    const selectedProvince = provinces[provinceIndex];
    const cities = getCitiesByProvince(selectedProvince);

    // 如果城市索引超出范围，重置为0
    const adjustedCityIndex = cityIndex >= cities.length ? 0 : cityIndex;

    this.setData({
      cityPickerValue: [provinceIndex, adjustedCityIndex],
      cities,
      selectedProvince,
      selectedCity: cities[adjustedCityIndex] || ''
    });
  },

  onConfirmCity() {
    const { selectedProvince, selectedCity } = this.data;
    const cityDisplay = selectedCity ? `${selectedProvince} ${selectedCity}` : '';

    this.setData({
      'formData.city': cityDisplay,
      'formData.cityDisplay': cityDisplay,
      showCityPicker: false
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { formData } = this.data;
    const isFormValid = !!(
      formData.nickname &&
      formData.gender &&
      formData.birthdate &&
      formData.height &&
      formData.weight &&
      formData.height >= 100 && formData.height <= 250 &&
      formData.weight >= 30 && formData.weight <= 200
    );
    this.setData({ isFormValid });
    return isFormValid;
  },

  /**
   * 输入事件处理
   */
  onNicknameInput(e) {
    this.setData({
      'formData.nickname': e.detail.value
    });
    this.validateForm();
  },

  onGenderChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      genderIndex: index,
      'formData.gender': this.data.genderOptions[index].value
    });
    this.validateForm();
  },

  onBirthdateChange(e) {
    this.setData({
      'formData.birthdate': e.detail.value
    });
    this.validateForm();
  },

  onHeightInput(e) {
    const height = parseInt(e.detail.value) || '';
    this.setData({
      'formData.height': height
    });
    this.validateForm();
  },

  onWeightInput(e) {
    const weight = parseInt(e.detail.value) || '';
    this.setData({
      'formData.weight': weight
    });
    this.validateForm();
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
  },

  onRecordWinsInput(e) {
    const wins = parseInt(e.detail.value) || 0;
    this.setData({
      'formData.record_wins': wins
    });
  },

  onRecordLossesInput(e) {
    const losses = parseInt(e.detail.value) || 0;
    this.setData({
      'formData.record_losses': losses
    });
  },

  onRecordDrawsInput(e) {
    const draws = parseInt(e.detail.value) || 0;
    this.setData({
      'formData.record_draws': draws
    });
  },

  /**
   * 提交表单
   */
  async onSubmit() {
    if (!this.data.isFormValid || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });

    try {
      await callFunction('boxer/update', this.data.formData, { showLoading: true });

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      console.error('更新拳手档案失败:', err);
      // 错误提示已在 callFunction 中处理
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 取消编辑
   */
  onCancel() {
    wx.navigateBack();
  }
});
