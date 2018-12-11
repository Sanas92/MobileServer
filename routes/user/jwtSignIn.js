const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let jwtSignInAsyncFlow = [
		(callback) => {
			jwt.checkJWT(memberJWT, (checkJWTError, checkJWTResult) => {
				if(checkJWTError) {
					callback('Check JWT error : ' + checkJWTError);

					res.status(400).send({
						stat : 'Fail',
						msg : 'Check JWT error : ' + checkJWTError
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
					callback(null, memberNo, rdsConnectingResult);
				}
			});
		},
		(memberNo, rdsConnection, callback) => {
			let checkMemberStatusDML = 'select status from member where no=:no';

			rdsConnection.execute(checkMemberStatusDML, [memberNo], {autoCommit : true}, (checkMemberStatusDMLError, checkMemberStatusDMLResult) => {
				rdsConnection.release();

				if(checkMemberStatusDMLError) {
					callback('Check member status fail : ' + checkMemberStatusDMLError);
				} else if(checkMemberStatusDMLResult.rows[0][0] === 1){
					callback(null, 'JWT sign-in success');

					res.status(201).send({
						stat : 'Success',
						msg : 'JWT sign-in success'
					});
				} else {
					callback(null, 'Member has sign-out before, please sign-in again');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Member has sign-out before, please sign-in again'
					});
				}
			});
		}
	];

	async.waterfall(jwtSignInAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('JWT sign-in fail\n' + asyncError);
		else console.log('JWT sign-in success\n' + asyncResult);
	});
});

module.exports = router;