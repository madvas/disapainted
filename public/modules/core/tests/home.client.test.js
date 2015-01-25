var config = require('./core.client.po.js');

describe('Disapainted homepage', function() {

  beforeEach(function() {
    browser.get(config.getUrl());
  });

  it('should contain title logo and svg element', function() {
    expect(browser.getTitle()).toContain('Disapainted');
    expect(element(by.css('.disapaintedSvg')).isPresent()).toBe(true);
    expect($$('.logo').getAttribute('src')).toBeTruthy();
  });

  it('should have correctly rendered lists', function() {

    var sections = element.all(by.repeater('(secName, sec) in vm.sections'));
    expect(sections.count()).toEqual(2);
    var animSections = sections.get(0).all(by.repeater('(typeName, type) in sec.types'));
    expect(animSections.count()).toEqual(3);
    var usersSections = sections.get(1).all(by.repeater('(typeName, type) in sec.types'));
    expect(usersSections.count()).toEqual(1);

    var animsListItems = animSections.all(by.repeater('(itemKey, item) in type.list'));
    expect(animsListItems.count()).toEqual(24);
    animsListItems.each(function(listItem) {
      expect(listItem.element(by.css('a')).getAttribute('href')).toMatch(/animations\/[A-Za-z0-9]]*/);
      expect(listItem.element(by.css('img')).getAttribute('src')).toBeTruthy();
      expect(listItem.element(by.binding('item.framesCount')).getText()).toBeGreaterThan(0);
      expect(listItem.element(by.binding('item.likesCount')).getText()).toBeGreaterThan(-1);
      expect(listItem.element(by.binding('item.datePublish')).getText()).toContain('ago');
      expect(listItem.element(by.binding('item.creator')).getText()).toBeTruthy();
    });

    var usersListItems = usersSections.all(by.repeater('(itemKey, item) in type.list'));
    expect(usersListItems.count()).toEqual(6);
    usersListItems.each(function(listItem) {
      expect(listItem.element(by.css('a')).getAttribute('href')).toMatch(/users\/[A-Za-z0-9]]*/);
      expect(listItem.element(by.css('img')).getAttribute('src')).toBeTruthy();
      expect(listItem.element(by.binding('item.likesCount')).getText()).toBeGreaterThan(-1);
    });
  });
});
