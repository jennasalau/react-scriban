#!/usr/bin/env node

const React = require('React');

let ReactSBN = require('./lib/ReactSBN');
let {TestComponent} = require('./lib/TestComponent');

// Grab args
const [,, ...args] = process.argv;

ReactSBN.render(TestComponent, null, './test.scriban-html');