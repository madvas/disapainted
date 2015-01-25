var config = require('../../core/tests/core.client.po.js')
  , url = require('url');

describe('Disapainted view user page', function() {
  var animHref, userId;

  it('should be able to get anim link and userId', function() {
    browser.get(config.getUrl());
    var firstAnim = $$('.home-anim-link').first();
    firstAnim.getAttribute('href').then(function(anim) {
      animHref = url.parse(anim);
      firstAnim.element(by.css('.creator')).getText().then(function(user) {
        userId = user;
      });
    });
  });


  it('should have user page working correctly', function() {
    browser.setLocation('users/' + userId);
    expect(element.all(by.binding('vm.current.user._id')).first().getText()).toBe(userId);
    expect(element(by.binding('vm.current.user.created')).getText()).toContain('ago');
    expect(element(by.binding('vm.current.user.bio')).isPresent()).toBe(true);
  });

  it('should contain user\'s anim link from home page', function() {
    expect(element(by.css('a[href="' + animHref.path.substr(1) + '"]'))
      .isPresent()).toBe(true);
  });

  it('should correctly display list of user\'s anims', function() {
    var anims = element.all(by.repeater('anim in vm.anims'));
    expect(anims.count()).toBeGreaterThan(0);

    var firstAnim = anims.get(0);
    expect(firstAnim.element(by.binding('anim.framesCount')).getText()).toBeGreaterThan(9);
    expect(firstAnim.element(by.binding('anim.datePublish')).getText()).toContain('ago');
    expect(firstAnim.element(by.binding('anim.likesCount')).getText()).toBeGreaterThan(-1);
  });

});
