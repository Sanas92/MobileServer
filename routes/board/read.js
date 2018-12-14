const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');

router.get('/:boardNo', (req, res) => {
	let boardNo = req.params.boardNo;
	let readBoardAsyncFlow = [
		(callback) => {
			oracledb.getConnection(awsRDS.setDBConfig, (rdsConnectingError, rdsConnectingResult) => {
				if(rdsConnectingError) {
					callback('RDS connect fail : ' + rdsConnectingError);

					res.status(500).send({
						stat : 'Fail',
						msg : 'RDS connect fail : ' + rdsConnectingError
					});
				} else {
					callback(null, rdsConnectingResult);
				}
			});
		},
		(rdsConnection, callback) => {
			let addBoardHitsDML = 'update board set hits=hits+1 where no=:no';

			rdsConnection.execute(addBoardHitsDML, [boardNo], (addBoardHitsDMLError, addBoardHitsDMLResult) => {
				if(addBoardHitsDMLError) {
					rdsConnection.rollback((dmlRollbackError) => {
						rdsConnection.release();
						if(dmlRollbackError) {
							callback('DML rollback fail : ' + dmlRollbackError);
						} else {
							callback('Add board hits fail : ' + addBoardHitsDMLError);
						}
					});
				} else {
					callback(null, rdsConnection);
				}
			});
		},
		(rdsConnection, callback) => {
			let readBoardDQL = 'select * from board where no=:no';

			rdsConnection.execute(readBoardDQL, [boardNo], (readBoardDQLError, readBoardDQLResult) => {
				if(readBoardDQLError) {
					rdsConnection.rollback((dqlRollbackError) => {
						rdsConnection.release();
						if(dqlRollbackError) {
							callback('DQL rollback fail : ' + dqlRollbackError);
						} else {
							callback('Read board fail : ' + readBoardDQLError);
						}
					});
				} else {
					rdsConnection.commit((dqlCommitError) => {
						if(dqlCommitError) {
							callback('DQL commit fail : ' + dqlCommitError);
						} else if(readBoardDQLResult.rows[0] === undefined) {
							callback(null, 'Read board fail : no data');

							res.status(500).send({
								stat : 'Fail',
								msg : 'no data'
							});
						} else {
							callback(null, 'Read board success');

							res.status(200).send({
								stat : 'Success',
								msg : 'Read board success',
								data : {
									boardNo : readBoardDQLResult.rows[0][0],
									boardTitle : readBoardDQLResult.rows[0][1],
									boardContent : readBoardDQLResult.rows[0][2],
									boardHits : readBoardDQLResult.rows[0][3],
									boardLikes : readBoardDQLResult.rows[0][4],
									boardMemberNo : readBoardDQLResult.rows[0][5],
									boardPicture : readBoardDQLResult.rows[0][6]
								}
							});
						}
					});
				}
			});			
		}
	];

	async.waterfall(readBoardAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Read board fail\n' + asyncError);
		else console.log('Read board success\n' + asyncResult);
	});
});

module.exports = router;