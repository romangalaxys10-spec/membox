module.exports = {
  apps: [
    {
      name: 'membox-v1',
      script: '.next/standalone/server.js',
      cwd: '/home/z/my-project',
      env: {
        DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
        PORT: 3000,
        STORAGE_PATH: '/home/z/my-project/data/smailspace',
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 3000,
      max_restarts: 20,
    },
    {
      name: 'membox-v2',
      script: 'server.js',
      cwd: '/tmp/membox-v2/app',
      env: {
        DATABASE_URL: 'file:/tmp/membox-v2-db/custom.db',
        PORT: 3001,
        STORAGE_PATH: '/home/z/my-project/data/smailspace',
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 3000,
      max_restarts: 20,
    },
  ],
}
