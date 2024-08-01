/* eslint-disable no-magic-numbers */
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { v4: uuid, v5: uuidv5, validate: uuidValidate } = require('uuid');
const bcrypt = require('bcrypt');
//const HashIds = require('hashids/cjs');
const crypto = require('crypto');
const { jsonrepair } = require('jsonrepair');
const short = require('short-uuid');
const moment = require('moment');
const { CustomError } = require('../types/customErrors');
const psl = require('psl');
const { DateTime } = require('luxon');
const url = require('url');

const translator = short();


const commonEmailProviderDomains = [
	'gmail.com',
	'outlook.com',
	'hotmail.com',
	'yahoo.com',
	'aol.com',
	'protonmail.com',
	'zoho.com',
	'icloud.com',
	'gmx.com',
	'mail.com',
	'yandex.com',
	'yandex.ru',
	'tutanota.com',
	'fastmail.com',
	'hushmail.com',
	'mailchimp.com',
	'proton.me'
];

function getHostName(_url) {
	let url = _.toLower(_url);
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = `http://${url}`;
	}
	const parsedUrl = new URL(url);
	return parsedUrl.hostname;
}

const getDomainName = (_url) => {
	try {
		const hostname = getHostName(_url);

		return psl.get(hostname);
	} catch (error) {
		return null; // Invalid URL
	}
};

function getHashedValueInRange(input, max, min) {
	let hash = crypto.createHash('sha256').update(input, 'utf8').digest('hex');

	let bigNum = BigInt(`0x${hash}`);

	let range = BigInt(max - min + 1);
	let scaledValue = Number(bigNum % range) + min;

	return scaledValue;
}

function roundNumber(number, n) {
	const mul = Math.pow(10, n);
	return Math.round(number * mul) / mul;
}

const URL_REGEX = new RegExp('https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9(),@:%_\\+.~#?&//=]*)', 'gm');

class Utility {

	/**
	 *
	 * @param constants
	 * @param config
	 */
	constructor( config) {
		//this.constants = constants;
		this.config = config;
		this.UUID_V5_NAMESAPCE = 'eca1d2f0-9c32-41d6-b9e0-087b82cd98d5';
		//this.hashIds = new HashIds(this.config.envConf?.salt);

		this.getDomainName = getDomainName;
		this.getHostName = getHostName;
	}

	/**
	 *
	 * @param promise
	 * @returns {*}
	 */
	invoker(promise) {
		return promise
			.then(res => [ null, res ])
			.catch(error => [ error, null ]);
	}


	/**
	 * Send express response
	 * @param {Object} err Error object in case any
	 * @param {Object} data data to be sent in response
	 * @param {Object} res response object
	 */
	writeResponse(err, data, res) {
		if (err) {
			res.status(err.code ? err.code : 400);
			return res.send(err.error ? err.error : err);
		}
		res.status(200);
		return res.json(data);
	}

	/**
	 *
	 * @param res
	 */
	sendInternalServerError(res) {
		res.status(500);
		res.json({
			code: 500,
			msg: 'Internal Server Error'
		});
	}

	/**
	 *
	 * @param msg
	 * @param err
	 * @param res
	 */
	sendErrorResponse(msg, err, res) {
		let code = err instanceof CustomError ? err.code : 500;
		this.writeResponse({
			code: code,
			error: err instanceof CustomError && err.error ? err.error : { code: code, msg: msg }
		}, null, res);
	}

	sendError(msg, code, res) {
		this.writeResponse({
			code: code,
			error: {
				code: code,
				msg: msg
			}
		}, null, res);
	}


	sendJoiValidationError(error, res) {
		const errors = this.parseJoiError(error);

		this.writeResponse({
			code: 400,
			error: {
				code: 400,
				msg: _.isString(errors[0]) ? errors[0] : 'Request validation err',
				error: {
					errors: errors
				}
			}
		}, null, res);
	}

	parseJoiError(error) {
		const details = _.get(error, 'details', []);
		const errors = _.map(details, (d) => {
			return d.message.replaceAll('"', '');
		});
		return errors;
	}

	/**
	 *
	 * @param req
	 * @param throwErr
	 * @returns {*}
	 */
	getUserIdFromRequest(req, throwErr= false) {
		const userId = req.get(this.constants.HEADERS.AUTHORIZED_USERID);

		if (throwErr && !userId) {
			throw new CustomError('Missing userid', this.constants.ERROR_CODES.BAD_REQUEST);
		}
		return userId;
	}

