import React, { Component } from 'react'
import jsome from 'jsome'

import { getFilteredLogs, getFilteredLogLines } from './selectors'

jsome.colors = {
  attr: ['bold', 'black'],
  quot: 'white',
  punc: 'white',
  brack: 'grey',
  num: 'green',
  bool: 'red',
  str: 'cyan',
  regex: 'blue',
  undef: 'grey',
  null: 'grey',
}

const toLogLine = (type, info) => `${type} ${Object.values(info)}`

type Room = {
  name: string,
  sockets: Array<Object>,
}

/**
 * Styles
 */
const styles = {
  bordered: {
    border: {
      type: 'line',
    },
  },
  list: {
    selected: { inverse: true },
  },
}

/**
 * Top level component.
 */
export default class Dashboard extends Component {
  props: {
    client: {
      on: Function,
    },
  }

  constructor(props) {
    super(props)
    this.state = {
      logs: [], // raw js logs
      logLines: [], // logs stringified on reception
      logToggles: {
        init: true,
        broadcast: true,
        join: true,
        leave: true,
        leaveAll: true,
        connect: true,
        disconnect: true,
        emit: true,
        recv: true,
      },
      sockets: [],
      rooms: [],
      selected: null, // current box on the bottom right
      selectedSocket: null,
      selectedRoom: null,
    }
  }

  componentWillMount() {
    this.watchLogs()
    this.watchRooms()
    this.watchSockets()
  }

  watchLogs() {
    this.props.client
      .on('init', ({ rooms, sockets }) =>
        this.addLog('init', { sockets, rooms }),
      )
      .on('broadcast', ({ name, args, rooms, flags }) =>
        this.addLog('broadcast', { name, args, rooms, flags }),
      )
      .on('join', ({ id, room }) => this.addLog('join', { id, room }))
      .on('leave', ({ id, room }) => this.addLog('leave', { id, room }))
      .on('leaveAll', ({ id }) => this.addLog('leaveAll', { id }))
      .on('connect', ({ id }) => this.addLog('connect', { id }))
      .on('disconnect', ({ id }) => this.addLog('disconnect', { id }))
      .on('emit', ({ id, name }) => this.addLog('emit', { id, name }))
      .on('recv', ({ id, name }) => this.addLog('recv', { id, name }))
  }

  watchRooms() {
    this.props.client
      .on('init', ({ rooms }) => this.setState({ rooms }))
      .on('join', ({ id, room }) => {
        const found = this.state.rooms.some(({ name }) => name === room)
        if (!found) {
          this.setState(({ rooms }) => ({
            rooms: rooms.concat({ name: room, sockets: [id] }),
          }))
        } else {
          this.setState(({ rooms }) => ({
            rooms: rooms.map(r => {
              return r.name !== room
                ? r
                : Object.assign({}, r, { sockets: r.sockets.concat(id) })
            }),
          }))
        }
      })
      .on('leave', ({ id, room }) => {
        const found = this.state.rooms.find(({ name }) => name === room)
        if (!found) {
          return
        }
        const newSockets = found.sockets.filter(sid => sid !== id)
        if (newSockets.length === 0) {
          this.setState(({ rooms }) => ({
            rooms: rooms.filter(r => r.name !== room),
          }))
        } else {
          this.setState(({ rooms }) => ({
            rooms: rooms.map(r => {
              return r.name !== room
                ? r
                : Object.assign({}, r, { sockets: newSockets })
            }),
          }))
        }
      })
      .on('leaveAll', ({ id }) =>
        this.setState(({ rooms }) => ({
          rooms: rooms
            .map(r => {
              const newSockets = r.sockets.filter(sid => sid !== id)
              return newSockets.length === 0
                ? null
                : Object.assign({}, r, { sockets: newSockets })
            })
            .filter(r => r !== null),
        })),
      )
  }

  watchSockets() {
    this.props.client
      .on('init', ({ sockets }) => {
        this.setState({ sockets: sockets.map(id => ({ id, label: id })) })
      })
      .on('connect', ({ id }) => {
        this.setState(({ sockets }) => ({
          sockets: [{ id, label: id }].concat(sockets),
        }))
      })
      .on('disconnect', ({ id }) => {
        this.setState(({ sockets }) => ({
          sockets: sockets.filter(s => s.id !== id),
        }))
      })
      .on('string', ({ id, string }) => {
        this.setState(({ sockets }) => ({
          sockets: sockets.map(
            s => (s.id === id ? { id, label: `${string} (${id})` } : s),
          ),
        }))
      })
  }

  addLog(type, info) {
    this.setState(({ logLines, logs }) => ({
      logLines: [toLogLine(type, info)].concat(logLines),
      logs: [Object.assign({ type }, info)].concat(logs),
    }))
  }

  // socket → rooms
  getSelectedRooms() {
    if (!this.state.selectedSocket) {
      return []
    }
    return this.state.rooms
      .filter(r => r.sockets.includes(this.state.selectedSocket))
      .map(r => r.name)
  }

