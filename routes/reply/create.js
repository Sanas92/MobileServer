const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/:boardNo', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let boardNo = req.params.boardNo;
	let replyContent = req.body.replyContent;
	let createReplyAsyncFlow = [
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
			let createReplyDML = 'insert into reply values (reply_seq.nextval, :replycontent, :boardno, :memberno)';

			rdsConnection.execute(createReplyDML, [replyContent, boardNo, memberNo], {autoCommit : true}, (createReplyDMLError, createReplyDMLResult) => {
				rdsConnection.release();

				if(createReplyDMLError) {
					callback('Create reply fail : ' + createReplyDMLError);
				} else {
					callback(null, 'Create reply success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Create reply success'
					});
				}
			});
		}
	];

	async.waterfall(createReplyAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Create reply fail\n' + asyncError);
		else console.log('Create reply success\n' + asyncResult);
	});
});

module.exports = router;