	/**
	 *
	 * @param req
	 * @param throwErr
	 * @returns {Dictionary<*>}
	 */
	getUserReqInfo(req, throwErr = false) {
		const userInfo = _.omitBy({
			appVersion: req.get(this.constants.HEADERS.APP_VERSION),
			deviceId: req.get(this.constants.HEADERS.DEVICE_ID),
			userId: req.get(this.constants.HEADERS.AUTHORIZED_USERID),
			caller: req.get(this.constants.HEADERS.CALLER),
			ipAddress: req.ip,
			userAgent: req.get(this.constants.HEADERS.USER_AGENT),
			country: req.get(this.constants.HEADERS.X_GRO_COUNTRY)
		}, _.isNil);

		if (throwErr && !userInfo.userId) {
			throw new CustomError('Missing userid', this.constants.ERROR_CODES.BAD_REQUEST);
		}

		if (!_.includes(this.constants.COUNTRY_WISE_CONF.ALL_COUNTRIES, userInfo.country)) {
			userInfo.country = this.constants.COUNTRY_WISE_CONF.DEFAULT_COUNTRY_FOR_MISSING;
		}

		return userInfo;
	}

	getEmailFromRequestHeader(req) {
		const headerKeys = {
			brandId: req.get(this.constants.HEADERS.BRAND),
			email: req.get(this.constants.HEADERS.EMAIL),
		};
		if (req.get(this.constants.HEADERS.PHONE)) {
			headerKeys.phoneNo = req.get(this.constants.HEADERS.PHONE);
		}
		return headerKeys;
	}

	getHeadersFromUserInfo(userInfo = {}) {
		return _.omitBy({
			[this.constants.HEADERS.APP_VERSION]: userInfo.appVersion,
			[this.constants.HEADERS.DEVICE_ID]: userInfo.deviceId,
			[this.constants.HEADERS.AUTHORIZED_USERID]: userInfo.userId,
		}, _.isNil);
	}

	// Generates UUIDV4
	/**
	 *
	 * @returns {*|string}
	 */
	generateUUIDV4() {
		return uuid();
	}

	/**
	 *
	 * @param value
	 * @returns {*|string}
	 */
	generateUUIDV5(value) {
		return uuidv5(value, this.UUID_V5_NAMESAPCE);
	}

	/**
	 *
	 * @param ms
	 * @returns {Promise<unknown>}
	 */
	async wait(ms) {
		return new Promise((res) => setTimeout(res, ms));
	}

	/**
	 *
	 * @param task
	 * @param maxRetryCount
	 * @param currentCount
	 * @param baseSleep
	 * @returns {Promise<*>}
	 */
	async retryTaskWithExponentialBackoff(task, maxRetryCount = 3, currentCount = 0, baseSleep = 1000) {
		const [ err, val ] = await this.invoker(task());
		if (!err) {
			return val;
		}
		if (currentCount < maxRetryCount) {
			if (currentCount > 0) {
				await this.wait(2 ** currentCount * baseSleep);
			}
			return this.retryTaskWithExponentialBackoff(task, maxRetryCount, currentCount + 1, baseSleep);
		}
		throw err;
	}

	async generatePasswordHash(password) {
		const hashed = await bcrypt.hash(password, 10);
		return hashed;
	}

	async comparePassword(password, hash) {
		const result = await bcrypt.compare(password, hash);
		return result;
	}

	/**
	 *
	 * @param promises
	 * @returns {Promise<*[]>}
	 */
	async allSettledWrapper(promises) {
		const res = await Promise.allSettled(promises);

		const data = [];

		for (let [ index, r ] of res.entries()) {
			if (r.status === 'rejected') {
				throw r.reason;
			} else {
				data[index] = r.value;
			}
		}

		return data;
	}

	/**
	 *
	 * @param payload
	 * @param options
	 * @param refreshTokenSecret
	 * @returns {string}
	 */
	signJWT(payload, options = undefined, refreshTokenSecret = false) {
		if (options) {
			Object.assign(options, this.constants.JWT.OPTIONS);
		}
		let secret = refreshTokenSecret ? this.config.envConf.jwtAppSecretRefresh : this.config.envConf.jwtAppSecret;
		return jwt.sign(payload, secret, options);
	}

