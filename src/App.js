import React, {Component} from 'react'

/**
 * Styles
 */
const styles = {
  bordered: {
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'blue'
      }
    }
  },
  selected: {
    style: {
      bg: 'yellow'
    }
  }
};

/**
 * Top level component.
 */
export default class Dashboard extends Component {
  constructor (props) {
    super(props)
    this.state = {
      logs: [],
      sockets: []
    }
  }
  componentWillMount () {
    this.props.client
    .on('init', ({ rooms, sockets }) => this.log('init', { sockets, rooms }))
    .on('broadcast', ({ name, args, rooms, flags }) => this.log('broadcast', name, args, rooms, flags))
    .on('join', ({ id, room }) => this.log('join', id, room))
    .on('leave', ({ id, room }) => this.log('leave', id, room))
    .on('leaveAll', ({ id }) => this.log('leaveAll', id))
    .on('connect', ({ id }) => this.log('connect', id))
    .on('disconnect', ({ id }) => this.log('disconnect', id))
    .on('emit', ({ id, name, args }) => this.log('emit', id, name))
    .on('recv', ({ id, name, args }) => this.log('recv', id, name))
    // Rooms
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
    // Sockets
    .on('init', ({ sockets }) => this.setState({ sockets }))
    .on('connect', ({ id }) => this.setState({ sockets: [id].concat(this.state.sockets) }))
    .on('disconnect', ({ id }) => this.setState({ sockets: this.state.sockets.filter(sid => sid !== id) }))
  }
  log (content, ...args) {
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
        <Log content={ this.state.logs.join('\n') } />
        <Request />
        <Response />
        <Sockets ids={ this.state.sockets } selected={ this.state.selectedSocket } onSelect={ id => this.setState({ selectedSocket: id }) } />
        <Progress />
        <Rooms socket={ this.state.selectedSocket } rooms={ this.getSelectedRooms() } />
      </element>
    );
  }
}

/**
 * Log component.
 */
class Log extends Component {
  render() {
    return (
      <box label="Log"
           class={styles.bordered}
           width="60%"
           height="70%"
           draggable={true}>
        {this.props.content}
      </box>
    );
  }
}

/**
 * Request component.
 */
class Request extends Component {
  render() {
    return (
      <box label="Request"
           class={styles.bordered}
           top="70%"
           width="30%">
        {0}
      </box>
    );
  }
}

/**
 * Response component.
 */
class Response extends Component {
  render() {
    return <box label="Response"
                class={styles.bordered}
                top="70%"
                left="30%"
                width="30%" />;
  }
}

/**
 * Jobs component.
 */
class Sockets extends Component {
  renderSocket (id) {
    return <text
      clickable={ true }
      onClick={ () => this.props.onSelect(id) }
      key={ id }
      class={ this.props.selected === id ? styles.selected : null }
      >{ id }</text>
  }
  render() {
    return (
      <box label="Sockets"
        class={styles.bordered}
        left="60%"
        width="40%"
        height="60%">
        { this.props.ids.map(id => this.renderSocket(id)) }
      </box>
    )
  }
}

/**
 * Progress component.
 */
class Progress extends Component {
  constructor(props) {
    super(props);

    this.state = {progress: 0, color: 'blue'};

    const interval = setInterval(() => {
      if (this.state.progress >= 100)
        return clearInterval(interval);

      this.setState({progress: this.state.progress + 1});
    }, 50);
  }

  render() {
    const {progress} = this.state,
          label = `Progress - ${progress}%`;

    return <progressbar label={label}
                        onComplete={() => this.setState({color: 'green'})}
                        class={styles.bordered}
                        filled={progress}
                        top="60%"
                        left="60%"
                        width="40%"
                        height="10%"
                        style={{bar: {bg: this.state.color}}} />;
  }
}

/**
 * Stats component.
 */
class Rooms extends Component {
  render() {
    const label = this.props.socket || 'Unselected'
    const content = this.props.socket
      ? this.props.rooms.map(r => <text key={ r }>{ r }</text>)
      : <text>{ '\nSelect a socket to see its rooms' }</text>
    return (
      <box label={ label }
           class={styles.bordered}
           top="70%"
           left="60%"
           width="40%"
           height="31%">{ content }</box>
    );
  }
}
