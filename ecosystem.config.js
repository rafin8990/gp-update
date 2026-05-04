module.exports = {
  apps: [
    {
      name: 'GP-Engine',
      script: 'node_modules/.bin/ts-node-dev',
      cwd: '/var/www/grameenphone_warehouse_management/Backend',
      args: '--respawn --transpile-only src/server.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      max_memory_restart: '1G',
      error_file: '/var/www/grameenphone_warehouse_management/Backend/logs/pm2-error.log',
      out_file: '/var/www/grameenphone_warehouse_management/Backend/logs/pm2-out.log',
      log_file: '/var/www/grameenphone_warehouse_management/Backend/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
      // For production build (after running 'npm run build' in Backend):
      // script: 'dist/server.js',
      // cwd: '/var/www/grameenphone_warehouse_management/Backend',
      // args: '',
      // Remove the ts-node-dev script and args lines above
    },
    {
      name: 'GP-Client',
      script: 'node_modules/next/dist/bin/next',
      cwd: '/var/www/grameenphone_warehouse_management/Frontend',
      args: 'dev -p 3005',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3005
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      watch: false,
      ignore_watch: ['node_modules', '.next', '.git'],
      max_memory_restart: '1G',
      error_file: '/var/www/grameenphone_warehouse_management/Frontend/logs/pm2-error.log',
      out_file: '/var/www/grameenphone_warehouse_management/Frontend/logs/pm2-out.log',
      log_file: '/var/www/grameenphone_warehouse_management/Frontend/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // For production build, use this instead:
      // args: 'start -p 3005',
      // Make sure to run 'npm run build' in Frontend directory first
    }
  ]
};

