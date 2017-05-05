#!/usr/bin/env node

'use strict'

const { prompt } = require('inquirer')
const run = require('../')
const screen = require('../dist/screen').default


const { port, host, password } = require('yargs')
  .usage('$0 [--port port] [--host addr] [--password pwd]')
  .option('host', {
    alias: 'h',
    type: 'string',
    default: 'localhost',
    description: 'Server address'
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    default: 9042,
    description: 'Server port'
  })
  .option('password', {
    alias: 'a',
    type: 'string',
    default: '',
    description: 'Password (if not provided but server requires one, you will be interactively asked for one)'
  })
  .help()
  .argv

run({ port, host, password })
.catch(err => {
  if (err.message === 'PASSWORD_REQUIRED') {
    return prompt({ type: 'password', message: 'Password required', name: 'password' })
    .then(({ password }) => run({ port, host, password }))
  } else {
    throw err
  }
})
.catch(err => {
  screen.onceDestroyed(() => {
    console.error(process.env.DEBUG ? err.stack : err.message)
    process.exit(1)
  })
  screen.destroy()
})
