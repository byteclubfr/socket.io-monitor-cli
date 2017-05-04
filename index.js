'use strict'

const { default: render } = require('./dist/main')
const { connect } = require('socket.io-monitor')

module.exports = ({ host = 'localhost', port = 9042, password = '' } = {}) => Promise.resolve()
  .then(() => connect({ host, port, password }))
  .then(onClientConnected)

const onClientConnected = client => render(client)
