// Admin Dashboard Page
const { getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    isSuperadmin: false,
    pendingCount: 0,
    loading: true
  },

  onLoad() {
    this.checkAdminStatus();
    this.loadPendingCount();
  },

  onShow() {
    this.loadPendingCount();
  },

  /**
   * 检查管理员状态
   */
  async checkAdminStatus() {
    const authData = getAuthData();
    if (!authData || !authData.is_admin) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      isSuperadmin: authData.is_superadmin || false,
      loading: false
    });
  },

  /**
   * 加载待审核数量
   */
  async loadPendingCount() {
    try {
      const result = await callFunction('review/list', { status: 'pending', limit: 1 }, { showLoading: false });
      this.setData({
        pendingCount: result.total || 0
      });
    } catch (e) {
      console.error('加载待审核数量失败:', e);
    }
  },

  /**
   * 进入审核列表
   */
  goToReviewList() {
    wx.navigateTo({
      url: '/pages/admin/review-list/review-list'
    });
  },

  /**
   * 进入管理员管理
   */
  goToAdminManage() {
    wx.navigateTo({
      url: '/pages/admin/admin-manage/admin-manage'
    });
  }
});
