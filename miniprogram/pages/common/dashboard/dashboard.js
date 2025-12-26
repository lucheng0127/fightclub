// Dashboard Page
const { callFunction } = require('../../../utils/request');
const { getRoles, getUserId } = require('../../../utils/auth');

Page({
  data: {
    userName: '拳击手',
    userAvatar: '/images/boxer-placeholder.png',
    currentRoleText: '拳手身份',
    boxerCount: 0,
    gymCount: 0
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    // 每次显示时刷新统计数据
    this.loadStats();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const nickname = wx.getStorageSync('user_nickname') || '拳击手';
    const avatar = wx.getStorageSync('user_avatar') || '/images/boxer-placeholder.png';
    const roles = getRoles();
    const { last_role } = roles;

    let roleText = '拳手身份';
    if (last_role === 'gym') {
      roleText = '拳馆身份';
    }

    this.setData({
      userName: nickname,
      userAvatar: avatar,
      currentRoleText: roleText
    });
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
   */
  goToProfile() {
    const roles = getRoles();
    const { last_role, has_boxer_profile } = roles;

    if (last_role === 'boxer' && has_boxer_profile) {
      wx.navigateTo({
        url: '/pages/boxer/detail/detail?mode=edit'
      });
    } else {
      wx.showToast({
        title: '请先创建档案',
        icon: 'none'
      });
    }
  }
});
