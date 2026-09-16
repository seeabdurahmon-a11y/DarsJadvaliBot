module.exports = {
  apps: [
    {
      name: 'darsjadvalibot',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      max_restarts: 100,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true
    }
  ]
};
