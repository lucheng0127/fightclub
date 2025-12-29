// Gym List Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    list: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    has_more: false,
    loading: false,
    filters: {
      city: ''
    },
    currentFilters: {},
    hasFilters: false,
    userLocation: null,
    locationAuthorized: false
  },

  onLoad() {
    this.loadStats();
    this.getUserLocation();
    this.loadGyms();
  },

  /**
   * 获取用户位置（用于距离排序）
   */
  async getUserLocation() {
    try {
      const res = await wx.getLocation({ type: 'gcj02' });
      this.setData({
        userLocation: {
          latitude: res.latitude,
          longitude: res.longitude
        },
        locationAuthorized: true
      });
    } catch (e) {
      // 用户未授权位置，不影响其他功能
      console.log('位置未授权，将不显示距离');
      this.setData({
        locationAuthorized: false
      });
    }
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await callFunction('common/stats', {}, { showLoading: false });
      this.setData({
        totalCount: stats.gym_count || 0
      });
    } catch (e) {
      console.error('加载统计数据失败:', e);
    }
  },

  /**
   * 加载拳馆列表
   */
  async loadGyms(append = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { page, limit, currentFilters, userLocation } = this.data;

      const params = {
        ...currentFilters,
        page,
        limit
      };

      // 如果有位置授权，添加距离排序
      if (userLocation && this.data.locationAuthorized) {
        params.sort_by_distance = true;
        params.user_location = userLocation;
      }

      const result = await callFunction('gym/list', params, { showLoading: false });

      const list = append ? this.data.list.concat(result.list) : result.list;

      this.setData({
        list,
        total: result.total,
        has_more: result.has_more,
        loading: false,
        hasFilters: Object.keys(currentFilters).length > 0
      });
    } catch (e) {
      console.error('加载拳馆列表失败:', e);
      this.setData({ loading: false });
    }
  },

  /**
   * 筛选输入
   */
  onCityInput(e) {
    this.setData({
      'filters.city': e.detail.value
    });
  },

  /**
   * 应用筛选
   */
  onApplyFilters() {
    const { city } = this.data.filters;

    const currentFilters = {};
    if (city) currentFilters.city = city;

    this.setData({
      currentFilters,
      page: 1,
      list: []
    });

    this.loadGyms();
  },

  /**
   * 清空筛选
   */
  onClearFilters() {
    this.setData({
      filters: {
        city: ''
      },
      currentFilters: {},
      page: 1,
      list: []
    });

    this.loadGyms();
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (!this.data.has_more || this.data.loading) return;

    this.setData({
      page: this.data.page + 1
    });

    this.loadGyms(true);
  },

  /**
   * 点击卡片
   */
  onCardTap(e) {
    const gymId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/gym/detail/detail?gym_id=${gymId}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      page: 1,
      list: []
    });
    this.loadGyms();
    this.loadStats();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
