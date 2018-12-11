const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/', (req, res) => {
	let memberToken = req.headers.membertoken;
	let signOutAsyncFlow = [
		(callback) => {
			jwt.checkJWT(memberToken, (checkJWTError, checkJWTResult) => {
				if(checkJWTError) callback('Check JWT fail : ' + checkJWTError);
				else callback(null, checkJWTResult.memberNo);
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
			let updateMemberStatusDML = 'update member set status=:status where no=:no';

			rdsConnection.execute(updateMemberStatusDML, [0, memberNo], {autoCommit : true}, (updateMemberStatusDMLError, updateMemberStatusDMLresult) => {
				if(updateMemberStatusDMLError) {
					callback('Update member status fail : ' + updateMemberStatusDMLError);
				} else {
					callback(null, 'Sign-out success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Sign-out success'
					});
				}
			});
		}
	];

	async.waterfall(signOutAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Sign-out fail\n' + asyncError);
		else console.log('Sign-out success\n' + asyncResult);
	});
});

module.exports = router;