const nodemailer = require('nodemailer');
const emailAuthConfig = require('../config/emailAuth.json');
const crypto = require('crypto');

module.exports.createTransport = nodemailer.createTransport({
	service : 'Gmail',
	auth : {
		user : emailAuthConfig.gmailId,
		pass : emailAuthConfig.gmailPassword
	}
});

module.exports.setMailOptions = function(receiver, callbackFunction) {
	crypto.randomBytes(10, (saltingError, saltingResult) => {
		if(saltingError) callbackFunction('Create random string fail : ' + saltingError, null, null);
		else callbackFunction(null, {
			from : emailAuthConfig.gmailId,
			to : receiver,
			subject : 'Mobile Server 인증 메일입니다.',
			html : '<h1>인증번호는 다음과 같습니다</h1><br/><br/><div><h3>' + saltingResult.toString('base64') + '</h3></div>'
		}, saltingResult.toString('base64'));
	});
};