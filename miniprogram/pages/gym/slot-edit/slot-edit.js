// Gym Slot Edit Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    minDate: '',
    maxDate: '',
    slotId: '',
    currentBookings: 0,
    form: {
      date: '',
      start_time: '',
      end_time: '',
      max_boxers: 4
    },
    loading: true,
    submitting: false,
    deleting: false
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;

    // 计算日期范围（未来一周）
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    this.setData({
      statusBarHeight,
      navBarHeight,
      minDate: formatDate(today),
      maxDate: formatDate(weekLater),
      slotId: options.slot_id || ''
    });

    if (this.data.slotId) {
      this.loadSlot();
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载时间段信息
   */
  async loadSlot() {
    try {
      const result = await callFunction('gym-slot-list', {
        status: 'all'
      }, { showLoading: true });

      const slot = result.slots?.find(s => s.slot_id === this.data.slotId);

      if (!slot) {
        wx.showToast({ title: '时间段不存在', icon: 'none' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      if (!slot.can_modify) {
        wx.showModal({
          title: '提示',
          content: '该时间段已有拳手预约，无法编辑',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      this.setData({
        form: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          max_boxers: slot.max_boxers
        },
        currentBookings: slot.current_bookings,
        loading: false
      });
    } catch (e) {
      console.error('加载失败:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 日期变更
   */
  onDateChange(e) {
    this.setData({
      'form.date': e.detail.value
    });
  },

  /**
   * 开始时间变更
   */
  onStartTimeChange(e) {
    this.setData({
      'form.start_time': e.detail.value
    });
  },

  /**
   * 结束时间变更
   */
  onEndTimeChange(e) {
    this.setData({
      'form.end_time': e.detail.value
    });
  },

  /**
   * 增加最大人数
   */
  onIncreaseMaxBoxers() {
    const max = this.data.form.max_boxers;
    if (max < 50) {
      this.setData({
        'form.max_boxers': max + 1
      });
    }
  },

  /**
   * 减少最大人数
   */
  onDecreaseMaxBoxers() {
    const max = this.data.form.max_boxers;
    const current = this.data.currentBookings;
    if (max > 1 && max > current) {
      this.setData({
        'form.max_boxers': max - 1
      });
    }
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { date, start_time, end_time, max_boxers } = this.data.form;

    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return false;
    }

    if (!start_time) {
      wx.showToast({ title: '请选择开始时间', icon: 'none' });
      return false;
    }

    if (!end_time) {
      wx.showToast({ title: '请选择结束时间', icon: 'none' });
      return false;
    }

    if (start_time >= end_time) {
      wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' });
      return false;
    }

    if (max_boxers < 1 || max_boxers > 50) {
      wx.showToast({ title: '人数必须在1-50之间', icon: 'none' });
      return false;
    }

    if (max_boxers < this.data.currentBookings) {
      wx.showToast({ title: `人数不能少于已预约数(${this.data.currentBookings})`, icon: 'none' });
      return false;
    }

    return true;
  },

  /**
   * 提交修改
   */
  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    if (this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });

    try {
      await callFunction('gym-slot-update', {
        slot_id: this.data.slotId,
        date: this.data.form.date,
        start_time: this.data.form.start_time,
        end_time: this.data.form.end_time,
        max_boxers: this.data.form.max_boxers
      });

      wx.showToast({ title: '保存成功', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      console.error('保存失败:', e);
      const errMsg = e.errmsg || '保存失败，请重试';
      wx.showToast({ title: errMsg, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 删除时间段
   */
  async onDelete() {
    if (this.data.currentBookings > 0) {
      wx.showToast({ title: '已有预约，无法删除', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认撤销',
      content: '确定要撤销该时间段吗？',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ deleting: true });

          try {
            await callFunction('gym-slot-delete', {
              slot_id: this.data.slotId
            });

            wx.showToast({ title: '撤销成功', icon: 'success' });

            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (e) {
            console.error('删除失败:', e);
            const errMsg = e.errmsg || '删除失败，请重试';
            wx.showToast({ title: errMsg, icon: 'none' });
          } finally {
            this.setData({ deleting: false });
          }
        }
      }
    });
  },

  /**
   * 查看预约拳手
   */
  onViewBookings() {
    wx.navigateTo({
      url: `/pages/common/slot-bookings/slot-bookings?slot_id=${this.data.slotId}&from=gym`
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
