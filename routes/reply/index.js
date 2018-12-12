const express = require('express');
const router = express.Router();

const createRouter = require('./create');
const readRouter = require('./read');
const updateRouter = require('./update');
const deleteRouter = require('./delete');

router.use('/create', createRouter);
router.use('/read', readRouter);
router.use('/update', updateRouter);
router.use('/delete', deleteRouter);

module.exports = router;