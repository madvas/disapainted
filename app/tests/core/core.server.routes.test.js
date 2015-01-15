'use strict';

var app = require('../../../server')
  , mongoose = require('mongoose')
  , config = require('../../../config/config')
  , randomstr = require('randomstring')
  , _ = require('lodash')
  , should = require('should')
  , request = require('supertest')
  , agent = request.agent(app)
  , mockMailer = require('mock-nodemailer');

describe('Core REST API tests', function() {
  describe('Contact API tests', function() {
    it('should be able to use contact form api', function(done) {
      done = _.after(2, done);
      mockMailer.expectEmail(function(sentEmail) {
        config.users.contact.email.should.eql(sentEmail.to);
        sentEmail.subject.should.eql('Hello');
        return true;
      }, done);
      agent.post('/api/contact')
        .send({
          email   : 'test@email.com',
          subject : 'Hello',
          message : randomstr.generate(250)
        })
        .expect(200, done);
    });

    it('should not allow too long contact message', function(done) {
      agent.post('/api/contact')
        .send({
          email   : 'test@email.com',
          subject : 'Hello',
          message : randomstr.generate(2500)
        })
        .expect(400, done);
    });

    it('should not allow too long contact subject', function(done) {
      agent.post('/api/contact')
        .send({
          email   : 'test@email.com',
          subject : randomstr.generate(300),
          message : randomstr.generate(150)
        })
        .expect(400, done);
    });

  });
});
