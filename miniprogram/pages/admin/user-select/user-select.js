// User Select Page
const { getAuthData, getRoles } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    loading: true,
    list: [],
    total: 0,
    page: 1,
    limit: 50,
    has_more: false,
    keyword: '',
    searching: false,
    scene: 'admin' // 调用场景: admin | gym_transfer
  },

  onLoad(options) {
    // 获取调用场景
    const scene = options.scene || 'admin';
    this.setData({ scene });
    this.checkPermission();
  },

  /**
   * 检查权限
   */
  async checkPermission() {
    const authData = getAuthData();
    const { scene } = this.data;

    if (!authData) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 根据场景检查不同权限
    if (scene === 'admin') {
      // 管理员场景：需要超级管理员权限
      if (!authData.is_superadmin) {
        wx.showToast({
          title: '无权限访问',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
    } else if (scene === 'gym_transfer') {
      // 拳馆转移场景：需要是拳馆负责人
      const roles = getRoles();
      if (!roles.has_gym_profile) {
        wx.showToast({
          title: '您不是拳馆负责人',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
    }

    try {
      await this.loadUsers();
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 加载用户列表
   */
  async loadUsers(append = false) {
    if (append && this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const { page, limit, keyword, scene } = this.data;

      const result = await callFunction('user/list', {
        keyword,
        page,
        limit,
        scene  // 传递场景参数给云函数
      }, { showLoading: false });

      const list = (append ? this.data.list.concat(result.list || []) : result.list || []).map(item => ({
        ...item,
        created_at_formatted: this.formatDate(item.created_at)
      }));

      this.setData({
        list,
        total: result.total || 0,
        has_more: result.has_more || false,
        loading: false
      });
    } catch (e) {
      wx.showToast({
        title: e.errmsg || '加载失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({
        loading: false,
        list: [],
        total: 0
      });
    }
  },

  /**
   * 输入搜索关键词
   */
  onKeywordInput(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  /**
   * 搜索
   */
  onSearch() {
    this.setData({
      page: 1,
      list: []
    });
    this.loadUsers();
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({
      keyword: '',
      page: 1,
      list: []
    });
    this.loadUsers();
  },

  /**
   * 选择用户
   */
  onSelectUser(e) {
    const { user } = e.currentTarget.dataset;

    // 获取当前页面栈
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    // 如果上一个页面有回调，调用它
    if (prevPage && prevPage.onUserSelected) {
      prevPage.onUserSelected(user);
    }

    wx.navigateBack();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      page: 1,
      list: []
    });
    this.loadUsers().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