	/**
	 *
	 * @param token
	 * @param options
	 * @param refreshTokenSecret
	 * @returns {Jwt}
	 */
	verifyJWT(token, options = undefined, refreshTokenSecret = false) {
		if (options) {
			Object.assign(options, this.constants.JWT.OPTIONS);
		}
		let secret = refreshTokenSecret ? this.config.envConf.jwtAppSecretRefresh : this.config.envConf.jwtAppSecret;
		return jwt.verify(token, secret, options);
	}

	/**
	 *
	 * @param name
	 * @returns {string}
	 */
	generateHandle(name) {
		const namePart = name.replace(/[^A-Za-z0-9]/g, '').substring(0, 5).trim().toLowerCase();

		const randomPart = _.random(1000, 9999);

		const username = `${namePart}_${randomPart}`;

		return username;
	}


	/**
	 *
	 * Encode offset from service
	 * @param input
	 * @param stringify {Boolean}
	 * @returns {string}
	 */
	encodeOffset(input, stringify) {
		if (_.isNil(input)) {
			return null;
		}

		const inputValue = stringify ? JSON.stringify(input) : input;
		const hexInputValue = Buffer.from(inputValue).toString('hex');
		return this.hashIds.encodeHex(hexInputValue);
	}

	/**
	 * Decode offset from service
	 * @param {null} offset offset to decode
	 * @param parseJson {Boolean}
	 * @param defaultValue
	 */
	decodeOffset(offset, parseJson, defaultValue = null) {
		if (_.isEmpty(offset)) {
			return defaultValue;
		}

		try {
			const decodedHex = this.hashIds.decodeHex(offset);
			if (typeof decodedHex !== 'string') {
				return defaultValue;
			}
			const decodedValue = Buffer.from(decodedHex, 'hex').toString('utf8');
			const offsetObj = parseJson ? JSON.parse(decodedValue) : decodedValue;
			if (parseJson && _.isEmpty(offsetObj)) {
				return defaultValue;
			}
			return offsetObj;
		} catch (e) {
			return defaultValue;
		}
	}

	removeNull(obj) {
		return Object.fromEntries(
			Object.entries(obj)
				.filter(([ _, value ]) => value != null)
				.map(([ key, value ]) => [
					key,
					value === Object(value) ? this.removeNull(value) : value,
				]),
		);
	}

	/**
	 *
	 * @param digit
	 * @returns {string}
	 */
	generateRandomNumber(digit = 6) {
		let otp = '';
		for (let d = 0; d + 1 < digit; d++) {
			otp = `${otp}${Math.floor(Math.random() * 10)}`;
		}
		return `${Math.floor(Math.random() * 9) + 1}${otp}`;
	}

	/**
	 * @param number
	 * @returns {string}
	 */
	encodeNumber(number) {
		return this.hashIds.encode(String(number));
	}

	/**
	 *
	 * @param number
	 * @returns {bigint | number}
	 */
	decodeNumber(number) {
		return this.hashIds.decode(number)[0];
	}

	/**
	 * Parse string to number
	 * @param str
	 * @param defaultVal
	 */
	parseInt(str, defaultVal) {
		const parsed = _.parseInt(str);
		if (_.isFinite(parsed)) {
			return parsed;
		}
		return defaultVal;
	}

	verifySignature(body, key, signature) {
		const expectedSignature = crypto.createHmac('sha256', key).update(body).digest('hex');
		return expectedSignature === signature;
	}

	captureOuterJson(completion) {
		const regex = new RegExp(/\{(.*)\}/s);
		const match = regex.exec(completion);
		if (match) {
			const extractedContent = match[0];
			try {
				const repairedContent = JSON.parse(jsonrepair(extractedContent));
				return repairedContent;
			} catch (err) {
				console.log(err);
				return null;
			}
		}
		return null;
	}

