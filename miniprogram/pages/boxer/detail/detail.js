// Boxer Detail Page
const { callFunction } = require('../../../utils/request');
const { getAuthData } = require('../../../utils/auth');

Page({
  data: {
    loading: true,
    profile: null,
    avatarUrl: '/images/boxer-placeholder.png',
    mode: 'view', // view or edit
    boxerId: '',
    isOwnProfile: false
  },

  onLoad(options) {
    const mode = options.mode || 'view';
    const boxerId = options.boxer_id || '';
    this.setData({ mode, boxerId });
    this.loadProfile();
  },

  /**
   * 加载拳手档案
   */
  async loadProfile() {
    this.setData({ loading: true });

    try {
      const authData = getAuthData();
      if (!authData || !authData.user_id) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      // 调用云函数获取拳手档案
      const params = this.data.boxerId ? { boxer_id: this.data.boxerId } : {};
      const result = await callFunction('boxer/get', params, { showLoading: true });

      // 获取用户头像（仅查看自己档案时）
      const avatar = (!this.data.boxerId || result.is_own_profile)
        ? wx.getStorageSync('user_avatar') || '/images/boxer-placeholder.png'
        : '/images/boxer-placeholder.png';

      // 如果没有传boxer_id，说明是查看自己的档案，默认为true
      // 如果有boxer_id，使用云函数返回的is_own_profile
      const isOwnProfile = !this.data.boxerId || result.is_own_profile;

      this.setData({
        profile: result,
        avatarUrl: avatar,
        isOwnProfile: isOwnProfile,
        loading: false
      });
    } catch (err) {
      console.error('加载拳手档案失败:', err);
      this.setData({ loading: false });

      if (err.errcode === 2001 || err.errcode === 2008) {
        // 档案不存在
        this.setData({ profile: null });
      } else {
        wx.showToast({
          title: err.errmsg || '加载失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadProfile().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 编辑档案
   */
  onEdit() {
    wx.navigateTo({
      url: '/pages/boxer/profile-edit/profile-edit'
    });
  },

  /**
   * 返回
   */
  onBack() {
    // 如果是查看他人档案，返回到列表页
    if (this.data.boxerId && !this.data.isOwnProfile) {
      wx.navigateBack();
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 创建档案
   */
  onCreate() {
    wx.redirectTo({
      url: '/pages/boxer/profile-create/profile-create'
    });
  }
});
