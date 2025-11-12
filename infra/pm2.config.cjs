module.exports = {
apps: [
{
name: 'senaf-api',
script: 'src/server.js',
cwd: './api',
env: { NODE_ENV: 'production' },
},
],
};