	cleanText(text) {
		// Remove extra quotes at the start or end
		let cleanedText = text.replace(/^\"|\"$/g, '');
		// Remove all newline characters
		cleanedText = cleanedText.replace(/\n/g, '');
		cleanedText = cleanedText.replace(/\"/g, '');
		return cleanedText.trim();
	}

	expandUuid(shortUuid) {
		const id = translator.toUUID(shortUuid);
		return id;
	}

	shortenUuid(id) {
		return translator.fromUUID(id);
	}

	validateUUID(uuid) {
		return uuidValidate(uuid);
	}

	editDistance(s1, strings) {
		const m = s1.length;
		for (let index = 0; index < strings.length; index++) {
			let s2 = strings[index];
			const n = strings[index].length;
			// Initialize a table to store the edit distances.
			const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0));

			// Fill in the table, considering the base cases.
			for (let i = 0; i <= m; i++) {
				for (let j = 0; j <= n; j++) {
					// If s1 is empty, the distance is the length of s2.
					if (i === 0) {
						dp[i][j] = j;
					}
					// If s2 is empty, the distance is the length of s1.
					else if (j === 0) {
						dp[i][j] = i;
					}
					// If the last characters are the same, no edit is needed.
					else if (s1[i - 1] === s2[j - 1]) {
						dp[i][j] = dp[i - 1][j - 1];
					}
					// If the last characters are different, consider all possible edits.
					else {
						dp[i][j] = 1 + Math.min(dp[i][j - 1], // Insert
							dp[i - 1][j], // Remove
							dp[i - 1][j - 1]); // Replace
					}
				}
			}
			if (dp[m][n] <= 3) {
				return strings[index];
			}
		}
		return null;
	}

	/**
	 *
	 * @param timestamp
	 * @returns {string}
	 */
	getDateWithoutTime(timestamp) {
		const date = new Date(timestamp);
		return this.parseDate(date);
	}

	/**
	 *
	 * @param date
	 * @returns {string}
	 */
	parseDate(date) {
		return moment(date).format('Do MMM');
	}


