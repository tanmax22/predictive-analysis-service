const axiosDefault = require('axios');
const { Agent } = require('http');
const { constants: httpConstants } = require('http2');
const qs = require('qs');
const _ = require('lodash');
const { error } = require('winston');
const dns = require('dns');
const { Resolver, lookup } = require('node:dns').promises;
const resolver = new Resolver();


class HttpError extends Error {
	constructor(err, ctx) {
		const message = err.message || 'HTTP Error';
		super(message);
		this.name = 'HttpError';
		this.err = err;
		this.ctx = ctx;
	}

	toJSON() {
		return {
			message: this.message,
			err: this.err,
			ctx: this.ctx,
			name: this.name
		};
	}

	toErrorObject() {
		return {
			message: this.message,
			ctx: this.ctx
		};
	}

	toString() {
		return `${this.name} ${this.message} \n ${this.ctx.method} ${this.ctx.url} \n ${this.ctx.response}`;
	}
}

class Http {

	/**
	 *
	 * @param callerName
	 * @param logger
	 * @param utility {Utility}
	 */
	constructor(callerName, utility) {
		this.callerName = callerName;
		this.axios = axiosDefault.create({
			timeout: 10000,
			paramsSerializer: {
				encode: qs.parse,
				serialize: qs.stringify
			},
			httpAgent: new Agent({
				keepAlive: true,
				keepAliveMsecs: 3000
			}),
			validateStatus: (status) => status === httpConstants.HTTP_STATUS_OK,
			headers: { 'X-GRO-CALLER': this.callerName }
		});
		//this.logger = logger;
		this.utility = utility;
	}


	/**
	 *
	 * @param baseURL
	 * @returns {Promise<string>}
	 */
	async resolveSrvUrl(baseURL) {
		return await this.utility.retryTaskWithExponentialBackoff(async () => {
			const addresses = await resolver.resolveSrv(baseURL);
			const address = _.sample(addresses);
			if (!address) {
				this.logger.error('got invalid address from dns resolver', { err: error('Fail to resolve dns'), baseURL: baseURL });
				throw new Error('Fail to resolve dns');
			}
			return `http://${address.name}:${address.port}`;
		}, 3, 0, 1);
	}

	/**
	 *
	 * @param reqSetting
	 * @returns {Promise<string>}
	 */
	async _parseRequestURL (reqSetting) {
		if (!reqSetting) {
			throw new Error('invalid request setting passed');
		}
		if (reqSetting.srvConfig && reqSetting.srvConfig.useSRV) {
			if (reqSetting.pathname === '') {
				throw new Error(`invalid url passed : ${reqSetting.pathname}`);
			}
			const baseURL = await this.resolveSrvUrl(reqSetting.srvConfig.serviceDiscEndpoint);
			return `${baseURL}/${reqSetting.pathname}`;
		}

		if (!reqSetting.pathname || reqSetting.pathname === '') {
			return reqSetting.baseURL;
		}

		return `${reqSetting.baseURL}/${reqSetting.pathname}`;
	}

	/**
	 *
	 * @param reqSetting
	 * @param method
	 * @param headers
	 * @param queryParams
	 * @param body
	 * @param agent
	 * @param timeout
	 * @param validStatus
	 * @param paramsSerializer
	 * @returns {Promise<{responseBody: *, responseHeaders: *, host, statusCode: *}>}
	 */
	async request({ reqSetting, method, headers, queryParams, body, agent, timeout, validStatus = [ 200 ], paramsSerializer, auth } = {}) {
		const url = await this._parseRequestURL(reqSetting);
		return await this.requestWithoutSRV({ method, url, headers, queryParams, body, agent, timeout, paramsSerializer, validStatus, auth });
	}

	async requestWithoutSRV({ method, url, headers, queryParams, body, agent, timeout, paramsSerializer, validStatus, auth }) {
		const response = await this.axios({
			method: method || 'GET',
			url: url,
			headers: headers,
			params: queryParams,
			data: body,
			httpAgent: agent,
			timeout: timeout,
			paramsSerializer: paramsSerializer,
			validateStatus: !_.isEmpty(validStatus) ? (status) => validStatus.includes(status) : null,
			auth: auth
		}).then(res => {
			return {
				host: (res.request || {}).host,
				statusCode: res.status,
				responseBody: res.data,
				responseHeaders: res.headers
			};
		}).catch(err => {
			const errorObj = typeof err.toJSON === 'function' ? err.toJSON() : err;
			if (errorObj && errorObj.config) {
				delete errorObj.config.httpAgent;
				delete errorObj.config.httpsAgent;
			}

			let errCtx = {
				method: _.get(err, 'config.method'),
				url: _.get(err, 'config.url'),
				response: JSON.stringify(_.get(err, 'response.data', {}))
			};

			// this.logger.error(`Failed HTTP Request to url ${url} with statusCode ${_.get(err, 'response.status')}`, {
			// 	err, errCtx, queryParams,
			// 	headers, body
			// });

			return Promise.reject(new HttpError(errorObj, errCtx));
		});
		return Promise.resolve(response);
	}

	async downloadFileFromCDN(url) {
		const response = await axiosDefault.get(url, { responseType: 'arraybuffer' });
		return response.data;
	}

	async getHTMLForWebsite(website) {
		const response = await axiosDefault.get(website, {
			headers: {
				'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		});
		return response.data;
	}

	async getHeaders(url) {
		const resp = await this.requestWithoutSRV({
			method: 'HEAD',
			url
		});
		return resp.responseHeaders;
	}


	async checkDnsEntry(website) {
		const domain = this.utility.getHostName(website);

		return new Promise((resolve, reject) => {
			dns.resolve(domain, (err) => {
				if (err) {
					if (err.code === 'ENOTFOUND') {
						resolve(false);
					} else {
						reject(err);
					}
				} else {
					resolve(true);
				}
			});
		});
	}
}

module.exports = Http;