  getSelectedBox() {
    switch (this.state.selected) {
      case 'socket':
        return (
          <SocketDetails
            socket={this.state.sockets.find(
              s => s.id === this.state.selectedSocket,
            )}
            rooms={this.getSelectedRooms()}
          />
        )

      case 'room':
        return (
          <RoomDetails
            room={this.state.rooms.find(r => r.id === this.state.selectedRoom)}
          />
        )

      default:
        return null
    }
  }

  getToggles() {
    return Object.entries(this.state.logToggles).map(
      ([k, v]) => `${v ? '✔' : ' '} ${k}`,
    )
  }

  render() {
    return (
      <element>
        <LogToggles
          toggles={this.getToggles()}
          onSelect={index => {
            const toggle = Object.keys(this.state.logToggles)[index]
            this.setState(({ logToggles }) => ({
              logToggles: Object.assign({}, logToggles, {
                [toggle]: !logToggles[toggle],
              }),
            }))
          }}
        />
        <Logs
          lines={getFilteredLogLines(this.state)}
          onSelect={index =>
            this.setState(state => ({
              selectedLog: getFilteredLogs(state)[index],
            }))}
        />
        <LogDetails content={this.state.selectedLog} />
        <Sockets
          sockets={this.state.sockets}
          onSelect={index =>
            this.setState(({ sockets }) => ({
              selected: 'socket',
              selectedSocket: sockets[index].id,
            }))}
        />
        <Rooms
          rooms={this.state.rooms}
          onSelect={index =>
            this.setState(({ rooms }) => ({
              selected: 'room',
              selectedRoom: rooms[index].id,
            }))}
        />
        {this.getSelectedBox()}
      </element>
    )
  }
}

type MyListProps = {
  disabled: boolean,
  items: Array<any>,
  prefix: string,
  onSelect: Function,
}
const MyList = (props: MyListProps) => {
  const disabled = props.disabled

  const listProps = Object.assign({}, props)
  delete listProps.disabled
  delete listProps.prefix
  delete listProps.onSelect

  if (props.prefix) {
    listProps.items = props.items.map((s, i) => {
      const prefix = props.prefix === 'desc' ? props.items.length - i : i + 1
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

  return <list {...listProps} />
}

type LogsProps = {
  lines: Array<string>,
  onSelect: Function,
}
const Logs = ({ lines, onSelect }: LogsProps) => (
  <MyList
    label="Log"
    width="50%"
    height="50%"
    left="10%"
    prefix="desc"
    items={lines}
    onSelect={onSelect}
  />
)

type LogTogglesProps = {
  toggles: Array<string>,
  onSelect: Function,
}
const LogToggles = ({ toggles, onSelect }: LogTogglesProps) => (
  <MyList
    label="Log Toggles"
    width="10%"
    height="50%"
    items={toggles}
    onSelect={onSelect}
  />
)

type LogDetailsProps = {
  content: Object,
}
const LogDetails = ({ content }: LogDetailsProps) => (
  <box
    class={styles.bordered}
    label="Log details"
    width="60%"
    top="50%"
    height="50%"
    mouse={true}
    scrollable={true}>
    {content !== undefined ? jsome.getColoredString(content) : ''}
  </box>
)

type SocketsProps = {
  sockets: Array<Object>,
  onSelect: Function,
}
const Sockets = ({ sockets, onSelect }: SocketsProps) => (
  <MyList
    label={`Sockets (${sockets.length})`}
    left="60%"
    width="40%"
    height="35%"
    focused={true}
    prefix="asc"
    items={sockets.map(s => s.label)}
    onSelect={onSelect}
  />
)

type RoomsProps = {
  rooms: Array<Room>,
  onSelect: Function,
}
const Rooms = ({ rooms, onSelect }: RoomsProps) => (
  <MyList
    label={`Rooms (${rooms.length})`}
    top="35%"
    left="60%"
    width="40%"
    height="35%"
    prefix="asc"
    items={rooms.map(r => `${r.name} (${r.sockets.length})`)}
    onSelect={onSelect}
  />
)

type SocketDetailsProps = {
  socket: Object,
  rooms: Array<Room>,
}
const SocketDetails = ({ socket, rooms }: SocketDetailsProps) => {
  const label = socket
    ? socket.label === socket.id ? socket.id : `${socket.label} (${socket.id})`
    : 'Unselected'
  return (
    <MyList
      label={`Socket details: ${label}`}
      top="70%"
      left="60%"
      width="40%"
      height="30%"
      prefix="asc"
      items={socket ? rooms : ['Select a socket to see its rooms']}
    />
  )
}

type RoomDetailsProps = {
  room: Room,
}
const RoomDetails = ({ room }: RoomDetailsProps) => (
  <MyList
    label={`Rooms details: ${room.name}`}
    top="70%"
    left="60%"
    width="40%"
    height="30%"
    prefix="asc"
    items={room.sockets}
  />
)
