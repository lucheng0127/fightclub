// Gym Detail Page
const { callFunction } = require('../../../utils/request');
const { getAuthData } = require('../../../utils/auth');

Page({
  data: {
    loading: true,
    profile: null,
    avatarUrl: '/images/gym-placeholder.png',
    mode: 'view' // view or edit
  },

  onLoad(options) {
    const mode = options.mode || 'view';
    this.setData({ mode });
    this.loadProfile();
  },

  /**
   * 加载拳馆档案
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

      // 调用云函数获取拳馆档案
      const profile = await callFunction('gym/get', {}, { showLoading: true });

      // 使用上传的拳馆图标，如果没有则使用默认占位图
      const avatar = profile.icon_url || '/images/gym-placeholder.png';

      this.setData({
        profile,
        avatarUrl: avatar,
        loading: false
      });
    } catch (err) {
      console.error('加载拳馆档案失败:', err);
      this.setData({ loading: false });

      if (err.errcode === 3001 || err.errcode === 3008) {
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
      url: '/pages/gym/profile-edit/profile-edit'
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
      url: '/pages/gym/profile-create/profile-create'
    });
  },

  /**
   * 查看位置
   */
  onViewLocation() {
    if (!this.data.profile || !this.data.profile.location) {
      return;
    }

    const { location, address, name } = this.data.profile;

    wx.openLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      scale: 18,
      name: name || '拳馆位置',
      address: address || ''
    });
  }
});
