// 拳馆档案创建页
const { callFunction } = require('../../../utils/request');
const { saveAuthData } = require('../../../utils/auth');
const { getProvinceNames, getCitiesByProvince } = require('../../../utils/city-data');

Page({
  data: {
    formData: {
      name: '',
      address: '',
      location: null,
      city: '',
      cityDisplay: '',
      phone: '',
      icon_url: ''
    },
    isFormValid: false,
    submitting: false,
    uploadingImage: false,
    // City picker
    showCityPicker: false,
    provinces: [],
    cities: [],
    cityPickerValue: [0, 0],
    selectedProvince: '',
    selectedCity: ''
  },

  onLoad() {
    // 初始化省市数据
    const provinces = getProvinceNames();
    const cities = getCitiesByProvince(provinces[0]);

    this.setData({
      provinces,
      cities
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { formData } = this.data;
    const isFormValid = !!(
      formData.name &&
      formData.address &&
      formData.location &&
      formData.location.latitude &&
      formData.location.longitude &&
      formData.phone
    );
    this.setData({ isFormValid });
    return isFormValid;
  },

  /**
   * 输入事件处理
   */
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
    this.validateForm();
  },

  onAddressInput(e) {
    this.setData({
      'formData.address': e.detail.value
    });
    this.validateForm();
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

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
    this.validateForm();
  },

  /**
   * 选择位置
   */
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.location': {
            latitude: res.latitude,
            longitude: res.longitude
          },
          'formData.address': res.address || this.data.formData.address,
          'formData.city': res.city || this.data.formData.city
        });
        this.validateForm();
      },
      fail: (err) => {
        console.error('选择位置失败:', err);
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '位置权限',
            content: '需要位置权限来选择拳馆位置，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    if (this.data.uploadingImage) {
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.uploadImage(tempFilePath);
      }
    });
  },

  /**
   * 上传图片到云存储
   */
  async uploadImage(filePath) {
    this.setData({ uploadingImage: true });

    try {
      // 检查云环境是否已初始化
      if (!wx.cloud) {
        throw new Error('云环境未初始化');
      }

      // 生成文件名
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const cloudPath = `gym-icons/${timestamp}_${random}.jpg`;

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });

      // 检查上传是否成功：errMsg 为 'ok' 且 statusCode 为 2xx
      if (uploadRes.errMsg === 'cloud.uploadFile:ok' && uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
        const fileID = uploadRes.fileID;
        this.setData({
          'formData.icon_url': fileID
        });
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      } else {
        throw new Error(`上传失败: ${uploadRes.statusCode} - ${uploadRes.errMsg}`);
      }
    } catch (err) {
      wx.showToast({
        title: err.errMsg || '上传失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ uploadingImage: false });
    }
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
      const result = await callFunction('gym/create', this.data.formData, { showLoading: true });

      // 更新本地存储的用户信息
      const authData = { user_id: result.user_id, roles: { has_boxer_profile: false, has_gym_profile: true }, last_role: 'gym' };
      saveAuthData(authData);

      // 显示审核中提示
      wx.showModal({
        title: '提交成功',
        content: '您的拳馆资料已提交，请等待管理员审核。审核通过后即可使用。',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/common/dashboard/dashboard'
          });
        }
      });

    } catch (err) {
      console.error('创建拳馆档案失败:', err);

      // 如果保存失败，需要清理已上传的图片
      const iconUrl = this.data.formData.icon_url;
      if (iconUrl) {
        wx.cloud.deleteFile({
          fileList: [iconUrl]
        }).catch(deleteErr => {
          console.error('[GymProfileCreate] 删除上传失败的图片失败:', deleteErr);
        });
        this.setData({ 'formData.icon_url': '' });
      }
    } finally {
      this.setData({ submitting: false });
    }
  }
});
