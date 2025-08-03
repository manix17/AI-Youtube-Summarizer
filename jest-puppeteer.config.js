// jest-puppeteer.config.js
module.exports = {
  launch: {
    dumpio: true,
    headless: true,
    args: [
      `--disable-extensions-except=./build`,
      `--load-extension=./build`,
    ],
  },
  browserContext: 'default',
};
