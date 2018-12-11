const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const validity = require('../../privateModules/validity');
const jwt = require('../../privateModules/jwt');

router.get('/', (req, res) => {

});

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

			rdsConnection.execute(checkMemberDQL, [memberName], {autoCommit : true}, (checkMemberDQLError, checkMemberDQLResult) => {
				rdsConnection.release();

				if(checkMemberDQLError) {
					callback('Check member fail : ' + checkMemberDQLError);
				} else if(checkMemberDQLResult.rows[0] === undefined) {
					callback('Check member fail : no user');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Check member fail : no user'
					});
				} else {
					let savedMemberData = {
						no : checkMemberDQLResult.rows[0][0],
						name : checkMemberDQLResult.rows[0][1],
						password : checkMemberDQLResult.rows[0][2],
						salt : checkMemberDQLResult.rows[0][3]
					};

					callback(null, savedMemberData);
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
		if(asyncError) console.log('Sign-in flow error\n' + asyncError);
		else console.log('Sign-in flow success\n' + asyncResult);
	});
});

module.exports = router;