// 拳馆档案创建页
const { callFunction } = require('../../../utils/request');
const { saveAuthData } = require('../../../utils/auth');

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
      // 生成文件名
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const cloudPath = `gym-icons/${timestamp}_${random}.jpg`;

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });

      if (uploadRes.statusCode === 200) {
        const fileID = uploadRes.fileID;
        this.setData({
          'formData.icon_url': fileID
        });
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      } else {
        throw new Error('上传失败');
      }
    } catch (err) {
      console.error('上传图片失败:', err);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
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
      const roles = {
        has_boxer_profile: false,
        has_gym_profile: true
      };
      saveAuthData({
        user_id: result.user_id,
        roles,
        last_role: 'gym'
      });

      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });

      // 跳转到首页
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/common/dashboard/dashboard'
        });
      }, 1500);

    } catch (err) {
      console.error('创建拳馆档案失败:', err);
      // 错误提示已在 callFunction 中处理
    } finally {
      this.setData({ submitting: false });
    }
  }
});
