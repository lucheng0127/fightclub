// Gym List Page
const { callFunction } = require('../../../utils/request');
const { getProvinceNames, getCitiesByProvince } = require('../../../utils/city-data');

Page({
  data: {
    list: [],
    totalCount: 0,
    displayCount: 0,
    page: 1,
    limit: 20,
    has_more: false,
    loading: false,
    filters: {
      city: '',
      cityDisplay: ''
    },
    currentFilters: {},
    hasFilters: false,
    userLocation: null,
    locationAuthorized: false,
    // City picker
    showCityPicker: false,
    provinces: [],
    cities: [],
    cityPickerValue: [0, 0],
    selectedProvince: '',
    selectedCity: ''
  },

  onLoad() {
    // 初始化省市数据
    const provinces = getProvinceNames();
    const cities = getCitiesByProvince(provinces[0]);

    this.setData({
      provinces,
      cities
    });

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
        displayCount: result.total,
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
   * 城市选择器相关
   */
  onShowCityPicker() {
    this.setData({ showCityPicker: true });
  },

  onHideCityPicker() {
    this.setData({ showCityPicker: false });
  },

  onCityPickerChange(e) {
    const value = e.detail.value;
    const provinceIndex = value[0];
    const cityIndex = value[1];

    const provinces = this.data.provinces;
    const selectedProvince = provinces[provinceIndex];
    const cities = getCitiesByProvince(selectedProvince);

    // 如果城市索引超出范围，重置为0
    const adjustedCityIndex = cityIndex >= cities.length ? 0 : cityIndex;

    this.setData({
      cityPickerValue: [provinceIndex, adjustedCityIndex],
      cities,
      selectedProvince,
      selectedCity: cities[adjustedCityIndex] || ''
    });
  },

  onConfirmCity() {
    const { selectedProvince, selectedCity } = this.data;
    const cityDisplay = selectedCity ? `${selectedProvince} ${selectedCity}` : '';

    this.setData({
      'filters.city': cityDisplay,
      'filters.cityDisplay': cityDisplay,
      showCityPicker: false
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
        city: '',
        cityDisplay: ''
      },
      currentFilters: {},
      page: 1,
      list: [],
      cityPickerValue: [0, 0]
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
