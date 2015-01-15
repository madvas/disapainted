'use strict';

/**
 * module dependencies.
 */

var app = require('../../../server')
  , config = require('../../../config/config')
  , request = require('supertest')
  , randomstr = require('randomstring')
  , _ = require('lodash')
  , should = require('should')
  , mongoose = require('mongoose')
  , User = mongoose.model('User')
  , agent = request.agent(app)
  , agentLoggedOut = request.agent(app)
  , fs = require('fs')
  , mockMailer = require('mock-nodemailer')
  , testData = require('./user-test-data.json')
  , randName = _.partial(randomstr.generate, 16);

/**
 * Globals
 */
var user1, userId;


describe('User REST API tests', function() {

  before(function(done) {
    user1 = {
      username : randName(),
      email    : 'test' + randName() + '@test.com',
      password : 'password',
      provider : 'local',
      bio      : randomstr.generate(120)
    };

    userId = user1.username;
    user1.confirmPassword = user1.password;
    User.find({}).remove(done);
  });

  it('should be able to save user without any problems', function(done) {
    agent.post('/api/auth/signup')
      .send(user1)
      .expect(200)
      .expect(/_id/)
      .expect(/email/, done);
  });

  it('should be able to log in', function(done) {
    agent.post('/api/auth/signin')
      .send(user1)
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should be able to log out', function(done) {
    agent.get('/api/auth/signout')
      .expect('Location', /\//)
      .expect(302, done);
  });

  it('should be able to reset forgotten password', function(done) {
    done = _.after(2, done);
    mockMailer.expectEmail(function(sentEmail) {
      user1.email.should.eql(sentEmail.to);
      return true;
    }, done);
    agent.post('/api/auth/forgot')
      .send({email : user1.email})
      .expect(200, done);
  });

  it('shouldnt be able to save user with the same username', function(done) {
    agent.post('/api/auth/signup')
      .send(user1)
      .expect(400, done);
  });

  it('shouldnt be able to save user with the same email address', function(done) {
    var _user = _.assign(_.clone(user1), {username : randName()});
    agent.post('/api/auth/signup')
      .send(_user)
      .expect(400, done);
  });

  it('should get proper error message with invalid username', function(done) {
    var _user = _.assign(_.clone(user1), {username : 'johny yesman'});
    agent.post('/api/auth/signup')
      .send(_user)
      .expect(400)
      .expect(/message/, done);
  });

  it('should get proper error message with invalid email', function(done) {
    var _user = _.assign(_.clone(user1), {email : 'not.an.email.address'});
    agent.post('/api/auth/signup')
      .send(_user)
      .expect(400)
      .expect(/message/, done);
  });

  it('should load public info about user', function(done) {
    agent.get('/api/users/' + userId)
      .expect(200)
      .end(function(err, res) {
        res.body.should.have.properties('_id', 'created', 'likesCount', 'bio');
        done();
      });
  });

  describe('User Portrait', function() {
    before(function(done) {
      agent.post('/api/auth/signin')
        .send(user1)
        .expect(200, done);
    });

    it('should be able to save user portrait', function(done) {
      agent.post('/api/users/' + userId + '/portrait')
        .send(_.pick(testData, 'portrait'))
        .expect(200)
        .end(function(err) {
          var file = config.users.portraits.dir + userId + '.png';
          should.not.exist(err);
          fs.existsSync(file).should.eql(true);
          fs.unlink(file, done);
        });
    });

    it('should not save user portrait of non logged user', function(done) {
      agentLoggedOut.post('/api/users/' + userId + '/portrait')
        .send(_.pick(testData, 'portrait'))
        .expect(401, done);
    });

  });


});
