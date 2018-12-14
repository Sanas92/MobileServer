const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const validity = require('../../privateModules/validity');
const jwt = require('../../privateModules/jwt');

router.post('/', (req, res) => {
	let memberName = req.body.memberName;
	let memberPassword = req.body.memberPassword;
	let signInAsyncFlow = [
		(callback) => {
			if(!validity.check(memberName) || !validity.check(memberPassword)) {
				callback('Validity check fail : not enough input');
			
				res.status(403).send({
					stat : 'Fail',
					msg : 'Validity check fail : not enough input'
				});
			} else {
				callback(null, 'Validity check success');
			}
		},
		(validity, callback) => {
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
			let checkMemberDQL = 'select no, name, password, salt from member where name=:name';

			rdsConnection.execute(checkMemberDQL, [memberName], (checkMemberDQLError, checkMemberDQLResult) => {
				if(checkMemberDQLError) {
					rdsConnection.rollback((dqlRollbackError) => {
						rdsConnection.release();
						if(dqlRollbackError) {
							callback('DQL rollback fail : ' + dqlRollbackError);
						} else {
							callback('Check member fail : ' + checkMemberDQLError);
						}
					});
				} else if(checkMemberDQLResult.rows[0] === undefined) {
					rdsConnection.rollback((dqlRollbackError) => {
						rdsConnection.release();
						if(dqlRollbackError) {
							callback('DQL rollback fail : ' + dqlRollbackError);
						} else {
							callback('Check member fail : no user');

							res.status(400).send({
								stat : 'Fail',
								msg : 'Check member fail : no user'
							});
						}
					});
				} else {
					let savedMemberData = {
						no : checkMemberDQLResult.rows[0][0],
						name : checkMemberDQLResult.rows[0][1],
						password : checkMemberDQLResult.rows[0][2],
						salt : checkMemberDQLResult.rows[0][3]
					};

					callback(null, savedMemberData, rdsConnection);
				}
			});
		},
		(savedMemberData, rdsConnection, callback) => {
			let updateMemberStatusDML = 'update member set status=:status where name=:name';

			rdsConnection.execute(updateMemberStatusDML, [1, memberName], (updateMemberStatusDMLError, updateMemberStatusDMLResult) => {
				if(updateMemberStatusDMLError) {
					rdsConnection.rollback((dmlRollbackError) => {
						rdsConnection.release();
						if(dmlRollbackError) {
							callback('DML rollback fail : ' + dmlRollbackError);
						} else {
							callback('Update member status fail : ' + updateMemberStatusDMLError);
						}
					});
				} else if(updateMemberStatusDMLResult.rowsAffected !== 1) {
					rdsConnection.rollback((dmlRollbackError) => {
						rdsConnection.release();
						if(dmlRollbackError) {
							callback('DML rollback fail : ' + dmlRollbackError);
						} else {
							callback('Update member status fail : unexpected error');

							res.status(500).send({
								stat : 'Fail',
								msg : 'Update member status fail : unexpected error'
							});
						}
					});
				} else {
					rdsConnection.commit((dmlCommitError) => {
						rdsConnection.release();
						if(dmlCommitError) {
							callback('DML commit fail : ' + dmlCommitError);
						} else {
							callback(null, savedMemberData);
						}
					});
				}
			});
		},
		(savedMemberData, callback) => {
			crypto.pbkdf2(memberPassword, savedMemberData.salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
				if(hashingError) {
					callback('Hashing fail : ' + hashingError);
				} else if(hashingResult.toString('base64') !== savedMemberData.password) {
					callback('Sign-in fail : no user');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Sign-in fail : no user'
					});
				} else {
					callback(null, savedMemberData);
				}
			});
		},
		(savedMemberData, callback) => {
			jwt.createJWT(savedMemberData.no, (createJWTError, createJWTResult) => {
				if(createJWTError) {
					callback('Create JWT error : ' + createJWTError);

					res.status(500).send({
						stat : 'Fail',
						msg : 'Create JWT error : ' + createJWTError
					});
				} else {
					callback(null, 'Sign-in success');

					res.status(201).send({
						stat : 'Success',
						msg : 'Sign-in success',
						token : createJWTResult
					});
				}
			});
		}
	];

	async.waterfall(signInAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Sign-in error\n' + asyncError);
		else console.log('Sign-in success\n' + asyncResult);
	});
});

module.exports = router;