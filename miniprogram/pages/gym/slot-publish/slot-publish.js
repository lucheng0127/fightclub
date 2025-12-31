// Gym Slot Publish Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    minDate: '',
    maxDate: '',
    form: {
      date: '',
      start_time: '',
      end_time: '',
      max_boxers: 4
    },
    submitting: false
  },

  onLoad() {
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
      maxDate: formatDate(weekLater)
    });
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
    if (max > 1) {
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

    return true;
  },

  /**
   * 提交发布
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
      await callFunction('gym-slot-publish', {
        date: this.data.form.date,
        start_time: this.data.form.start_time,
        end_time: this.data.form.end_time,
        max_boxers: this.data.form.max_boxers
      });

      wx.showToast({ title: '发布成功', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      console.error('发布失败:', e);
      const errMsg = e.errmsg || '发布失败，请重试';
      wx.showToast({ title: errMsg, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
