const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.post('/:boardNo', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let boardNo = req.params.boardNo;
	let deleteBoardAsyncFlow = [
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
			let deleteLikeDML = 'delete from dolike where boardno=:boardno';

			rdsConnection.execute(deleteLikeDML, [boardNo], (deleteLikeDMLError, deleteLikeDMLResult) => {
				if(deleteLikeDMLError) {
					rdsConnection.rollback((dmlRollbackError) => {
						rdsConnection.release();
						if(dmlRollbackError) {
							callback('DML rollback fail : ' + dmlRollbackError);
						} else {
							callback('Delete like fail : ' + deleteLikeDMLError);
						}
					});
				} else {
					callback(null, rdsConnection, memberNo);
				}
			});
		},
		(rdsConnection, memberNo, callback) => {
			let deleteBoardDML = 'delete from board where no=:boardno and memberno=:memberno';

			rdsConnection.execute(deleteBoardDML, [boardNo, memberNo], (deleteBoardDMLError, deleteBoardDMLResult) => {
				if(deleteBoardDMLError) {
					rdsConnection.rollback((dmlRollbackError) => {
						rdsConnection.release();
						if(dmlRollbackError) {
							callback('DML rollback fail : ' + dmlRollbackError);
						} else {
							callback('Delete board fail : ' + deleteBoardDMLError);
						}
					});
				} else if(deleteBoardDMLResult.rowsAffected === 1) {
					rdsConnection.commit((dmlCommitError) => {
						rdsConnection.release();
						if(dmlCommitError) {
							callback('DML commit fail : ' + dmlCommitError);
						} else {
							callback(null, 'Delete board success');

							res.status(201).send({
								stat : 'Success',
								msg : 'Delete board success'
							});
						}
					});
				} else {
					rdsConnection.rollback((dmlRollbackError) => {
						if(dmlRollbackError) {
							callback('DML rollback error : ' + dmlRollbackError);
						} else {
							callback('Delete board fail : not verified user');

							res.status(500).send({
								stat : 'Fail',
								msg : 'Delete board fail : not verified user'
							});
						}
					});
				}
			});
		}
	];

	async.waterfall(deleteBoardAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Delete board fail\n' + asyncError);
		else console.log('Delete board success\n' + asyncResult)
	});
});

module.exports = router;