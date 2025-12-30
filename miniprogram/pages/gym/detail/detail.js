// Gym Detail Page
const { callFunction } = require('../../../utils/request');
const { getAuthData } = require('../../../utils/auth');

Page({
  data: {
    loading: true,
    profile: null,
    avatarUrl: '/images/gym-placeholder.png',
    mode: 'view', // view or edit
    gymId: '',
    isOwnProfile: false
  },

  onLoad(options) {
    const mode = options.mode || 'view';
    const gymId = options.gym_id || '';
    this.setData({ mode, gymId });
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
      const params = this.data.gymId ? { gym_id: this.data.gymId } : {};
      const result = await callFunction('gym/get', params, { showLoading: true });

      // 使用上传的拳馆图标，如果没有则使用默认占位图
      const avatar = result.icon_url || '/images/gym-placeholder.png';

      // 如果没有传gym_id，说明是查看自己的档案，默认为true
      // 如果有gym_id，使用云函数返回的is_own_profile
      const isOwnProfile = !this.data.gymId || result.is_own_profile;

      this.setData({
        profile: result,
        avatarUrl: avatar,
        isOwnProfile: isOwnProfile,
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
