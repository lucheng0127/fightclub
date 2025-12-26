// Filter Bar Component
Component({
  properties: {
    // 是否显示体重筛选
    showWeightFilter: {
      type: Boolean,
      value: false
    },
    // 初始筛选值
    initialFilters: {
      type: Object,
      value: {}
    }
  },

  data: {
    city: '',
    ageMin: '',
    ageMax: '',
    weightMin: '',
    weightMax: ''
  },

  lifetimes: {
    attached() {
      // 从属性初始化筛选值
      if (this.properties.initialFilters) {
        const { city, ageMin, ageMax, weightMin, weightMax } = this.properties.initialFilters;
        this.setData({ city, ageMin, ageMax, weightMin, weightMax });
      }
    }
  },

  methods: {
    onCityInput(e) {
      this.setData({ city: e.detail.value });
    },

    onAgeMinInput(e) {
      this.setData({ ageMin: e.detail.value });
    },

    onAgeMaxInput(e) {
      this.setData({ ageMax: e.detail.value });
    },

    onWeightMinInput(e) {
      this.setData({ weightMin: e.detail.value });
    },

    onWeightMaxInput(e) {
      this.setData({ weightMax: e.detail.value });
    },

    onApply() {
      const filters = this.getFilters();
      this.triggerEvent('apply', { filters });
    },

    onClear() {
      this.setData({
        city: '',
        ageMin: '',
        ageMax: '',
        weightMin: '',
        weightMax: ''
      });
      this.triggerEvent('clear');
    },

    getFilters() {
      const filters = {};
      if (this.data.city) filters.city = this.data.city;
      if (this.data.ageMin) filters.ageMin = parseInt(this.data.ageMin);
      if (this.data.ageMax) filters.ageMax = parseInt(this.data.ageMax);
      if (this.data.weightMin) filters.weightMin = parseInt(this.data.weightMin);
      if (this.data.weightMax) filters.weightMax = parseInt(this.data.weightMax);
      return filters;
    }
  }
});
