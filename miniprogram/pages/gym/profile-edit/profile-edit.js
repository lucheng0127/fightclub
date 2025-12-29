// 拳馆档案编辑页
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    formData: {
      name: '',
      address: '',
      location: null,
      city: '',
      phone: '',
      icon_url: ''
    },
    isFormValid: false,
    submitting: false,
    uploadingImage: false
  },

  onLoad() {
    this.loadProfile();
  },

  /**
   * 加载现有档案
   */
  async loadProfile() {
    try {
      const profile = await callFunction('gym/get', {}, { showLoading: true });

      this.setData({
        formData: {
          name: profile.name,
          address: profile.address,
          location: profile.location,
          city: profile.city || '',
          phone: profile.phone,
          icon_url: profile.icon_url || ''
        }
      });

      this.validateForm();
    } catch (err) {
      console.error('加载拳馆档案失败:', err);
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

  onCityInput(e) {
    this.setData({
      'formData.city': e.detail.value
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
      if (!wx.cloud) {
        throw new Error('云环境未初始化');
      }

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const cloudPath = `gym-icons/${timestamp}_${random}.jpg`;

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });

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
      await callFunction('gym/update', this.data.formData, { showLoading: true });

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      console.error('更新拳馆档案失败:', err);
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
