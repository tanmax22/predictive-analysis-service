const _ = require('lodash');

class CustomError extends Error {
	constructor(message, code, data = null, logCtx = null) {
		super(message);
		this.code = code;
		this.logCtx = logCtx;
		this.data = data;
		this.error = {
			code: code,
			msg: message,
			error: data
		};
	}

	toJSON() {
		return _.omitBy({
			message: this.message,
			code: this.code,
			errorData: this.error.error,
			logCtx: this.logCtx,
			stack: this.stack
		}, _.isNil);
	}

	toString() {
		return ` CustomError
		${this.message} \n 
		Error: ${JSON.stringify(this.error)}
		LogCtx: ${JSON.stringify(this.logCtx)}
		`;
	}
}


module.exports = {
	CustomError: CustomError,
};
