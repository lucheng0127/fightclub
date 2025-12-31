// My Bookings Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    currentStatus: 'active',
    list: [],
    totalCount: 0,
    activeCount: 0,
    cancelledCount: 0,
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

    this.loadBookings();
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadBookings();
  },

  /**
   * 加载预约记录
   */
  async loadBookings() {
    this.setData({ loading: true });

    try {
      const result = await callFunction('my-bookings', {
        status: this.data.currentStatus
      }, { showLoading: false });

      const list = result.bookings || [];

      // 统计各状态数量
      const activeCount = list.filter(b => b.status === 'active').length;
      const cancelledCount = list.filter(b => b.status === 'cancelled').length;

      this.setData({
        list,
        totalCount: result.total || 0,
        activeCount,
        cancelledCount,
        loading: false
      });
    } catch (e) {
      console.error('加载失败:', e);
      this.setData({ loading: false });
    }
  },

  /**
   * 状态切换
   */
  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ currentStatus: status });
    this.loadBookings();
  },

  /**
   * 查看详情
   */
  onViewDetail(e) {
    const slotId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/common/slot-detail/slot-detail?slot_id=${slotId}`
    });
  },

  /**
   * 取消预约
   */
  async onCancelBooking(e) {
    const bookingId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '确认取消',
      content: '确定要取消预约吗？时间段结束前半小时内不可取消',
      success: async (res) => {
        if (res.confirm) {
          // 设置该项的取消状态
          const list = this.data.list;
          list[index].cancelling = true;
          this.setData({ list });

          try {
            await callFunction('slot-cancel', {
              booking_id: bookingId
            });

            wx.showToast({ title: '已取消预约', icon: 'success' });

            // 重新加载列表
            this.loadBookings();
          } catch (e) {
            console.error('取消失败:', e);
            const errMsg = e.errmsg || '取消失败，请重试';

            // 重置取消状态
            list[index].cancelling = false;
            this.setData({ list });

            wx.showToast({ title: errMsg, icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 查看拳馆信息
   */
  onGymTap(e) {
    const gymId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/gym/detail/detail?gym_id=${gymId}`
    });
  },

  /**
   * 去预约场地
   */
  goToSlotList() {
    wx.navigateTo({
      url: '/pages/boxer/slot-list/slot-list'
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
