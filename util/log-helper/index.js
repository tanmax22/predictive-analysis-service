const http = require('http');
const _ = require('lodash');
const { format, createLogger, transports } = require('winston');
const { CustomError } = require('../../types/customErrors');


/**
 * All LogHelper methods
 * @class LogHelper
 */class LogHelper {
	constructor(config, indexName, consoleLogger = false) {
		this.config = config;
		this.indexName = indexName;
		if (consoleLogger || config.envConf.consoleLogger) {
			this.logger = console;
		} else {
			this.logger = createLogger({
				format: format.combine(
					format.timestamp(),
					format.json(({ level, message, label, timestamp }) => {
						return JSON.stringify({ level, message, label, timestamp });
					})
				),
				transports: [
					new transports.File({
						level: 'info',
						filename: `${process.env.HOME}/.server_logs/logger.logs`,
						maxsize: 50000,
						tailable: true,
						maxFiles: 50
					})
				]
			});
		}
	}

	static parseRequest(req) {
		if (!req) {
			return {};
		}
		return _.omitBy({
			path: `${req.method} ${!_.isNil(req.baseUrl) && req.route && !_.isNil(req.route.path) && req.baseUrl + req.route.path || req.path}`,
			headers: req.headers || undefined,
			params: req.params || undefined,
			body: req.body || undefined,
			query: req.query || undefined,
		}, _.isNil);
	}

	/**
	 * @param {Object} meta meta
	 * @returns {object}
	 */
	formatMeta(meta) {
		const newMeta = {};
		for (const key in meta) {
			if (meta.hasOwnProperty(key)) {
				try {
					const elem = meta[key];
					if (key === 'reqInfo' && elem.url) {
						// newMeta.path = elem.url;
					} else if (elem instanceof http.IncomingMessage) {
						newMeta[key] = LogHelper.parseRequest(elem);
					} else if (elem instanceof CustomError) {
						newMeta[key] = elem.toJSON();
					} else if (elem instanceof Error) {
						newMeta[key] = `${elem}\nStack: ${elem.stack}`;
					} else if (Array.isArray(elem)) {
						newMeta[key] = JSON.stringify(elem);
					} else if (typeof elem === 'string' || typeof elem === 'number') {
						newMeta[key] = elem;
					} else {
						newMeta[key] = JSON.stringify(elem);
					}
				} catch (e) {
					console.error('Error: ', e);
				}
			}
		}
		const date = new Date();
		Object.assign(newMeta, {
			indexName: this.indexName,
			hostname: this.config.envConf.hostname,
			datetime: date.getTime(),
			date: date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
			source: Error().stack.split('\n').filter((value, index) => index > 2).join('\n')
		});
		return newMeta;
	}

	/**
	 * Log Message with level `INFO`
	 * @param {string} message message
	 * @param {object} meta meta
	 */
	info(message, meta = {}) {
		this.logger.info(message, this.formatMeta(meta));
	}

	/**
	 * Log Message with level `ERROR`
	 * @param {string} message message
	 * @param {object} meta meta
	 */
	error(message, meta= {}) {
		this.logger.error(message, this.formatMeta(meta));
	}

	/**
	 * Log Message with level `WARN`
	 * @param {string} message message
	 * @param {object} meta meta
	 */
	warn(message, meta= {}) {
		this.logger.warn(message, this.formatMeta(meta));
	}

	/**
	 * Log Message with level `DEBUG`
	 * @param {string} message message
	 * @param {object} meta meta
	 */
	debug(message, meta= {}) {
		this.logger.debug(message, this.formatMeta(meta));
	}
}

module.exports = LogHelper;
