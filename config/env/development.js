'use strict';

module.exports = {
  db       : {
    uri     : 'mongodb://localhost/disapainted-dev',
    options : {
      user : '',
      pass : ''
    }
  },
  app      : {
    title : 'Disapainted - Development Environment'
  },
  facebook : {
    clientID     : process.env.FACEBOOK_ID || 'APP_ID',
    clientSecret : process.env.FACEBOOK_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/facebook/callback'
  },
  twitter  : {
    clientID     : process.env.TWITTER_ID || 'CONSUMER_KEY',
    clientSecret : process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
    callbackURL  : '/api/auth/twitter/callback'
  },
  google   : {
    clientID     : process.env.GOOGLE_ID || 'APP_ID',
    clientSecret : process.env.GOOGLE_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/google/callback'
  },
  linkedin : {
    clientID     : process.env.LINKEDIN_ID || 'APP_ID',
    clientSecret : process.env.LINKEDIN_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/linkedin/callback'
  },
  github   : {
    clientID     : process.env.GITHUB_ID || 'APP_ID',
    clientSecret : process.env.GITHUB_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/github/callback'
  },
  mailer   : {
    from    : process.env.MAILER_FROM || 'noreply@disapainted.com',
    options : {
      service : process.env.MAILER_SERVICE_PROVIDER || undefined,
      auth    : {
        user : process.env.MAILER_EMAIL_ID || undefined,
        pass : process.env.MAILER_PASSWORD || undefined
      }
    }
  }
};
