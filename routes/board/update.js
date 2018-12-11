const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/:boardNo', (req, res) => {
	let boardNo = req.params.boardNo;
	let boardTitle = req.body.boardTitle
	let boardContent = req.body.boardContent;
	let boardPicture = req.body.boardPicture;
	let memberJWT = req.headers.memberjwt;
	let updateBoardAsyncFlow = [
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
			let updateBoardDML = 'update board set title=:title, content=:content, picture=:picture where no=:boardno and memberno=:memberno';

			rdsConnection.execute(updateBoardDML, [boardTitle, boardContent, boardPicture, boardNo, memberNo], {autoCommit : true}, (updateBoardDMLError, updateBoardDMLResult) => {
				rdsConnection.release();
				
				if(updateBoardDMLError) {
					callback('Update board fail : ' + updateBoardDMLError);
				} else if(updateBoardDMLResult.rowsAffected === 1) {
					callback(null, 'Update board success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Update board success'
					});
				} else {
					callback(null, 'Update board fail');

					res.status(500).send({
						stat : 'Fail',
						msg : 'Not verified user'
					});
				}
			});
		}
	];

	async.waterfall(updateBoardAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Update board fail\n' + asyncError);
		else console.log('Update board success\n' + asyncResult);
	});
});

module.exports = router;