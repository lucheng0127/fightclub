// 拳手档案创建页
const { callFunction } = require('../../../utils/request');
const { getUserId, saveAuthData } = require('../../../utils/auth');

Page({
  data: {
    formData: {
      nickname: '',
      gender: 'male',
      birthdate: '',
      height: '',
      weight: '',
      city: '',
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
    submitting: false
  },

  onLoad() {
    // 设置今天的日期
    const today = new Date();
    this.setData({
      today: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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

  onCityInput(e) {
    this.setData({
      'formData.city': e.detail.value
    });
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
      const result = await callFunction('boxer/create', this.data.formData, { showLoading: true });

      // 更新本地存储的用户信息
      const roles = {
        has_boxer_profile: true,
        has_gym_profile: false
      };
      saveAuthData({
        user_id: result.user_id,
        roles,
        last_role: 'boxer'
      });

      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });

      // 跳转到首页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/common/dashboard/dashboard'
        });
      }, 1500);

    } catch (err) {
      console.error('创建拳手档案失败:', err);
      // 错误提示已在 callFunction 中处理
    } finally {
      this.setData({ submitting: false });
    }
  }
});
