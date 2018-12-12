const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');
const emailAuth = require('../../privateModules/emailAuth');

router.post('/', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let authorizationAsyncFlow = [
		(callback) => {
			jwt.checkJWT(memberJWT, (checkJWTError, checkJWTResult) => {
				if(checkJWTError) {
					callback('Check JWT fail : ' + checkJWTError);

					res.status(400).send({
						stat : 'Fail',
						msg : 'Check JWT fail : ' + checkJWTError
					});
				} else {
					callback(null, checkJWTResult.memberNo);
				}
			});
		},
		(memberNo, callback) => {
			oracledb.getConnection(awsRDS.setDBConfig, (rdsConnectingError, rdsConnectingResult) => {
				if(rdsConnectingError) {
					callback('RDS connect fail : ' + rdsConnectingError);

					res.status(500).send({
						stat : 'Fail',
						msg : 'RDS connect fail : ' + rdsConnectingError
					});
				} else {
					callback(null, rdsConnectingResult, memberNo);
				}
			});
		},
		(rdsConnection, memberNo, callback) => {
			let checkAuthorizationDQL = 'select email, authorization from member where no=:memberno';

			rdsConnection.execute(checkAuthorizationDQL, [memberNo], {autoCommit : true}, (checkAuthorizationDQLError, checkAuthorizationDQLResult) => {
				rdsConnection.release();

				if(checkAuthorizationDQLError) {
					callback('Check authorization fail : ' + checkAuthorizationDQLError);
				} else if(checkAuthorizationDQLResult.rows[0][1] === 1) {
					callback(null, 'Check authorization success : already authorized');

					res.status(201).send({
						stat : 'Success',
						msg : 'Check authorization success : already authorized'
					});
				} else {
					callback(null, checkAuthorizationDQLResult.rows[0][0]);
				}
			});
		},
		(memberEmail, callback) => {
			emailAuth.setMailOptions(memberEmail, (setMailOptionsError, setMailOptionsResult, authCode) => {
				if(setMailOptionsError) {
					callback('Set mail options fail : ' + setMailOptionsError);
				}else {
					callback(null, setMailOptionsResult, authCode);
				}
			});
		},
		(mailOption, authCode, callback) => {
			emailAuth.createTransport.sendMail(mailOption, (sendMailError) => {
				if(sendMailError) {
					callback('Send mail fail : ' + sendMailError);

					res.status(500).send({
						stat : 'Fail',
						msg : 'Send mail fail : ' + sendMailError
					});
				} else {
					callback(null, 'Send authorization mail success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Send mail success',
						authCode : authCode
					});
				}
			});
		}
	];

	async.waterfall(authorizationAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Authorization fail\n' + asyncError);
		else console.log('Authorization success\n' + asyncResult);
	});
});

module.exports = router;