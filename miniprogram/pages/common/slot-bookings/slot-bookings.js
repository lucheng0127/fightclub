// Slot Bookings Page (Common)
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    slotId: '',
    from: '',
    slot: null,
    gym: null,
    boxers: [],
    loading: true
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;

    this.setData({
      statusBarHeight,
      navBarHeight,
      slotId: options.slot_id || '',
      from: options.from || ''
    });

    if (this.data.slotId) {
      this.loadData();
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      const result = await callFunction('slot-bookings', {
        slot_id: this.data.slotId
      }, { showLoading: true });

      // 格式化预约时间
      const boxers = (result.boxers || []).map(boxer => {
        if (boxer.booking_time) {
          const bookingTime = new Date(boxer.booking_time);
          const month = bookingTime.getMonth() + 1;
          const day = bookingTime.getDate();
          const hour = String(bookingTime.getHours()).padStart(2, '0');
          const minute = String(bookingTime.getMinutes()).padStart(2, '0');
          boxer.booking_time_text = `${month}月${day}日 ${hour}:${minute}`;
        }
        return boxer;
      });

      this.setData({
        slot: result.slot,
        gym: result.gym,
        boxers,
        loading: false
      });
    } catch (e) {
      console.error('加载失败:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /**
   * 查看拳手详情
   */
  onBoxerTap(e) {
    const boxerId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/boxer/detail/detail?boxer_id=${boxerId}`
    });
  },

  /**
   * 联系拳手（拳馆功能）
   */
  onContact() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
    // TODO: 实现联系拳手功能
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
