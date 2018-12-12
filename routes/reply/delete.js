const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/:replyNo', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let replyNo = req.params.replyNo;
	let deleteReplyAsyncFlow = [
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
			let checkMemberDQL = 'select memberno from reply where no=:replyno';

			rdsConnection.execute(checkMemberDQL, [replyNo], {autoCommit : true}, (checkMemberDQLError, checkMemberDQLResult) => {
				if(checkMemberDQLError) {
					callback('Check member fail : ' + checkMemberDQLError);
				} else if(checkMemberDQLResult.rows[0][0] !== memberNo) {
					callback('Delete reply fail : not verified user');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Delete reply fail : not verified user'
					});
				} else {
					callback(null, rdsConnection);
				}	
			});
		},
		(rdsConnection, callback) => {
			let deleteReplyDML = 'delete from reply where no=:replyno';

			rdsConnection.execute(deleteReplyDML, [replyNo], {autoCommit : true}, (deleteReplyDMLError, deleteReplyDMLResult) => {
				rdsConnection.release();

				if(deleteReplyDMLError) {
					callback('Delete reply fail : ' + deleteReplyDMLError);
				} else {
					callback(null, 'Delete reply success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Delete reply success'
					});
				}
			});
		}
	];

	async.waterfall(deleteReplyAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Delete reply fail\n' + asyncError);
		else console.log('Delete reply success\n' + asyncResult);
	});
});

module.exports = router;