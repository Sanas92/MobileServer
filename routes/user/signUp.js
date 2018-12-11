const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');
const oracledb = require('oracledb');

const awsRDS = require('../../privateModules/aws/rds');
const validity = require('../../privateModules/validity');

router.get('/', (req, res) => {

});

router.post('/', (req, res) => {
	let memberName = req.body.memberName;
	let memberEmail = req.body.memberEmail;
	let memberPassword = req.body.memberPassword;
	let memberPasswordAccept = req.body.memberPasswordAccept;
	let memberAge = req.body.memberAge;
	let memberGender = req.body.memberGender;
	let signUpAsyncFlow = [
		(callback) => {
			if(!validity.check(memberName) || !validity.check(memberEmail) || !validity.check(memberPassword) || !validity.check(memberPasswordAccept)) {
				callback('Validity check fail : not enough input');

				res.status(403).send({
					stat : 'Fail',
					msg : 'Validity check fail : not enough input'
				});
			} else if(memberPassword !== memberPasswordAccept) {
				callback('Validity check fail : password and password-accept is not equal');
			
				res.status(403).send({
					stat : 'Fail',
					msg : 'Validity check fail : password and password-accept is not equal'
				});
			} else {
				callback(null, 'Validity check success');
			}
		},
		(validity, callback) => {
			oracledb.getConnection(awsRDS.setDBConfig, (rdsConnectingError, rdsConnectingResult) => {
				if(rdsConnectingError) {
					callback('RDS connecting fail : ' + rdsConnectingError);
				
					res.status(500).send({
						stat : 'Fail',
						msg : 'RDS connecting fail : ' + rdsConnectingError
					});
				} else {
					callback(null, rdsConnectingResult);
				}
			});
		},
		(rdsConnection, callback) => {
			let checkMemberDuplicationDQL = 'select name, email from member where (name=:name or email=:email)';

			rdsConnection.execute(checkMemberDuplicationDQL, [memberName, memberEmail], {autoCommit : true}, (checkMemberDuplicationDQLError, checkMemberDuplicationDQLResult) => {
				
				if(checkMemberDuplicationDQLError) {
					callback('Check member duplication fail : ' + checkMemberDuplicationDQLError);
				} else if(checkMemberDuplicationDQLResult.rows[0] !== undefined) {
					callback('Check member duplication success : already exist user');

					res.status(400).send({
						stat : 'Fail',
						msg : 'Check member duplication success : already exist user'
					});
				} else{
				 callback(null, rdsConnection);
				}
			});
		},
		(rdsConnection, callback) => {
			crypto.randomBytes(32, (saltingError, saltingResult) => {
				if(saltingError) callback('Salting fail : ' + saltingError);
				else callback(null, rdsConnection, saltingResult.toString('base64'));
			});
		},
		(rdsConnection, salt, callback) => {
			crypto.pbkdf2(memberPassword, salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
				if(hashingError) callback('Hashing fail : ' + hashingError);
				else callback(null, rdsConnection, salt, hashingResult.toString('base64'));
			})
		},
		(rdsConnection, salt, hashedPassword, callback) => {
			let createMemberDML = 'insert into member values (member_seq.nextval, :name, :password, :age, :email, :gender, :authorization, :salt)';
			
			rdsConnection.execute(createMemberDML, [memberName, hashedPassword, memberAge, memberEmail, memberGender, null, salt], {autoCommit : true}, (createMemberDMLError) => {
				rdsConnection.release();

				if(createMemberDMLError) {
					callback('Create member fail : ' + createMemberDMLError);
				} else {
					callback('Sign-up async flow success');
					
					res.status(201).send({
						stat : 'Success',
						msg : 'Sign-up success'
					});
				}
			});
		}
	];

	async.waterfall(signUpAsyncFlow, (asyncError, asyncResult) => {
		if(asyncError) console.log('Sign-up flow error\n' + asyncError);
		else console.log('Sign-up flow success\n' + asyncResult);
	});
});

module.exports = router;