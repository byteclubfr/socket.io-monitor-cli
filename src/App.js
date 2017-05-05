import React, {Component} from 'react'

/**
 * Styles
 */
const styles = {
  bordered: {
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'blue',
      }
    }
  },
  list: {
    item: { fg: 'black' },
    selected: { fg: 'white', bg: 'black' },
  },
};

/**
 * Top level component.
 */
export default class Dashboard extends Component {

  constructor (props) {
    super(props)
    this.state = {
      logs: [],
      sockets: [],
    }
  }

  componentWillMount () {
    this.watchLogs()
    this.watchRooms()
    this.watchSockets()
  }

  watchLogs () {
    this.props.client
    .on('init', ({ rooms, sockets }) => this.addLog('init', { sockets, rooms }))
    .on('broadcast', ({ name, args, rooms, flags }) => this.addLog('broadcast', name, args, rooms, flags))
    .on('join', ({ id, room }) => this.addLog('join', id, room))
    .on('leave', ({ id, room }) => this.addLog('leave', id, room))
    .on('leaveAll', ({ id }) => this.addLog('leaveAll', id))
    .on('connect', ({ id }) => this.addLog('connect', id))
    .on('disconnect', ({ id }) => this.addLog('disconnect', id))
    .on('emit', ({ id, name, args }) => this.addLog('emit', id, name))
    .on('recv', ({ id, name, args }) => this.addLog('recv', id, name))
  }

  watchRooms () {
    this.props.client
    .on('init', ({ rooms }) => this.setState({ rooms }))
    .on('join', ({ id, room }) => {
      const found = this.state.rooms.some(({ name }) => name === room)
      if (!found) {
        this.setState({ rooms: rooms.concat({ name: room, sockets: [ id ] }) })
      } else {
        this.setState({ rooms: rooms.map(r => {
          if (r.name !== room) {
            return r
          }
          return Object.assign({}, r, { sockets: r.sockets.concat(id) })
        }) })
      }
    })
    .on('leave', ({ id, room }) => {
      const found = this.state.rooms.find(({ name }) => name === room)
      if (!found) {
        return
      }
      const newSockets = found.sockets.filter(sid => sid !== id)
      if (newSockets.length === 0) {
        this.setState({ rooms: rooms.filter(r => r.name !== room) })
      } else {
        this.setState({ rooms: rooms.map(r => {
          if (r.name !== room) {
            return r
          }
          return Object.assign({}, r, { sockets: newSockets })
        }) })
      }
    })
    .on('leaveAll', ({ id }) => this.setState({ rooms: this.state.rooms.map(r => {
      const newSockets = r.sockets.filter(sid => sid !== id)
      if (newSocket.length === 0) {
        return null
      }
      return Object.assign({}, r, { sockets: newSockets })
    }).filter(r => r !== null) }))
  }

  watchSockets () {
    this.props.client
    .on('init', ({ sockets }) => {
      this.setState({ sockets: sockets.map(id => ({ id, label: id })) })
    })
    .on('connect', ({ id }) => {
      this.setState({ sockets: [{ id, label: id }].concat(this.state.sockets) })
    })
    .on('disconnect', ({ id }) => {
      this.setState({ sockets: this.state.sockets.filter(s => s.id !== id) })
    })
    .on('string', ({ id, string }) => {
      this.setState({ sockets: this.state.sockets.map(s => s.id === id ? { id, label: `${string} (${id})` } : s) })
    })
  }

  addLog (content, ...args) {
    this.setState({
      logs: [ `${content}: ${JSON.stringify(args)}` ].concat(this.state.logs)
    })
  }

  getSelectedRooms () {
    if (!this.state.selectedSocket) {
      return []
    }
    return this.state.rooms.filter(r => r.sockets.includes(this.state.selectedSocket)).map(r => r.name)
  }

  render() {
    return (
      <element>
        <Logs
          lines={ this.state.logs }
          onSelect={ index => this.setState({ selectedLog: this.state.logs[index] }) }
        />
        <LogDetails
          content={ this.state.selectedLog }
        />
        <Sockets
          sockets={ this.state.sockets }
          onSelect={ index => this.setState({ selectedSocket: this.state.sockets[index].id }) }
        />
        <SocketDetails
          socket={ this.state.sockets.find(s => s.id === this.state.selectedSocket) }
          rooms={ this.getSelectedRooms() }
        />
      </element>
    )
  }

}


const MyList = props => {
  const disabled = props.disabled

  const listProps = Object.assign({}, props)
  delete listProps.disabled
  delete listProps.prefix
  delete listProps.onSelect

  if (props.prefix) {
    listProps.items = props.items.map((s, i) => {
      const prefix = props.prefix === 'desc'
        ? props.items.length - i
        : i + 1
      return `${prefix}. ${s}`
    })
  }

  // Reverse dumb arguments in onSelect
  if (props.onSelect) {
    listProps.onSelect = (box, index) => props.onSelect(index, box)
  }

  // UI
  listProps['class'] = styles.bordered
  if (!disabled) {
    Object.assign(listProps, { style: styles.list, keys: true, mouse: true })
  }

  return <list { ...listProps } />
}


const Logs = ({ lines, onSelect }) => (
  <MyList
    label="Log"
    width="60%"
    height="50%"
    prefix="desc"
    items={ lines }
    onSelect={ onSelect }
  />
)


const LogDetails = ({ content }) => (
  <box
    class={ styles.bordered }
    label="Log details"
    width="60%"
    top="50%"
    height="50%"
    mouse={ true }
    scrollable={ true }>
    { content }
  </box>
)


const Sockets = ({ sockets, onSelect }) => (
  <MyList
    label={`Sockets (${sockets.length})`}
    left="60%"
    width="40%"
    height="75%"
    focused={ true }
    prefix="asc"
    items={ sockets.map(s => s.label) }
    onSelect={ onSelect }
  />
)


const SocketDetails = ({ socket, rooms }) => {
  const label = socket
    ? socket.label === socket.id
      ? socket.id
      : `${socket.label} (${socket.id})`
    : 'Unselected'
  return (
    <MyList
      label={ `Rooms: ${label}` }
      top="75%"
      left="60%"
      width="40%"
      height="25%"
      prefix="asc"
      disabled={ !socket }
      items={ socket ? rooms : [ 'Select a socket to see its rooms' ] }
    />
  )
}
