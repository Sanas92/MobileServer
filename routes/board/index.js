const express = require('express');
const router = express.Router();
const async = require('async');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const jwt = require('../../privateModules/jwt');

const createRouter = require('./create');
const readRouter = require('./read');
const updateRouter = require('./update');
const deleteRouter = require('./delete');

router.use('/create', createRouter);
router.use('/read', readRouter);
router.use('/update', updateRouter);
router.use('/delete', deleteRouter);

router.get('/:page', (req, res) => {
	let boardPage = req.params.page;
	let memberJWT = req.headers.memberjwt;
	let readBoardPageAsyncFlow = [
		(callback) => {
			jwt.checkJWT(memberJWT, (checkJWTError, checkJWTResult) => {
				if(checkJWTError) {
					callback('Check JWT fail : ' + checkJWTError);

					res.status(400).send({
						stat : 'Fail',
						msg : 'Check JWT fail'
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
			let readBoardPageDQL = 'select * from (select no, title, hits, likes, memberno from board order by no desc) where rownum >= :startRownum and rownum < :endRownum';
			let startRownum = 10 * (boardPage - 1) + 1;
			let endRownum = startRownum + 10;

			rdsConnection.execute(readBoardPageDQL, [startRownum, endRownum], {autoCommit : true}, (readBoardPageDQLError, readBoardPageDQLResult) => {
				if(readBoardPageDQLError) {
					callback('Read board page fail : ' + readBoardPageDQLError);
				} else {
					callback(null, rdsConnection, memberNo, readBoardPageDQLResult.rows);
				}
			});
		},
		(rdsConnection, memberNo, boardPageData, callback) => {
			let checkBoardLikeDQL = 'select boardno from dolike where memberno=:memberno';

			rdsConnection.execute(checkBoardLikeDQL, [memberNo], {autoCommit : true}, (checkBoardLikeDQLError, checkBoardLikeDQLResult) => {
				rdsConnection.release();

				if(checkBoardLikeDQLError) {
					callback('Check board like fail : ' + checkBoardLikeDQLError);
				} else {
					callback(null, memberNo, boardPageData, checkBoardLikeDQLResult.rows);
				}
			});
		},
		(memberNo, boardPageData, boardLikeList, callback) => {
			let boardPageList = [];

			if(boardLikeList.length === 0) {
				boardPageData.map((boardData) => {
					return boardPageList.push({
						boardNo : boardData[0],
						boardTitle : boardData[1],
						boardHits : boardData[2],
						boardLikes : boardData[3],
						boardWriter : boardData[4],
						memberLike : 'N'
					});
				});

				callback(null, 'Read board page success');

				res.status(200).send({
					stat : 'Success',
					msg : 'Read board page success',
					data : boardPageList
				});
			} else {
			/* 이 부분 수정예정 */
				boardPageData.map((boardData, boardDataIndex) => {
					boardPageList[boardDataIndex] = {
						boardNo : boardData[0],
						boardTitle : boardData[1],
						boardHits : boardData[2],
						boardLikes : boardData[3],
						boardWriter : boardData[4]
					}

					boardLikeList.map((likeList, likeListIndex) => {
						if(boardData[0] === likeList[0])
							return boardPageList[boardDataIndex].memberLike = 'Y';
						if(likeListIndex === boardLikeList.length - 1 && boardPageList[boardDataIndex].memberLike !== 'Y')
							return boardPageList[boardDataIndex].memberLike = 'N';
					});
				});

				callback(null, 'Read board page success');

				res.status(200).send({
					stat : 'Success',
					msg : 'Read board page success',
					data : boardPageList
				});
			}
		}
	];

	async.waterfall(readBoardPageAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Read board page fail\n' + asyncError);
		else console.log('Read board page success\n' + asyncResult);
	})
});

module.exports = router;