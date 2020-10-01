module.exports = {
  apps: [{
    name: "Hull Snov",
    script: "dist/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "200M",
    env: {
      NODE_ENV: "staging",
    },
    env_production: {
      NODE_ENV: "production",
    },
  }],
  apps: [{
    name: "Hull Snov Worker",
    script: "dist/worker.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "300M",
    env: {
      NODE_ENV: "staging",
    },
    env_production: {
      NODE_ENV: "production",
    },
  }],
};
