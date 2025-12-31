// Review List Page
const { getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    list: [],
    total: 0,
    page: 1,
    limit: 20,
    has_more: false,
    loading: false,
    currentStatus: 'all',
    statusOptions: [
      { value: 'all', label: '全部' },
      { value: 'pending', label: '待审核' },
      { value: 'approved', label: '已通过' },
      { value: 'rejected', label: '已拒绝' }
    ],
    statusIndex: 0
  },

  onLoad() {
    this.checkAdminStatus();
    this.loadReviews();
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
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 加载审核列表
   */
  async loadReviews(append = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { page, limit, currentStatus } = this.data;

      const result = await callFunction('review/list', {
        status: currentStatus,
        page,
        limit
      }, { showLoading: false });

      const list = (append ? this.data.list.concat(result.list) : result.list).map(item => ({
        ...item,
        submitted_at_formatted: this.formatDate(item.submitted_at),
        reviewed_at_formatted: this.formatDate(item.reviewed_at)
      }));

      this.setData({
        list,
        total: result.total,
        has_more: result.has_more,
        loading: false
      });
    } catch (e) {
      console.error('加载审核列表失败:', e);
      this.setData({ loading: false });
    }
  },

  /**
   * 切换状态筛选
   */
  onStatusChange(e) {
    const index = e.detail.value;
    const option = this.data.statusOptions[index];
    this.setData({
      statusIndex: index,
      currentStatus: option.value,
      page: 1,
      list: []
    });
    this.loadReviews();
  },

  /**
   * 查看详情
   */
  onReviewTap(e) {
    const reviewId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/review-detail/review-detail?review_id=${reviewId}`
    });
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (!this.data.has_more || this.data.loading) return;

    this.setData({
      page: this.data.page + 1
    });

    this.loadReviews(true);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      page: 1,
      list: []
    });
    this.loadReviews();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
