module.exports.check = function(data) {
	if(data === null || data === '' || data === undefined) return false;
	return true;
}