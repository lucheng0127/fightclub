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
    uploadingImage: false,
    oldIconUrl: '' // 保存旧的图片URL，用于删除
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
        },
        oldIconUrl: profile.icon_url || '' // 保存旧的图片URL
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

        // 如果有旧图片，先删除旧图片
        const oldIconUrl = this.data.oldIconUrl;
        if (oldIconUrl && oldIconUrl !== fileID) {
          try {
            await wx.cloud.deleteFile({
              fileList: [oldIconUrl]
            });
            console.log('[GymProfileEdit] 旧图片已删除:', oldIconUrl);
          } catch (deleteErr) {
            console.error('[GymProfileEdit] 删除旧图片失败:', deleteErr);
            // 删除失败不影响新图片的上传
          }
        }

        this.setData({
          'formData.icon_url': fileID,
          oldIconUrl: fileID // 更新旧图片URL为新图片
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

      // 保存成功后，如果之前有旧图片且与新图片不同，说明已经在上传时删除了
      // 这里只需要清空旧图片引用即可
      if (this.data.formData.icon_url) {
        this.setData({ oldIconUrl: this.data.formData.icon_url });
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      console.error('更新拳馆档案失败:', err);

      // 如果保存失败，需要清理已上传的新图片（如果与旧图片不同）
      const newIconUrl = this.data.formData.icon_url;
      const oldIconUrl = this.data.oldIconUrl;
      if (newIconUrl && newIconUrl !== oldIconUrl) {
        try {
          await wx.cloud.deleteFile({
            fileList: [newIconUrl]
          });
          console.log('[GymProfileEdit] 保存失败，已回退删除新上传的图片:', newIconUrl);
          // 恢复旧图片URL
          this.setData({
            'formData.icon_url': oldIconUrl
          });
        } catch (deleteErr) {
          console.error('[GymProfileEdit] 回退删除新图片失败:', deleteErr);
        }
      }
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 取消编辑
   */
  onCancel() {
    // 如果用户上传了新照片但取消编辑，需要删除新上传的照片
    const newIconUrl = this.data.formData.icon_url;
    const oldIconUrl = this.data.oldIconUrl;
    if (newIconUrl && newIconUrl !== oldIconUrl) {
      wx.cloud.deleteFile({
        fileList: [newIconUrl]
      }).catch(err => {
        console.error('[GymProfileEdit] 取消时删除新图片失败:', err);
      });
    }
    wx.navigateBack();
  }
});
