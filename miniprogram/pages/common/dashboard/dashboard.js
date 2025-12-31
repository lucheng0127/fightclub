// Dashboard Page
const { callFunction } = require('../../../utils/request');
const { getRoles, getUserId, getAuthData } = require('../../../utils/auth');

Page({
  data: {
    profileName: '加载中...',
    profileAvatar: '/images/boxer-placeholder.png',
    boxerCount: 0,
    gymCount: 0,
    currentRole: 'boxer',
    statusBarHeight: 20,
    navBarHeight: 64
  },

  onLoad() {
    // 获取系统信息计算导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44; // 系统导航栏标准高度

    this.setData({
      statusBarHeight,
      navBarHeight
    });

    // 检查用户是否已授权 (getUserProfile)
    const hasAuthorized = wx.getStorageSync('user_nickname');
    if (!hasAuthorized) {
      wx.reLaunch({
        url: '/pages/auth/login/login'
      });
      return;
    }

    // 检查用户是否已登录
    const authData = getAuthData();
    if (!authData || !authData.user_id) {
      wx.reLaunch({
        url: '/pages/auth/role-select/role-select'
      });
      return;
    }

    // 检查用户是否有档案
    const roles = getRoles();
    if (!roles.has_boxer_profile && !roles.has_gym_profile) {
      // 没有任何档案，返回角色选择页面
      wx.reLaunch({
        url: '/pages/auth/role-select/role-select'
      });
      return;
    }

    this.loadProfileInfo();
    this.loadStats();
  },

  onShow() {
    // 每次显示时刷新统计数据
    this.loadStats();
  },

  /**
   * 加载档案信息
   */
  async loadProfileInfo() {
    try {
      const roles = getRoles();
      const { last_role } = roles;

      if (!last_role) {
        return;
      }

      let profile;
      if (last_role === 'gym') {
        profile = await callFunction('gym/get', {}, { showLoading: true });
        this.setData({
          profileName: profile.name,
          profileAvatar: profile.icon_url || '/images/gym-placeholder.png',
          currentRole: 'gym'
        });
      } else {
        profile = await callFunction('boxer/get', {}, { showLoading: true });
        this.setData({
          profileName: profile.nickname,
          profileAvatar: '/images/boxer-placeholder.png',
          currentRole: 'boxer'
        });
      }
    } catch (err) {
      console.error('加载档案信息失败:', err);
      // 使用默认值
      const roles = getRoles();
      const { last_role } = roles;

      if (last_role === 'gym') {
        this.setData({
          profileName: '拳馆',
          profileAvatar: '/images/gym-placeholder.png',
          currentRole: 'gym'
        });
      } else {
        this.setData({
          profileName: '拳手',
          profileAvatar: '/images/boxer-placeholder.png',
          currentRole: 'boxer'
        });
      }
    }
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await callFunction('common/stats', {}, { showLoading: false });
      this.setData({
        boxerCount: stats.boxer_count || 0,
        gymCount: stats.gym_count || 0
      });
    } catch (e) {
      console.error('加载统计数据失败:', e);
    }
  },

  /**
   * 跳转到拳手列表
   */
  goToBoxerList() {
    wx.navigateTo({
      url: '/pages/boxer/list/list'
    });
  },

  /**
   * 跳转到拳馆列表
   */
  goToGymList() {
    wx.navigateTo({
      url: '/pages/gym/list/list'
    });
  },

  /**
   * 跳转到个人档案
   * 直接根据当前角色跳转，由详情页检查档案是否存在
   */
  goToProfile() {
    const roles = getRoles();
    const { last_role } = roles;

    if (!last_role) {
      wx.showToast({
        title: '请先选择角色',
        icon: 'none'
      });
      return;
    }

    if (last_role === 'boxer') {
      wx.navigateTo({
        url: '/pages/boxer/detail/detail?mode=edit'
      });
    } else if (last_role === 'gym') {
      wx.navigateTo({
        url: '/pages/gym/detail/detail?mode=edit'
      });
    }
  },

  /**
   * 切换角色
   */
  onSwitchRole() {
    wx.reLaunch({
      url: '/pages/auth/role-select/role-select?manual=true'
    });
  }
});
