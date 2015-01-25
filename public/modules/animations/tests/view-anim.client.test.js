var config = require('../../core/tests/core.client.po.js');

describe('Disapainted view animation page', function() {
  var animHref;

  it('should be able to get anim link and log in', function() {
    browser.get(config.getUrl());
    $$('.home-anim-link').first().getAttribute('href').then(function(res) {
      animHref = res;
      browser.setLocation('signin');
      element(by.model('vm.credentials.username')).sendKeys('protractor');
      element(by.model('vm.credentials.password')).sendKeys('protractor123');
      $$('.sign-in-btn').click();
      expect(element(by.css('a[href="/signin"]')).isPresent()).toBe(false);
    });
  });


  it('should properly load animation', function() {
    browser.get(animHref);
    element(by.binding('vm.current.anim.title')).getText().then(function(animTitle) {
      expect(animTitle.length).toBeGreaterThan(2);
    });
    element(by.css('.anim-player-img')).getAttribute('src').then(function(firstFrame) {
      expect(firstFrame).toBeTruthy();
      $$('.player-btn-next').click();
      expect(element(by.css('.anim-player-img')).getAttribute('src')).not.toBe(firstFrame);
      $$('.player-btn-prev').click();
      expect(element(by.css('.anim-player-img')).getAttribute('src')).toBe(firstFrame);
    });
    expect($$('[data-dp-anim-loader]').first().getCssValue('display')).toBe('none');
    expect(element(by.binding('vm.current.anim.datePublish')).getText()).toContain('ago');
    expect(element(by.binding('vm.current.anim.desc')).isPresent()).toBe(true);

    expect(element(by.binding('vm.current.creator._id')).getText()).toBeTruthy();
    expect(element(by.binding('vm.current.creator.likesCount')).getText()).toBeGreaterThan(-1);
  });

  it('should have comments working properly', function() {
    browser.executeScript('window.scrollTo(0,500);');
    var comments = element.all(by.repeater('comment in vm.current.anim.comments'));
    comments.count().then(function(commentsCount) {
      expect(commentsCount).toBeGreaterThan(-1);
      element(by.model('co.message')).sendKeys('protractor comment');
      element(by.css('.add-comment-btn')).click();
      expect(comments.count()).toBe(commentsCount + 1);
      var latestComment = comments.get(0);
      expect(latestComment.element(by.binding('comment.creator')).getText()).toBeTruthy();
      expect(latestComment.element(by.binding('comment.message')).getText()).toBeTruthy();
      expect(latestComment.element(by.binding('comment.dateCreation')).getText()).toContain('ago');

      browser.actions().mouseMove(latestComment).perform();
      latestComment.element(by.css('[aria-label="Like comment"]')).click();
      expect(latestComment.element(by.binding('comment.likes.length')).getText()).toBe('1');

      latestComment.element(by.css('[aria-label="Delete comment"]')).click();
      expect(comments.count()).toBe(commentsCount);
      browser.get(config.getUrl() + '/api/auth/signout');
      expect($$('a[href="/signin"]').first().getCssValue('display')).toBe('block');
    });
  });

});
