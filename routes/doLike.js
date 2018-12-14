const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb  = require('oracledb');

const awsRDS = require('../privateModules/aws/rds');
const jwt = require('../privateModules/jwt');

router.post('/:boardNo', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let boardNo = req.params.boardNo;
	let doLikeAsyncFlow = [
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
						msg : 'RDS connect fail : ' + rdsConnectingResult
					});
				} else {
					callback(null, rdsConnectingResult, memberNo);
				}
			});
		},
		(rdsConnection, memberNo, callback) => {
			let checkLikeDQL = 'select count(*) as "likecount" from dolike where boardno=:boardno and memberno=:memberno';

			rdsConnection.execute(checkLikeDQL, [boardNo, memberNo], (checkLikeDQLError, checkLikeDQLResult) => {
				if(checkLikeDQLError) {
					rdsConnection.rollback((dqlRollbackError) => {
						rdsConnection.release();
						if(dqlRollbackError) {
							callback('DQL rollback fail : ' + dqlRollbackError);
						} else {
							callback('Check like fail : ' + checkLikeDQLError);
						}
					});	
				} else {
					callback(null, rdsConnection, memberNo, checkLikeDQLResult.rows[0][0]);
				}
			});
		},
		(rdsConnection, memberNo, isLike, callback) => {
			if(isLike) {
				let cancleLikeDML = 'delete from dolike where memberno=:memberno and boardno=:boardno';

				rdsConnection.execute(cancleLikeDML, [memberNo, boardNo], (cancleLikeDMLError, cancleLikeDMLResult) => {
					if(cancleLikeDMLError) {
						rdsConnection.rollback((dmlRollbackError) => {
							rdsConnection.release();
							if(dmlRollbackError) {
								callback('DML rollback fail : ' + dmlRollbackError);
							} else {
								callback('Cancle like fail : ' + cancleLikeDMLError);
							}
						});
					} else {
						callback(null, rdsConnection, memberNo, isLike);
					}
				})
			} else {
				let doLikeDML = 'insert into dolike values (dolike_seq.nextval, :memberno, :boardno)';
				
				rdsConnection.execute(doLikeDML, [memberNo, boardNo], (doLikeDMLError, doLikeDMLResult) => {
					if(doLikeDMLError) {
						rdsConnection.rollback((dmlRollbackError) => {
							if(dmlRollbackError) {
								callback('DML rollback fail : ' + dmlRollbackError);
							} else {
								callback('Do like fail : ' + doLikeDMLError);
							}
						});
					} else {
						callback(null, rdsConnection, memberNo, isLike);
					}
				});
			}
		},
		(rdsConnection, memberNo, isLike, callback) => {
			if(isLike) {
				let subBoardLikesDML = 'update board set likes=likes-1 where no=:boardno';

				rdsConnection.execute(subBoardLikesDML, [boardNo], (subBoardLikesDMLError, subBoardLikesDMLResult) => {
					if(subBoardLikesDMLError) {
						rdsConnection.rollback((dmlRollbackError) => {
							rdsConnection.release();
							if(dmlRollbackError) {
								callback('DML rollback fail : ' + dmlRollbackError);
							} else {
								callback('Sub board like fail : ' + subBoardLikesDMLError);
							}
						});
					} else {
						rdsConnection.commit((dmlCommitError) => {
							rdsConnection.release();
							if(dmlCommitError) {
								callback('DML rollback fail : ' + dmlCommitError);
							} else {
								callback(null, 'Undo like success');

								res.status(201).send({
									stat : 'Success',
									msg : 'Undo like success'
								});
							}
						});
					}
				});
			} else {
				let addBoardLikeDML = 'update board set likes=likes+1 where no=:boardno';

				rdsConnection.execute(addBoardLikeDML, [boardNo], (addBoardLikeDMLError, addBoardLikeDMLResult) => {
					if(addBoardLikeDMLError) {
						rdsConnection.rollback((dmlRollbackError) => {
							rdsConnection.release();
							if(dmlRollbackError) {
								callback('DML rollback fail : ' + dmlRollbackError);
							} else {
								callback('Add board like fail : ' + addBoardLikeDMLError);
							}
						});
					} else {
						rdsConnection.commit((dmlCommitError) => {
							rdsConnection.release();
							if(dmlCommitError) {
								callback('DML commit fail : ' + dmlCommitError);
							} else {
								callback(null, 'Do like success');

								res.status(201).send({
									stat : 'Success',
									msg : 'Do like success'
								});
							}
						});
					}
				});
			}
		}
	];

	async.waterfall(doLikeAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Do like fail\n' + asyncError);
		else console.log('Do like success\n' + asyncResult);
	})
});

module.exports = router;