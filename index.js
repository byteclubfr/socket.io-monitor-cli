'use strict'

const { connect } = require('socket.io-monitor')

module.exports = ({ host = 'localhost', port = 9042, password = '' } = {}) => Promise.resolve()
  .then(() => connect({ host, port, password }))
  .then(onClientConnected)

const onClientConnected = client => {
  client
  .on('init', ({ rooms, sockets }) => {
    console.log('init: sockets', sockets)
    console.log('init: rooms', rooms)
  })
  .on('broadcast', ({ name, args, rooms, flags }) => console.log('broadcast', name, args, rooms, flags))
  .on('join', ({ id, room }) => console.log('join', id, room))
  .on('leave', ({ id, room }) => console.log('leave', id, room))
  .on('leaveAll', ({ id }) => console.log('leaveAll', id))
  .on('connect', ({ id }) => console.log('connect', id))
  .on('disconnect', ({ id }) => console.log('disconnect', id))
  .on('emit', ({ id, name, args }) => console.log('emit', id, name))
  .on('recv', ({ id, name, args }) => console.log('recv', id, name))
}
