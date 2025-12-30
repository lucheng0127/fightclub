// Boxer List Page
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
      cityDisplay: '',
      gender: null,
      age_min: null,
      age_max: null,
      weight_min: null,
      weight_max: null
    },
    currentFilters: {},
    hasFilters: false,
    genderOptions: [
      { value: null, label: '全部' },
      { value: 'male', label: '男' },
      { value: 'female', label: '女' }
    ],
    genderIndex: 0,
    genderDisplay: '',
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

      // 更新显示的数量（使用筛选后的结果数量）
      this.setData({
        list,
        total: result.total,
        displayCount: result.total, // 筛选后的数量
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
   * 筛选输入
   */
  onGenderChange(e) {
    const index = e.detail.value;
    const option = this.data.genderOptions[index];
    this.setData({
      genderIndex: index,
      'filters.gender': option.value,
      genderDisplay: option.value ? option.label : ''
    });
  },

  onAgeMinInput(e) {
    const value = e.detail.value !== '' ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.age_min': value
    });
  },

  onAgeMaxInput(e) {
    const value = e.detail.value !== '' ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.age_max': value
    });
  },

  onWeightMinInput(e) {
    const value = e.detail.value !== '' ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.weight_min': value
    });
  },

  onWeightMaxInput(e) {
    const value = e.detail.value !== '' ? parseInt(e.detail.value) : null;
    this.setData({
      'filters.weight_max': value
    });
  },

  /**
   * 应用筛选
   */
  onApplyFilters() {
    const { city, gender, age_min, age_max, weight_min, weight_max } = this.data.filters;

    const currentFilters = {};
    if (city) currentFilters.city = city;
    if (gender) currentFilters.gender = gender;
    if (age_min !== null && age_min !== undefined && age_min !== '') currentFilters.age_min = age_min;
    if (age_max !== null && age_max !== undefined && age_max !== '') currentFilters.age_max = age_max;
    if (weight_min !== null && weight_min !== undefined && weight_min !== '') currentFilters.weight_min = weight_min;
    if (weight_max !== null && weight_max !== undefined && weight_max !== '') currentFilters.weight_max = weight_max;

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
        cityDisplay: '',
        gender: null,
        age_min: null,
        age_max: null,
        weight_min: null,
        weight_max: null
      },
      currentFilters: {},
      page: 1,
      list: [],
      genderIndex: 0,
      genderDisplay: '',
      cityPickerValue: [0, 0]
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
