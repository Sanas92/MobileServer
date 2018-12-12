const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/', (req, res) => {
	let authCode = req.body.authCode;
	let authCodeCheck = req.body.authCodeCheck;
	let memberJWT = req.headers.memberjwt;
	let authorizationCheckAsyncFlow = [
		(callback) => {
			jwt.checkJWT(memberJWT, (checkJWTError, checkJWTResult) => {
				if(checkJWTError) {
					callback('Check JWT fail : ' + checkJWTError);
				
					res.status(400).send({
						stat : 'Fail',
						msg : 'Check JWT fail : ' + checkJWTError
					});
				} else if(authCode !== authCodeCheck) {
					callback('Authorization check fail : auth code is not equal');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Authorization check fail : auth code is not equal'
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
		(rdsConnection, memberNo, callback) =>{
			let updateAuthorizationDML = 'update member set authorization=1 where no=:memberno';

			rdsConnection.execute(updateAuthorizationDML, [memberNo], {autoCommit : true}, (updateAuthorizationDMLError, updateAuthorizationDMLResult) => {
				rdsConnection.release();

				if(updateAuthorizationDMLError) {
					callback('Authorization check fail : ' + updateAuthorizationDMLError);
				} else if(updateAuthorizationDMLResult.rowsAffected !== 1) {
					callback('Authorization check fail : unexpected error');

					res.status(500).send({
						stat : 'Fail',
						msg : 'Authorization check fail : unexpected error'
					});
				} else {
					callback(null, 'Authorization check success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Authorization check success'
					});
				}
			});
		}
	];

	async.waterfall(authorizationCheckAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Authorization check fail\n' + asyncError);
		else console.log('Authorization check success\n' + asyncResult)
	})
});



module.exports = router;