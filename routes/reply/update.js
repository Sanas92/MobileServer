const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/:replyNo', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let replyNo = req.params.replyNo;
	let replyContent = req.body.replyContent;
	let updateReplyAsyncFlow = [
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
			let checkReplyMemberDQL = 'select memberno from reply where no=:replyno';

			rdsConnection.execute(checkReplyMemberDQL, [replyNo], {autoCommit : true}, (checkReplyMemberDQLError, checkReplyMemberDQLResult) => {
				if(checkReplyMemberDQLError) {
					callback('Check reply fail : ' + checkReplyMemberDQLError);
				} else if(checkReplyMemberDQLResult.rows[0][0] !== memberNo){
					callback('Not verfied user');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Not verified user'
					});
				} else {
					callback(null, rdsConnection);
				}
			});
		},
		(rdsConnection, callback) => {
			let updateReplyDML = 'update reply set content=:content where no=:replyno';

			rdsConnection.execute(updateReplyDML, [replyContent, replyNo], {autoCommit : true}, (updateReplyDMLError, updateReplyDMLResult) => {
				rdsConnection.release();

				if(updateReplyDMLError) {
					callback('Update reply fail : ' + updateReplyDMLError);
				} else if(updateReplyDMLResult.rowsAffected !== 1) {
					callback('Update reply fail : unexpected error');

					res.status(500).send({
						stat : 'Fail',
						msg : 'Update reply fail : unexpected error'
					});
				} else {
					callback(null, 'Update reply success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Update reply success'
					});
				}
			});
		}
	];

	async.waterfall(updateReplyAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Update reply fail\n' + asyncError);
		else console.log('Update reply success\n' + asyncResult)
	})
});

module.exports = router;