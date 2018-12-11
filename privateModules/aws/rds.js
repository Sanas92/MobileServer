const awsRDSConfig = require('../../config/aws/rds.json');

module.exports.setDBConfig = {
	user : process.env.NODE_ORACLEDB_USER || awsRDSConfig.user,
	password : process.env.NODE_ORACLEDB_PASSWORD || awsRDSConfig.password,
	connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || awsRDSConfig.connectString,
	externalAuth : process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false
};