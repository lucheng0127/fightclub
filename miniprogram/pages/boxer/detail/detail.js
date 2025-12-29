// Boxer Detail Page
const { callFunction } = require('../../../utils/request');
const { getAuthData } = require('../../../utils/auth');

Page({
  data: {
    loading: true,
    profile: null,
    avatarUrl: '/images/boxer-placeholder.png',
    mode: 'view' // view or edit
  },

  onLoad(options) {
    const mode = options.mode || 'view';
    this.setData({ mode });
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
      const profile = await callFunction('boxer/get', {}, { showLoading: true });

      // 获取用户头像
      const avatar = wx.getStorageSync('user_avatar') || '/images/boxer-placeholder.png';

      this.setData({
        profile,
        avatarUrl: avatar,
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
    wx.navigateBack();
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
