'use strict';

/**
 * module dependencies.
 */

var app = require('../../../server'),
  randomstr = require('randomstring'),
  _ = require('lodash'),
  should = require('should'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  randName = _.partial(randomstr.generate, 16);

/**
 * Globals
 */
var user1, user2;

describe('User Model Unit Tests:', function() {

  before(function(done) {
    user1 = {
      _id      : randName(),
      email    : 'test' + randName() + '@test.com',
      password : 'password',
      provider : 'local',
      bio      : randomstr.generate(120)
    };

    user2 = {
      username : randName(),
      email    : 'test' + randName() + '@test.com',
      password : 'password',
      provider : 'local',
      bio      : randomstr.generate(120)
    };
    User.find({}).remove(done);
  });

  describe('Method Save', function() {
    it('should begin without the test user', function(done) {
      User.count({}, function(err, count) {
        should.not.exist(err);
        count.should.eql(0);
        done();
      });
    });

    it('should be able to save without problems', function(done) {
      var _user = new User(user1);
      _user.save(function(err) {
        should.not.exist(err);
        _user.remove();
        done();
      });
    });

    it('should check that roles are assigned and created properly', function(done) {
      var _user = new User(user1);
      _user.save(function(err) {
        should.not.exist(err);
        _user.isAdmin().should.equal(false);
        _user.roles.should.have.length(1);
        _user.remove(function(err) {
          done();
        });
      });
    });

    it('should confirm that password is hashed correctly', function(done) {
      var _user = new User(user1);
      _user.save(function(err) {
        should.not.exist(err);
        _user.password.should.not.have.length(0);
        _user.salt.should.not.have.length(0);
        _user.authenticate(user1.password).should.equal(true);
        _user.remove(function(err) {
          done();
        });

      });
    });


    it('should fail to save an existing user with the same values', function(done) {
      var _user1 = new User(user1);
      _user1.save(function(err) {
        should.not.exist(err);
        var _user2 = new User(user1);
        return _user2.save(function(err) {
          should.exist(err);
          _user1.remove(function() {
            if (!err) {
              _user2.remove(function() {
                done();
              });
            }
            done();
          });
        });
      });
    });

    it('should fail to save an user with the same email address', function(done) {
      var _user1 = new User(user1);
      _user1.save(function(err) {
        should.not.exist(err);
        var _user2 = new User(user1);
        _user2.username = randName();
        return _user2.save(function(err) {
          should.exist(err);
          _user1.remove(function() {
            if (!err) {
              _user2.remove(function() {
                done();
              });
            }
            done();
          });
        });
      });
    });

    it('should show an error when try to save without username', function(done) {

      var _user = new User(user1);
      _user.username = '';

      return _user.save(function(err) {
        should.exist(err);
        done();
      });
    });

    it('should show an error when try to save without password and provider set to local', function(done) {

      var _user = new User(user1);
      _user.password = '';
      _user.provider = 'local';

      return _user.save(function(err) {
        should.exist(err);
        done();
      });
    });

    it('should be able to to save without password and provider set to twitter', function(done) {

      var _user = new User(user1);

      _user.password = '';
      _user.provider = 'twitter';

      return _user.save(function(err) {
        _user.remove(function() {
          should.not.exist(err);
          _user.provider.should.equal('twitter');
          _user.password.should.have.length(0);
          done();
        });
      });
    });
  });

  describe('test username validations', function() {
    it('shouldnt allow too short usernames', function(done) {
      var _user = new User(user1);
      _user.username = 'c';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('should allow usernames with dash', function(done) {
      var _user = new User(user1);
      _user.username = 'kitty-kat';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('should allow usernames with underscore', function(done) {
      var _user = new User(user1);
      _user.username = 'kitty_kat';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('should allow usernames with dot', function(done) {
      var _user = new User(user1);
      _user.username = 'kitty.kat';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('should not allow usernames with space', function(done) {
      var _user = new User(user1);
      _user.username = 'john doe';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('should not allow too long username', function(done) {
      var _user = new User(user1);
      _user.username = _.reduce(_.range(26), function(sum) {
        return sum + 'a';
      }, 'a');
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('should trim and accept valid username', function(done) {
      var _user = new User(user1);
      _user.username = ' mikey ';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });
  });

  // source: http://en.wikipedia.org/wiki/email_address
  describe('test email validations', function() {
    it('shouldnt allow invalid emails #1', function(done) {
      var _user = new User(user1);
      _user.email = 'abc.example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('shouldnt allow invalid emails #2', function(done) {
      var _user = new User(user1);
      _user.email = 'a@b@c@example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt allow invalid emails #3', function(done) {
      var _user = new User(user1);
      _user.email = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt allow invalid emails #4', function(done) {
      var _user = new User(user1);
      _user.email = 'just"not"right@example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt allow invalid emails #5', function(done) {
      var _user = new User(user1);
      _user.email = 'this is"not\\allowed@example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt allow invalid emails #6', function(done) {
      var _user = new User(user1);
      _user.email = 'this\\ still\\"not\\allowed@example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt allow invalid emails #7', function(done) {
      var _user = new User(user1);
      _user.email = 'john..doe@example.com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt allow invalid emails #8', function(done) {
      var _user = new User(user1);
      _user.email = 'john.doe@example..com';
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Should save with valid email #1', function(done) {
      var _user = new User(user1);
      _user.email = 'john.doe@example.com';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Should save with valid email #2', function(done) {
      var _user = new User(user1);
      _user.email = 'disposable.style.email.with+symbol@example.com';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Should save with valid email #3', function(done) {
      var _user = new User(user1);
      _user.email = 'other.email-with-dash@example.com';
      _user.save(function(err) {
        should.not.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

    it('Shouldnt save user with too long bio ', function(done) {
      var _user = new User(user1);
      _user.bio = randomstr.generate(250);
      _user.save(function(err) {
        should.exist(err);
        if (err) done(); else _user.remove(done);
      });
    });

  });


  after(function(done) {
    User.remove().exec();
    done();
  });
});
