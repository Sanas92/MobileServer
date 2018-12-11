module.exports.check = function(memberInfo) {
	if(memberInfo === null || memberInfo === '' || memberInfo === undefined) return false;
	return true;
}