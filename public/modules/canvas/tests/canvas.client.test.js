var _ = require('lodash')
  , config = require('../../core/tests/core.client.po.js');

describe('Disapainted create anim page', function() {
  it('should be able to log in', function() {
    browser.get(config.getUrl() + '/signin');
    element(by.model('vm.credentials.username')).sendKeys('protractor');
    element(by.model('vm.credentials.password')).sendKeys('protractor123');
    element(by.css('.sign-in-btn')).click();
    expect(element(by.css('a[href="/signin"]')).isPresent()).toBe(false);
  });

  it('should be able to create anim', function() {
    browser.setLocation('users/protractor');
    element(by.css('[data-ng-click="vm.createAnim()"]')).click();
    expect(element(by.css('[data-dp-canvas]')).isPresent()).toBe(true);
    expect($$('[data-dp-anim-loader]').first().getCssValue('display')).toBe('none');
  });

  it('should be able to create frames', function() {
    var frames = element.all(by.repeater('vm.f.frames'));
    expect(frames.count()).toBe(1);
    element(by.binding('vm.selectedAction.text')).click();
    expect(frames.get(0).element(by.css('img')).getAttribute('src')).toBeTruthy();
    var newFrameBtn = $$('[data-ng-click="vm.f.newFrame()"]');
    _.times(9, newFrameBtn.click);
    expect(frames.count()).toBe(10);
  });

  it('should be able to publish animation', function() {
    var animTitle = 'protractor animation title';
    var animDesc = 'protractor animation description';
    $$('[aria-label="Publish Animation"]').click();
    element(by.model('vm.title')).sendKeys(animTitle);
    element(by.model('vm.desc')).sendKeys(animDesc);
    $$('.publish-anim-confirm').click();
    expect(element(by.binding('vm.current.anim.title')).getText()).toBe(animTitle + ' ');
    expect(element(by.binding('vm.current.anim.desc')).getText()).toBe(animDesc);
    expect($$('.anim-player-img').getAttribute('src')).toBeTruthy();
  });

  it('should be able to delete anim', function() {
    browser.setLocation('users/protractor');
    $$('.published-switch .md-container').click();
    $$('[aria-label="Delete animation"]').click();
    $$('.anim-delete-confirm').click();
    expect(element.all(by.repeater('anim in vm.anims')).count()).toBe(0);
    browser.get(config.getUrl() + '/api/auth/signout');
    expect($$('a[href="/signin"]').first().getCssValue('display')).toBe('block');
  });

});
