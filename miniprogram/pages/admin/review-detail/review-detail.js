// Review Detail Page
const { getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    reviewId: '',
    review: null,
    loading: true,
    processing: false,
    rejectReason: ''
  },

  onLoad(options) {
    const reviewId = options.review_id || '';
    this.setData({ reviewId });
    this.loadReview();
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
      return false;
    }
    return true;
  },

  /**
   * 加载审核详情
   */
  async loadReview() {
    const isAdmin = await this.checkAdminStatus();
    if (!isAdmin) return;

    this.setData({ loading: true });

    try {
      const result = await callFunction('review/detail', {
        review_id: this.data.reviewId
      }, { showLoading: true });

      this.setData({
        review: result,
        loading: false
      });
    } catch (e) {
      console.error('加载审核详情失败:', e);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 输入拒绝原因
   */
  onReasonInput(e) {
    this.setData({
      rejectReason: e.detail.value
    });
  },

  /**
   * 审核通过
   */
  async onApprove() {
    if (this.data.processing) return;
    if (this.data.review?.status !== 'pending') {
      wx.showToast({
        title: '该申请已处理',
        icon: 'none'
      });
      return;
    }

    this.setData({ processing: true });

    try {
      await callFunction('review/approve', {
        review_id: this.data.reviewId
      }, { showLoading: true });

      wx.showToast({
        title: '审核通过',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      console.error('审核失败:', e);
      this.setData({ processing: false });
    }
  },

  /**
   * 审核拒绝
   */
  async onReject() {
    if (this.data.processing) return;
    if (this.data.review?.status !== 'pending') {
      wx.showToast({
        title: '该申请已处理',
        icon: 'none'
      });
      return;
    }

    if (!this.data.rejectReason || this.data.rejectReason.trim() === '') {
      wx.showToast({
        title: '请填写拒绝原因',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认拒绝',
      content: '拒绝后拳馆需要重新提交资料',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ processing: true });

          try {
            await callFunction('review/reject', {
              review_id: this.data.reviewId,
              reject_reason: this.data.rejectReason
            }, { showLoading: true });

            wx.showToast({
              title: '已拒绝',
              icon: 'success'
            });

            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (e) {
            console.error('拒绝失败:', e);
            this.setData({ processing: false });
          }
        }
      }
    });
  }
});
