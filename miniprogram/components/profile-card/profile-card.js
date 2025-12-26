// Profile Card Component
Component({
  properties: {
    avatar: String,
    nickname: String,
    subtitle: String,
    info1: String,
    info1Label: String,
    info2: String,
    info2Label: String,
    info3: String,
    info3Label: String,
    footer: String
  },

  methods: {
    onTap() {
      this.triggerEvent('tap');
    }
  }
});
