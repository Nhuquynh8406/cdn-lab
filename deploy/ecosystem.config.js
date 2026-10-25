// Cấu hình PM2 cho CDN Lab.
// Chạy trên VM, trong thư mục cdn-lab:
//   pm2 start deploy/ecosystem.config.js
//   pm2 save && pm2 startup   (chạy lệnh sudo mà pm2 in ra để tự khởi động lại sau reboot)
module.exports = {
  apps: [
    {
      name: 'cdn-lab',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
