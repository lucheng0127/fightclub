// Gym Slot Manage Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    currentStatus: 'active',
    list: [],
    activeCount: 0,
    bookedCount: 0,
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
   * 加载时间段列表
   */
  async loadSlots() {
    this.setData({ loading: true });

    try {
      const result = await callFunction('gym-slot-list', {
        status: this.data.currentStatus
      }, { showLoading: false });

      const list = result.slots || [];

      // 统计可用和已预约数量
      const activeCount = list.filter(s => s.status === 'active').length;
      const bookedCount = list.filter(s => s.current_bookings > 0).length;

      this.setData({
        list,
        activeCount,
        bookedCount,
        loading: false
      });
    } catch (e) {
      console.error('加载时间段失败:', e);
      this.setData({ loading: false });
    }
  },

  /**
   * 状态切换
   */
  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ currentStatus: status });
    this.loadSlots();
  },

  /**
   * 编辑时间段
   */
  onEdit(e) {
    const slotId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/gym/slot-edit/slot-edit?slot_id=${slotId}`
    });
  },

  /**
   * 撤销时间段
   */
  async onDelete(e) {
    const slotId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '确认撤销',
      content: '确定要撤销该时间段吗？撤销后将无法恢复',
      success: async (res) => {
        if (res.confirm) {
          // 设置该项的删除状态
          const list = this.data.list;
          list[index].deleting = true;
          this.setData({ list });

          try {
            await callFunction('gym-slot-delete', {
              slot_id: slotId
            });

            wx.showToast({ title: '撤销成功', icon: 'success' });

            // 重新加载列表
            this.loadSlots();
          } catch (e) {
            console.error('撤销失败:', e);
            const errMsg = e.errmsg || '撤销失败，请重试';

            // 重置删除状态
            list[index].deleting = false;
            this.setData({ list });

            wx.showToast({ title: errMsg, icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 查看预约列表
   */
  onViewBookings(e) {
    const slotId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/common/slot-bookings/slot-bookings?slot_id=${slotId}&from=gym`
    });
  },

  /**
   * 点击卡片（已废弃，现在使用按钮操作）
   */
  onCardTap(e) {
    // 保留此方法以防万一
    const { id, can_modify } = e.currentTarget.dataset;

    if (can_modify) {
      // 可编辑，跳转到编辑页面
      wx.navigateTo({
        url: `/pages/gym/slot-edit/slot-edit?slot_id=${id}`
      });
    } else {
      // 不可编辑，跳转到查看预约页面
      wx.navigateTo({
        url: `/pages/common/slot-bookings/slot-bookings?slot_id=${id}&from=gym`
      });
    }
  },

  /**
   * 发布新时间段
   */
  onPublish() {
    wx.navigateTo({
      url: '/pages/gym/slot-publish/slot-publish'
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
