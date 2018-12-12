const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

router.get('/:boardNo/:replyIndex', (req, res) => {
	let memberJWT = req.headers.memberjwt;
	let boardNo = req.params.boardNo;
	let replyIndex = req.params.replyIndex;
	let readReplysAsyncFlow = [
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
			})
		},
		(rdsConnection, memberNo, callback) => {
			let readReplyDQL = 'select * from (select no, content, memberno from reply where boardno=:boardno order by no) where rownum >= :startIndex and rownum < :endIndex';
			let startIndex = 10 * (replyIndex - 1) + 1;
			let endIndex = startIndex + 10;
			let replyJSONArray = [];

			rdsConnection.execute(readReplyDQL, [boardNo, startIndex, endIndex], {autoCommit : true}, (readReplyDQLError, readReplyDQLResult) => {
				rdsConnection.release();

				if(readReplyDQLError) {
					callback('Read reply fail : ' + readReplyDQLError);
				} else {
					callback(null, 'Read reply success');

					readReplyDQLResult.rows.map((replyData, replyDataIndex) => {
						replyJSONArray[replyDataIndex] = {
							replyNo : replyData[0],
							replyContent : replyData[1],
							replyMemberNo : replyData[2]
						};

						if(replyData[2] === memberNo)
							return replyJSONArray[replyDataIndex].isMyReply = 'Y';
						else return replyJSONArray[replyDataIndex].isMyReply = 'N';
					});
					
					res.status(200).send({
						stat : 'Success',
						msg : 'Read reply success',
						data : replyJSONArray
					});
				}
			});
		}
	];

	async.waterfall(readReplysAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Read apply fail\n' + asyncError);
		else console.log('Read apply success\n' + asyncResult);
	});
});

module.exports = router;