	/**
	 * Distribute items by weight
	 * @param total
	 * @param weightMap
	 * @returns {{}}
	 */
	distributeItemsByWeight(total, weightMap) {
		const percentageMap = {};
		let sumOfWeights = 0;
		const distributionMap = _.reduce(weightMap, (acc, val, key) => {
			acc[key] = 0;
			return acc;
		}, {});

		for (let [ , val ] of Object.entries(weightMap)) {
			sumOfWeights = sumOfWeights + val;
		}
		if (sumOfWeights === 0) {
			return distributionMap;
		}


		for (let [ key, val ] of Object.entries(weightMap)) {
			percentageMap[key] = val / sumOfWeights;
		}

		let sum = 0;
		let amortized = 0;

		const keys = _.keys(percentageMap);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const percentage = _.get(percentageMap, key, 0);

			if (i === keys.length - 1) {
				distributionMap[key] = total - sum;
				continue;
			}
			const realVal = percentage * total + amortized;
			const natural = Math.floor(realVal);
			amortized = realVal - natural;

			distributionMap[key] = natural;
			sum = sum + natural;
		}
		return distributionMap;
	}

	/**
	 * @param {number} date
	 * @param {number} days
	 * @returns {Date}
	 */
	addDays(date, days) {
		let result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}

	/**
	 * @param {number} days
	 * @returns {Date}
	 */
	getNDaysFromNow(days) {
		return this.addDays(Date.now(), days);
	}

	isWorkEmail(email) {
		const domain = email.split('@')[1];

		return !_.includes(commonEmailProviderDomains, domain);
	}

	/**
	 * Returns last doc createdAt, if empty returns null
	 * @param {Array<Object>} documents
	 * @param {number} limit limit
	 */
	getOffsetForDocumentsListFetch(documents, limit) {
		if (_.isEmpty(documents)) {
			return null;
		}

		if (documents.length < limit) {
			return null;
		}

		const lastTransaction = _.last(documents);

		return this.encodeOffset({
			createdAt: _.isNumber(lastTransaction.createdAt) ? new Date(lastTransaction.createdAt) : lastTransaction.createdAt
		}, true);
	}

	/**
	 * Returns last doc createdAt, if empty returns null
	 * @param {Array<mongoose.Document>} documents
	 * @param {number} limit limit
	 * @param fields
	 * @returns {null|Date}
	 */
	getOffsetForDocumentsListFetchFieldBasis(documents, limit, fields) {
		let newOffset = null;
		if (!_.isEmpty(documents)) {
			const lastTransaction = _.last(documents);

			if (documents.length < limit) {
				return null;
			}

			newOffset = this.encodeOffset({
				..._.pick(lastTransaction, fields)
			}, true);
		}

		return newOffset;
	}

	timestampOlderThan(ts, val) {
		if (_.isNil(ts)) {
			return false;
		}

		return ts < Date.now() - val;
	}

	parseNumber(str, defaultVal = 0) {
		const parsed = Number(str);
		if (_.isFinite(parsed)) {
			return parsed;
		}
		return defaultVal;
	}

	getLastMonthsDates(n, day = 1) {
		const dates = [];

		for (let i = 0; i < n; i++) {
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() - i);

			const year = currentDate.getFullYear();
			const month = currentDate.getMonth() + 1; // Adding 1 since getMonth() returns 0-indexed value
			const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

			dates.push(formattedDate);
		}

		return dates.reverse();
	}


	convertDateToFormat(date, format) {
		return moment(date).format(format);
	}

	/**
	 *
	 * @param timestamp
	 * @returns {string}
	 */
	getDateInMonthYearFormat(timestamp) {
		return moment(timestamp).format('MMM YYYY');
	}

	/**
	 *
	 * @param number
	 * @returns {{number, isOutSideIndia: boolean, isValid: boolean}|{number, isValid: boolean}|{number: string, isValid: boolean}|{isValid: boolean}}
	 */
	validateAndParsePhoneNumber(number) {
		let phoneNo = String(number);
		phoneNo = phoneNo.replace('+', '');
		if (phoneNo.length < 10) {
			return { isValid: false };
		}

		if (phoneNo.length === 10) {
			return { number: `91${phoneNo}`, isValid: true };
		}

		if (phoneNo.length === 12 && _.startsWith(phoneNo, '91', 0)) {
			return { number: phoneNo, isValid: true };
		}

		return { number: phoneNo, isValid: false, isOutSideIndia: true };
	}

	humanizeNumber(value) {
		let val;
		if (value >= 1000000000) {
			val = value / 1000000000;
			if (val.toFixed(1).length > 3) {
				return `${val.toFixed(0)}B`;
			}
			return `${val.toFixed(1)}B`;
		}

		if (value >= 1000000) {
			val = value / 1000000;
			if (val.toFixed(1).length > 3) {
				return `${val.toFixed(0)}M`;
			}
			return `${val.toFixed(1)}M`;
		}
		if (value >= 1000) {
			val = value / 1000;
			if (val.toFixed(1).length > 3) {
				return `${val.toFixed(0)}K`;
			}
			return `${val.toFixed(1)}K`;
		}

		if (value >= 100) {
			return `${value.toFixed(0)}`;
		}

		if (value >= 10) {
			return `${value.toFixed(1)}`;
		}

		if (value >= 1) {
			return `${value.toFixed(2)}`;
		}

		if (value < 1 && value > 0) {
			return value.toPrecision(3);
		}

		return `${value}`;
	}

	secondsToHMS(seconds) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor(seconds % 3600 / 60);
		const remainingSeconds = seconds % 60;

		return [ hours, minutes, remainingSeconds ]
			.map(unit => String(unit).padStart(2, '0')) // Ensure 2 digits
			.join(':');
	}


	getFirstDateOfCurrentMonth() {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}

	isToday(inputDate) {
		const today = new Date();
		return inputDate.getDate() === today.getDate() &&
			inputDate.getMonth() === today.getMonth() &&
			inputDate.getFullYear() === today.getFullYear();
	}

	/**
	 * Round number
	 * @param number {Number}
	 * @param n {Number}
	 * @returns {number}
	 */
	roundNumber(number, n = 2) {
		return roundNumber(number, n);
	}

	getAmountAfterTax(amount, taxRate) {
		return this.roundNumber(amount + this.roundNumber( amount * taxRate/100));
	}

	convertDateMidnightDate(d = new Date(), minsOffset = 5) {
		d.setHours(0, minsOffset, 0, 0);
		return d;
	}

	getNextNDates(startTimestamp, n) {
		let startDate = this.convertDateMidnightDate(new Date(startTimestamp));
		let dates = [];

		for (let i = 0; i < n; i++) {
			startDate.setDate(startDate.getDate() + 1);

			dates.push(startDate.getTime());
		}

		return dates;
	}

	getHashedValueInRange(min, max, input) {
		return getHashedValueInRange(input, max, min);
	}

	getDateInIST(date) {
		let dt = DateTime.fromJSDate(date);

		const dtInIST = dt.setZone('Asia/Kolkata');

		return dtInIST.toJSDate();
	}

	getDateInUTC(date) {
		let dt = DateTime.fromJSDate(date);

		const dtInIST = dt.toUTC();

		return dtInIST.toJSDate();
	}

	isObject(obj) {
		return obj && typeof obj === 'object' && !Array.isArray(obj);
	}

	isEmptyArry(obj) {
		return _.isArray(obj) && !_.isEmpty(obj);
	}


	jsonDifference(obj1, obj2) {
		const differences = {};

		const compareValues = (key, value1, value2) => {
			if (_.isObject(value1) && _.isObject(value2)) {
				const nestedDiff = this.jsonDifference(value1, value2);
				if (Object.keys(nestedDiff).length > 0) {
					differences[key] = nestedDiff;
				}
			} else if (!_.isEqual(value1, value2)) {
				differences[key] = { prevValue: value1, currentValue: value2 };
			}
		};

		// Check for differences in obj1
		Object.keys(obj1).forEach(key => {
			if (!_.has(obj2, key)) {
				differences[key] = { prevValue: obj1[key], currentValue: undefined };
			} else {
				compareValues(key, obj1[key], obj2[key]);
			}
		});

		// Check for differences in obj2
		Object.keys(obj2).forEach(key => {
			if (!_.has(obj1, key)) {
				differences[key] = { prevValue: undefined, currentValue: obj2[key] };
			} else if (!_.has(differences, key)) {
				compareValues(key, obj1[key], obj2[key]);
			}
		});

		return differences;
	}

	formatDateWithTime(ts) {
		return DateTime.fromMillis(ts).toLocaleString(DateTime.DATETIME_MED);
	}

	getFormattedDate(dateString) {
		return DateTime.fromJSDate(new Date(dateString)).toLocaleString(DateTime.DATE_MED);
	}

	isValidUrl(url) {
		return URL_REGEX.test(url);
	}

	getOriginFromUrl(website) {
		try {
			const url = new URL(website);
			return url.origin;
		} catch (e) {
			return null;
		}
	}


	validateSingleAlternativeSchema(schema, obj) {
		let errors = [];

		_.keys(schema).forEach(key => {
			const field = schema[key];

			if (field.required && !_.has(obj, key)) {
				errors.push(`Missing required field: ${key}`);
			}

			if (_.has(obj, key) && typeof _.get(obj, key) !== field.type) {
				errors.push(`Invalid type for ${key}: expected ${field.type}, got ${typeof _.get(obj, key)}`);
			}
		});

		if (errors.length === 0) {
			return { valid: true };
		}
		return { valid: false, errors: errors, message: _.join(errors, ',') };
	}

	/**
	 * @param schema
	 * @param obj
	 * @returns {{valid: boolean, errors: *[]}|{valid: boolean}}
	 */
	validateObject(schema, obj) {
		const { alternatives } = schema;

		if (_.isArray(alternatives) && !_.isEmpty(alternatives)) {
			let validationResults = [];

			for (let aSchema of alternatives) {
				const validationResult = this.validateSingleAlternativeSchema(aSchema, obj);
				validationResults.push(validationResult);

				if (validationResult.valid) {
					return {
						valid: true,
					};
				}
			}

			let leastErrors = validationResults.reduce((acc, curr) => (acc.errors.length <= curr.errors.length ? acc : curr), validationResults[0]);

			return {
				valid: false,
				errors: leastErrors.errors,
				message: leastErrors.message || 'No alternative schema matches the object.'
			};
		}

		return this.validateSingleAlternativeSchema(schema, obj);
	}

	getWebsiteOrigin(webUrl) {
		let website = webUrl;
		if (!website.startsWith('http://') && !website.startsWith('https://')) {
			website = `https://${website}`;
		}
		const url = new URL(website);
		return url.origin;
	}

	getWebsiteOriginWithPathAndQuery(webUrl) {
		let website = webUrl;
		if (!website.startsWith('http://') && !website.startsWith('https://')) {
			website = `https://${website}`;
		}
		const url = new URL(website);
		return url.origin + (url.pathname !== '/' ? url.pathname : '') + (url.search !== '' ? url.search : '');
	}

	formatJSONObject(obj) {
		let output = '';
		for (const key in obj) {
			if (_.has(obj, key)) {
				output = `${output }${key}: ${obj[key]}\n`;
			}
		}
		return output.trim();
	}


	getBudgetOptions() {
		return [
			{ title: '1 Lakh - 3 Lakh', description: 'first budget' },
			{ title: '3 Lakh - 5 Lakh', description: 'second budget' },
			{ title: '5 Lakh - 10 Lakh', description: 'third budget' },
			{ title: '10 Lakh +', description: 'third budget' },
		];
	}

	dateParser(date) {
		date.setDate(date.getDate() + 1); // Move to the next day
		const formattedDate = [
			date.getDate().toString().padStart(2, '0'), // Day
			(date.getMonth() + 1).toString().padStart(2, '0'), // Month (zero-based, hence +1)
			date.getFullYear() // Year
		].join('-');
		return formattedDate;
	}

	/**
	 *
	 * @param date
	 * @returns {number}
	 */
	dateStartTime(date) {
		const dateTime = new Date(date);
		return dateTime.setHours(0, 0, 0, 0);
	}

	/**
	 *
	 * @param date
	 * @returns {boolean}
	 */
	isTodaysDate(date) {
		let timestamp = date.getTime();
		let todayStartingTime = this.dateStartTime(Date.now());
		return timestamp > todayStartingTime;
	}

	/**
	 *

	 * @returns {*[]}
	 */
	getUpcomingWorkingDays() {
		const result = [];
		const date = new Date();

		while (result.length < 3) {
			date.setDate(date.getDate() + 1); // Move to the next day
			const dayOfWeek = date.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6

			if (dayOfWeek !== 0 && dayOfWeek !== 6) { // If it's not Saturday or Sunday
				// Format the date as dd-mm-yyyy
				const formattedDate = this.dateParser(date);
				result.push(formattedDate); // Add the formatted date to the result array
			}
		}

		return result;
	}

	/**
	 *
	 * @returns {*[]}
	 */
	bookDemoSlots() {
		const upcomingWorkingDates = this.getUpcomingWorkingDays();
		let options = [];
		upcomingWorkingDates.forEach((date) => {
			options.push(...[
				{ title: `${date}  10 AM - 1 PM`, description: 'first slot' },
				{ title: `${date}  2 PM - 4 PM`, description: 'second slot' },
				{ title: `${date}  4 PM - 7 PM`, description: 'first slot' }
			]);
		});

		return options;
	}

	/**
	 *
	 * @param url
	 * @param queryParams
	 * @returns {string}
	 */
	createURLString({ url, queryParams }) {
		const params = new URLSearchParams(_.omitBy(queryParams, _.isNil));
		return `${url}?${params}`;
	}


	/**
	 *
	 * @param text
	 * @returns {*|*[]}
	 */
	extractHashTags(text) {
		const hashtagRegex = /#\w+/g;

		// Use the regular expression to find matches in the input text
		const hashtags = text.match(hashtagRegex);

		// Return the array of hashtags, or an empty array if no hashtags are found
		return hashtags || [];
	}

	/**
	 *
	 * @param text
	 * @returns {*|*[]}
	 */
	extractMentions(text) {
		const mentionRegex = /@\w+/g;

		// Use the regular expression to find matches in the input text
		const mentions = text.match(mentionRegex);

		// Return the array of mentions, or an empty array if no mentions are found
		return mentions || [];
	}

	/**
	 *
	 * @param val
	 * @returns {*|unknown[]|*[]}
	 */
	toArray(val) {
		if (_.isString(val) || _.isNumber(val) || _.isBoolean(val)){
			return [ val ];
		} else if (_.isArray(val)) {
			return val;
		}

		return _.values(val);
	}

	emptyValue(val) {
		if (_.isNumber(val)) {
			return _.isNaN(val);
		}
		return _.isEmpty(val);
	}

	/**
	 *
	 * @param address
	 * @returns {UrlWithParsedQuery}
	 */
	parseURL(address) {
		return url.parse(address, true);
	}

	/**
	 * @param arr
	 */
	arrayToString(arr) {
		if (_.isString(arr)) {
			return arr;
		} else if (_.isArray(arr)) {
			return arr.join(',');
		}
		return JSON.stringify(arr);
	}

	maskName(name, circleSymbol = '●') {
		let maskedName = '';
		let isAlternate = false;

		for (let i = 0; i < name.length; i++) {
			if (name.charAt(i) === ' ') {
				maskedName = `${maskedName } `;
			} else {
				if (isAlternate) {
					maskedName = maskedName + circleSymbol;
				} else {
					maskedName = maskedName + name.charAt(i);
				}
				isAlternate = !isAlternate; // Toggle the alternate flag
			}
		}

		return maskedName;
	}
}

module.exports = {
	Utility,
	getDomainName,
	getHashedValueInRange,
	roundNumber
};
