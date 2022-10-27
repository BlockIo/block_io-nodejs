const https = require('https');
const axios = require('axios');

const DEFAULT_AGENT_OPTIONS = {
  keepAlive: true,
  keepAliveMsecs: 30000,
  timeout: 30000,
};

function HttpsClient(options, userAgent) {
  const agentOpts = cloneOrReplace(DEFAULT_AGENT_OPTIONS, options || {});
  setProp(this, 'agent', new https.Agent(agentOpts));
  setProp(this, 'userAgent', userAgent);
}

HttpsClient.prototype.request = function (method, url, data) {

    return new Promise((f) => {
      axios({
	timeout: DEFAULT_AGENT_OPTIONS.timeout,
	headers: {'User-Agent': this.userAgent, 'Content-Type': 'application/json'},
	method: method,
	httpsAgent: this.agent,
	url: url,
	data: data
      }).then(function (response) {
	f({res: response, body: JSON.stringify(response.data)});
      }).catch(function(e){
	if(Object.prototype.hasOwnProperty.call(e, 'response') && Object.prototype.hasOwnProperty.call(e.response, 'data')) {
          f({res: e.response, body: JSON.stringify(e.response.data)});
	} else {
          f({res: {}, body: JSON.stringify({data: {error_message: e.code}})});
	}
      });
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
