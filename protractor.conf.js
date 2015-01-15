exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
//  specs: ['public/modules/animations/tests/view-anim.client.test.js'],
  specs: ['public/modules/*/tests/*.test.js'],
  getPageTimeout : 100000
};
