// spec.js

describe('angularjs homepage', function() {
  it('should have animation title', function() {
    browser.get('http://localhost:3000/animations/54675f85bfe14f0f2b19765f');

    var heading = element(by.binding('current.anim.title'));
    expect(heading.getText()).not.toEqual('');
  });
});
