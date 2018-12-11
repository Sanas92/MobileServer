const jsonwebtoken = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.json');

module.exports.createJWT = function(memberNo, callbackFunction) {
	let payload = {
		memberNo : memberNo
	};
	let option = {
		algorithm : 'HS512',
		expiresIn : 3600
	};

	jsonwebtoken.sign(payload, jwtConfig.secret, option, (createJWTError, createJWTResult) => {
		if(createJWTError) callbackFunction(createJWTError, null);
		else callbackFunction(null, createJWTResult);
	});
};

module.exports.checkJWT = function(memberJWT, callbackFunction) {
	jsonwebtoken.verify(memberJWT, jwtConfig.secret, (checkJWTError, checkJWTResult) => {
		if(checkJWTError) {
			if(checkJWTError.message === 'jwt expired') callbackFunction('Check JWT fail : ' + checkJWTError.message);
			else if(checkJWTError.message === 'invalid token') callbackFunction('Check JWT fail : ' + checkJWTError.message);
			else callbackFunction('Check JWT fail : unexpected error');
		} else {
			callbackFunction(null, checkJWTResult);
		}
	});
};