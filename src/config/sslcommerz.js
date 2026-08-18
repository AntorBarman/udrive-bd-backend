const SSLCommerzPayment = require('sslcommerz-lts');
require('dotenv').config();

const createSSLCommerzInstance = () => {
  const store_id = process.env.SSLC_STORE_ID;
  const store_passwd = process.env.SSLC_STORE_PASSWORD;
  const is_live = process.env.SSLC_SANDBOX === 'false'; // false for sandbox
  
  return new SSLCommerzPayment(store_id, store_passwd, is_live);
};

module.exports = {
  createSSLCommerzInstance,
};