module.exports = {
  apps: [{
    name:        'cfbc-invig',
    script:      'server.js',
    cwd:         '/opt/cfbc-invig/backend',
    watch:       false,
    env: {
      NODE_ENV: 'production',
      PORT:     3005,
    },
    error_file:  '/var/log/cfbc-invig-error.log',
    out_file:    '/var/log/cfbc-invig-out.log',
    time:        true,
  }]
};
