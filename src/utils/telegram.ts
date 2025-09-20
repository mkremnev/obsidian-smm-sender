const replaceAll = function (searchValue: string, replaceValue: string) {
	return this.split(searchValue).join(replaceValue);
};

const markdownV2EscapeList = ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"];

/**
 *
 * @param {String} text
 * @returns {String}
 */
export const escapeMarkdown = (text: string): string =>
	markdownV2EscapeList.reduce((oldText, charToEscape) => {

		return replaceAll.call(oldText, charToEscape, `\\${charToEscape}`);
	}, text);
