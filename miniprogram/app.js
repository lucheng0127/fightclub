// Fight Club - Boxing Platform Mini-Program
App({
  onLaunch() {
    // Initialize CloudBase
    if (!wx.cloud) {
      console.error('CloudBase not supported');
      return;
    }
    wx.cloud.init({
      env: 'your-env-id',  // Replace with your CloudBase environment ID
      traceUser: true
    });
  },

  onShow() {
    // App shown
  },

  onHide() {
    // App hidden
  }
});
