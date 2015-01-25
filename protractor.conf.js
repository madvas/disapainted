exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  //specs: ['public/modules/animations/tests/view-anim.client.test.js'],
  //specs: ['public/modules/users/tests/anims-user.client.test.js'],
  //specs: ['public/modules/core/tests/home.client.test.js'],
  //specs: ['public/modules/canvas/tests/canvas.client.test.js'],
  specs: ['public/modules/*/tests/*.test.js'],
  capabilities: {
    browserName: 'chrome'
  },
  onPrepare: function() {
    browser.driver.manage().window().setSize(1600, 1080);
  }
};
