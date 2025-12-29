// Boxer List Page
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
      city: '',
      age_min: null,
      age_max: null,
      weight_min: null,
      weight_max: null
    },
    currentFilters: {},
    hasFilters: false
  },

  onLoad() {
    this.loadStats();
    this.loadBoxers();
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await callFunction('common/stats', {}, { showLoading: false });
      this.setData({
        totalCount: stats.boxer_count || 0
      });
    } catch (e) {
      console.error('加载统计数据失败:', e);
    }
  },

  /**
   * 加载拳手列表
   */
  async loadBoxers(append = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { page, limit, currentFilters } = this.data;

      const result = await callFunction('boxer/list', {
        ...currentFilters,
        page,
        limit
      }, { showLoading: false });

      const list = append ? this.data.list.concat(result.list) : result.list;

      this.setData({
        list,
        total: result.total,
        has_more: result.has_more,
        loading: false,
        hasFilters: Object.keys(currentFilters).length > 0
      });
    } catch (e) {
      console.error('加载拳手列表失败:', e);
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

  onAgeMinInput(e) {
    const value = e.detail.value ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.age_min': value
    });
  },

  onAgeMaxInput(e) {
    const value = e.detail.value ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.age_max': value
    });
  },

  onWeightMinInput(e) {
    const value = e.detail.value ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.weight_min': value
    });
  },

  onWeightMaxInput(e) {
    const value = e.detail.value ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.weight_max': value
    });
  },

  /**
   * 应用筛选
   */
  onApplyFilters() {
    const { city, age_min, age_max, weight_min, weight_max } = this.data.filters;

    const currentFilters = {};
    if (city) currentFilters.city = city;
    if (age_min !== null && age_min !== undefined) currentFilters.age_min = age_min;
    if (age_max !== null && age_max !== undefined) currentFilters.age_max = age_max;
    if (weight_min !== null && weight_min !== undefined) currentFilters.weight_min = weight_min;
    if (weight_max !== null && weight_max !== undefined) currentFilters.weight_max = weight_max;

    this.setData({
      currentFilters,
      page: 1,
      list: []
    });

    this.loadBoxers();
  },

  /**
   * 清空筛选
   */
  onClearFilters() {
    this.setData({
      filters: {
        city: '',
        age_min: null,
        age_max: null,
        weight_min: null,
        weight_max: null
      },
      currentFilters: {},
      page: 1,
      list: []
    });

    this.loadBoxers();
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (!this.data.has_more || this.data.loading) return;

    this.setData({
      page: this.data.page + 1
    });

    this.loadBoxers(true);
  },

  /**
   * 点击卡片
   */
  onCardTap(e) {
    const boxerId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/boxer/detail/detail?boxer_id=${boxerId}`
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
    this.loadBoxers();
    this.loadStats();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
