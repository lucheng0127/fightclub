// Slot Detail Page (Common)
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    slotId: '',
    slot: null,
    gym: null,
    boxers: [],
    loading: true,
    booking: false,
    cancelling: false
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;

    this.setData({
      statusBarHeight,
      navBarHeight,
      slotId: options.slot_id || ''
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

      this.setData({
        slot: result.slot,
        gym: result.gym,
        boxers: result.boxers || [],
        loading: false
      });
    } catch (e) {
      console.error('加载失败:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /**
   * 预约
   */
  async onBook() {
    if (this.data.booking) {
      return;
    }

    this.setData({ booking: true });

    try {
      await callFunction('slot-book', {
        slot_id: this.data.slotId
      });

      wx.showToast({ title: '预约成功', icon: 'success' });

      // 重新加载数据
      this.loadData();
    } catch (e) {
      console.error('预约失败:', e);
      const errMsg = e.errmsg || '预约失败，请重试';
      wx.showToast({ title: errMsg, icon: 'none' });
    } finally {
      this.setData({ booking: false });
    }
  },

  /**
   * 取消预约
   */
  async onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消预约吗？时间段结束前半小时内不可取消',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ cancelling: true });

          try {
            await callFunction('slot-cancel', {
              slot_id: this.data.slotId
            });

            wx.showToast({ title: '已取消预约', icon: 'success' });

            // 重新加载数据
            this.loadData();
          } catch (e) {
            console.error('取消失败:', e);
            const errMsg = e.errmsg || '取消失败，请重试';
            wx.showToast({ title: errMsg, icon: 'none' });
          } finally {
            this.setData({ cancelling: false });
          }
        }
      }
    });
  },

  /**
   * 查看全部预约
   */
  onViewBookings() {
    wx.navigateTo({
      url: `/pages/common/slot-bookings/slot-bookings?slot_id=${this.data.slotId}`
    });
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
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
