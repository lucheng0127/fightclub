// Boxer Slot List Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    list: [],
    filters: {
      city: ''
    },
    showCityPicker: false,
    cityPickerValue: [0, 0],
    provinces: ['北京市', '上海市', '广东省', '浙江省', '江苏省'],
    cities: {
      '北京市': ['北京市'],
      '上海市': ['上海市'],
      '广东省': ['广州市', '深圳市', '东莞市', '佛山市', '其他'],
      '浙江省': ['杭州市', '宁波市', '温州市', '其他'],
      '江苏省': ['南京市', '苏州市', '无锡市', '其他']
    },
    currentCities: ['北京市'],
    hasFilters: false,
    loading: false
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;

    this.setData({
      statusBarHeight,
      navBarHeight
    });

    this.loadSlots();
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadSlots();
  },

  /**
   * 加载可预约场地
   */
  async loadSlots() {
    this.setData({ loading: true });

    try {
      const params = {};
      if (this.data.filters.city) {
        params.city = this.data.filters.city;
      }

      const result = await callFunction('slot-list', params, { showLoading: false });

      this.setData({
        list: result.slots || [],
        loading: false
      });
    } catch (e) {
      console.error('加载失败:', e);
      this.setData({ loading: false });
    }
  },

  /**
   * 显示城市选择器
   */
  onShowCityPicker() {
    this.setData({ showCityPicker: true });
  },

  /**
   * 隐藏城市选择器
   */
  onHideCityPicker() {
    this.setData({ showCityPicker: false });
  },

  /**
   * 城市选择器变更
   */
  onCityPickerChange(e) {
    const value = e.detail.value;
    const provinceIndex = value[0];
    const province = this.data.provinces[provinceIndex];
    const cities = this.data.cities[province];

    this.setData({
      cityPickerValue: value,
      currentCities: cities
    });
  },

  /**
   * 确认城市选择
   */
  onConfirmCity() {
    const provinceIndex = this.data.cityPickerValue[0];
    const cityIndex = this.data.cityPickerValue[1];
    const province = this.data.provinces[provinceIndex];
    const city = this.data.currentCities[cityIndex];

    const cityDisplay = province === city ? city : `${city} (${province})`;

    this.setData({
      'filters.city': city,
      showCityPicker: false,
      hasFilters: true
    });

    this.loadSlots();
  },

  /**
   * 清空筛选
   */
  onClearFilters() {
    this.setData({
      'filters.city': '',
      hasFilters: false
    });

    this.loadSlots();
  },

  /**
   * 点击卡片
   */
  onCardTap(e) {
    const slotId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/common/slot-detail/slot-detail?slot_id=${slotId}`
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
