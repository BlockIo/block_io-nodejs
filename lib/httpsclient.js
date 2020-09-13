const https = require('https');
const qs = require('querystring');

const DEFAULT_AGENT_OPTIONS = {
  keepAlive: true,
  keepAliveMsecs: 30000,
  scheduling: 'lifo',
  timeout: 30000,
};

const DEFAULT_REQUEST_OPTIONS = {
  agent: null,
  dhparam: null,
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_DHE_RSA_WITH_AES_128_GCM_SHA256',
  ].join(':'),
  honorCipherOrder: true,
  minVersion: 'TLSv1.2',
}

// v10 hack to fallback to different notation
if (process.version && process.version.match(/^v10/)) {
  DEFAULT_REQUEST_OPTIONS.ciphers = [
    'ECDHE_RSA_AES128_GCM_SHA256',
    'ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  ].join(':');
}

function HttpsClient(options, userAgent, dhparam) {
  const agentOpts = cloneOrReplace(DEFAULT_AGENT_OPTIONS, options || {});
  setProp(this, 'agent', new https.Agent(agentOpts));
  setProp(this, 'userAgent', userAgent);
  setProp(this, 'dhparam', dhparam);
}

HttpsClient.prototype.request = function (method, url, data) {
  const client = this;

  return new Promise((f,r) => {

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return r(e);
    }

    const qsData = qs.stringify(data);

    const opts = cloneOrReplace(DEFAULT_REQUEST_OPTIONS, {
      agent: client.agent,
      dhparam: client.dhparam
    });

    // process method
    setProp(opts, 'method', method);

    function _handleResponse(res) {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        f({res: res, body: Buffer.concat(chunks).toString('utf8')});
      });
    }

    try {
      const req = https.request(urlObj, opts, _handleResponse);

      req.on('error', e => r(e));

      switch(method) {
        case 'POST':
        case 'PUT':
          req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
          req.setHeader('Accept', 'application/json');
          req.setHeader('User-Agent', client.userAgent);
          req.setHeader('Transfer-Encoding', 'chunked');
          req.end(qsData);
          break;
        default:
          req.end();
          break;
      }
    } catch (e) {
      r(e);
    }

  });
}

// convenience function for setting property to an obj
function setProp(obj, name, value) {
  Object.defineProperty(obj, name, {value: value, writeable: false, enumerable: true});
}

// for each key in a, if a key in b exists, use b's value, otherwise use a's
function cloneOrReplace(a, b) {
  const out = Object.create(null);

  Object.keys(a).forEach(k => {
    if (['__proto__', 'constructor'].indexOf(k) !== -1) return;

    const value = Object.prototype.hasOwnProperty.call(b, k) ? b[k] : a[k];
    setProp(out, k, value);
  });

  return out;
}

module.exports = HttpsClient;
