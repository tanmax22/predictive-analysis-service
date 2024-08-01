const container = require('../tests/container');

describe('Utility', () => {
	const utilClass = container.resolve('utility');

	describe('generateRandomNumber', () => {
		it('should generate a number of the specified number of digits', () => {
			const digit = 6;
			const otp = utilClass.generateRandomNumber(digit);
			expect(otp.length).toBe(digit);
		});

		it('should generate a number with the first digit between 1 and 9', () => {
			const digit = 6;
			const otp = utilClass.generateRandomNumber(digit);
			const firstDigit = parseInt(otp.charAt(0), 10);
			expect(firstDigit).toBeGreaterThanOrEqual(1);
			expect(firstDigit).toBeLessThanOrEqual(9);
		});


		it('should generate numbers of different values for multiple calls', () => {
			const digit = 6;
			const otp1 = utilClass.generateRandomNumber(digit);
			const otp2 = utilClass.generateRandomNumber(digit);
			expect(otp1).not.toBe(otp2);
		});
	});

	describe('extractMentions', () => {
		it('should extract all mentions from a given text', () => {
			const text = 'Hello @user1, meet @user2 and @user3';
			const mentions = utilClass.extractMentions(text);
			expect(mentions).toEqual([ '@user1', '@user2', '@user3' ]);
		});

		it('should return an empty array if no mentions are found', () => {
			const text = 'Hello user, there are no mentions here';
			const mentions = utilClass.extractMentions(text);
			expect(mentions).toEqual([]);
		});
	});
});
