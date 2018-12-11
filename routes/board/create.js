const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');
const validity = require('../../privateModules/validity');

router.post('/', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let boardTitle = req.body.boardTitle;
	let boardContent = req.body.boardContent;
	let boardPicture = req.body.boardPicture;
	let createBoardAsyncFlow = [
		(callback) => {
			if(!validity.check(boardTitle) || !validity.check(boardContent)) {
				callback('Validity check fail : not enough input');

				res.status(500).send({
					stat : 'Fail',
					msg : 'Validity check fail : not enough input'
				});
			} else {
				callback(null, 'Validity check success');
			}
		},
		(validity, callback) => {
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
			let createBoardDML = 'insert into board values (board_seq.nextval, :title, :content, 0, 0, :memberno, :picture)';

			rdsConnection.execute(createBoardDML, [boardTitle, boardContent, memberNo, boardPicture], {autoCommit : true}, (createBoardDMLError) => {
				rdsConnection.release();

				if(createBoardDMLError) {
					callback('Create board fail : ' + createBoardDMLError);
				} else {
					callback(null, 'Create board success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Create board success'
					});
				}
			});
		}
	];

	async.waterfall(createBoardAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Create board fail\n' + asyncError);
		else console.log('Create board success\n' + asyncResult);
	});
});

module.exports = router;