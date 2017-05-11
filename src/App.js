// @flow

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

const logToLine = (type, info) => `${type} ${Object.values(info).toString()}`

const pluralize = (count, label) => `${count} ${label}${count > 1 ? 's' : ''}`

// remove year and zone
const humanize = ms => new Date(ms).toUTCString().slice(5)

type Room = {
  name: string,
  sockets: Array<string>, // only ids
}

type Socket = {
  id: string,
  connectedAt: number,
  label: string,
  rooms: Array<string>, // only names
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

  state: {
    logs: Array<Object>,
    logLines: Array<string>,
    logToggles: Object,
    sockets: Array<Socket>,
    rooms: Array<Room>,
    selected: ?string,
    selectedSocket: ?Socket,
    selectedRoom: ?Room,
    selectedLog: ?Object,
  }

  state = {
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
    selectedLog: null,
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
      .on('emit', ({ id, name, args }) =>
        this.addLog('emit', { id, name, args }),
      )
      .on('recv', ({ id, name, args }) =>
        this.addLog('recv', { id, name, args }),
      )
  }

  watchRooms() {
    this.props.client
      .on('init', ({ rooms }) => this.setState({ rooms }))
      .on('join', ({ id, room }) => {
        const found = this.state.rooms.some(({ name }) => name === room)
        if (!found) {
          // new room
          this.setState(({ rooms }) => ({
            rooms: rooms.concat({ name: room, sockets: [id] }),
          }))
        } else {
          // update room's sockets
          this.setState(({ rooms }) => ({
            rooms: rooms.map(
              r =>
                (r.name === room ? { ...r, sockets: r.sockets.concat(id) } : r),
            ),
          }))
        }
        // update socket
        this.setState(({ sockets }) => ({
          sockets: sockets.map(
            s => (s.id === id ? { ...s, rooms: s.rooms.concat(room) } : s),
          ),
        }))
      })
      .on('leave', ({ id, room }) => {
        const found = this.state.rooms.find(({ name }) => name === room)
        if (!found) return

        const sockets = found.sockets.filter(sid => sid !== id)
        if (sockets.length === 0) {
          // delete room
          this.setState(({ rooms }) => ({
            rooms: rooms.filter(r => r.name !== room),
          }))
        } else {
          // update room's sockets
          this.setState(({ rooms }) => ({
            rooms: rooms.map(r => (r.name === room ? { ...r, sockets } : r)),
          }))
        }
        // update socket
        this.setState(({ sockets }) => ({
          sockets: sockets.map(
            s =>
              (s.id === id
                ? { ...s, rooms: s.rooms.filter(r => r !== room) }
                : s),
          ),
        }))
      })
      .on('leaveAll', ({ id }) => {
        // update rooms
        this.setState(({ rooms }) => ({
          rooms: rooms
            .map(r => {
              const sockets = r.sockets.filter(sid => sid !== id)
              return sockets.length === 0 ? null : { ...r, sockets }
            })
            .filter(r => r !== null),
        }))
        // update socket
        this.setState(({ sockets }) => ({
          sockets: sockets.map(s => (s.id === id ? { ...s, rooms: [] } : s)),
        }))
      })
  }

  watchSockets() {
    this.props.client
      .on('init', ({ sockets, rooms }) => {
        this.setState({
          sockets: sockets.map(s => ({
            ...s,
            label: s.id,
            rooms: rooms.filter(r => r.sockets.includes(s.id)).map(r => r.name),
          })),
        })
      })
      .on('connect', ({ id }) => {
        this.setState(({ sockets }) => ({
          sockets: [
            { id, label: id, connectedAt: Number(new Date()), rooms: [] },
          ].concat(sockets),
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
            s => (s.id === id ? { ...s, label: `${id} (${string})` } : s),
          ),
        }))
      })
  }

  addLog(type: string, info: Object) {
    this.setState(({ logLines, logs }) => ({
      logLines: [logToLine(type, info)].concat(logLines),
      logs: [Object.assign({ type }, info)].concat(logs),
    }))
  }

  getSelectedBox() {
    switch (this.state.selected) {
      case 'socket': {
        const socket = this.state.sockets.find(
          s => s.id === this.state.selectedSocket,
        )
        return !socket ? null : <SocketDetails socket={socket} />
      }

      case 'room': {
        const room = this.state.rooms.find(
          r => r.name === this.state.selectedRoom,
        )
        return !room ? null : <RoomDetails room={room} />
      }

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
          linesCount={this.state.logLines.length}
          onSelect={index =>
            this.setState(state => ({
              selectedLog: getFilteredLogs(state)[index],
            }))}
        />
        <LogDetails content={this.state.selectedLog || {}} />
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
              selectedRoom: rooms[index].name,
            }))}
        />
        {this.getSelectedBox()}
      </element>
    )
  }
}

type MyListProps = {
  items: Array<any>,
  disabled?: boolean,
  prefix?: string,
  onSelect?: Function,
}
const MyList = (props: MyListProps) => {
  const disabled = props.disabled

  const listProps = { ...props }
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
  linesCount: number,
  onSelect: Function,
}
const Logs = ({ lines, linesCount, onSelect }: LogsProps) => (
  <MyList
    label={`Log (${lines.length}/${linesCount})`}
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

const socketToItem = (s: Socket) =>
  `${s.label} ${humanize(s.connectedAt)} (${pluralize(s.rooms.length, 'room')})`

type SocketsProps = {
  sockets: Array<Socket>,
  onSelect: Function,
}
const Sockets = ({ sockets, onSelect }: SocketsProps) => (
  <MyList
    label={`Sockets (${sockets.length})`}
    left="60%"
    width="40%"
    height="35%"
    focused={true}
    items={sockets.map(socketToItem)}
    onSelect={onSelect}
  />
)

const roomToItem = (r: Room) =>
  `${r.name} (${pluralize(r.sockets.length, 'socket')})`

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
    items={rooms.map(roomToItem)}
    onSelect={onSelect}
  />
)

type SocketDetailsProps = {
  socket: Socket,
}
const SocketDetails = ({ socket }: SocketDetailsProps) => {
  const items = [
    `id: ${socket.id}`,
    `label: ${socket.label}`,
    `connectedAt: ${humanize(socket.connectedAt)}`,
    '',
    `${pluralize(socket.rooms.length, 'room')}:`,
    ...socket.rooms,
  ]
  return (
    <MyList
      label="Socket details"
      top="70%"
      left="60%"
      width="40%"
      height="30%"
      items={items}
      disabled
    />
  )
}

type RoomDetailsProps = {
  room: Room,
}
const RoomDetails = ({ room }: RoomDetailsProps) => {
  const items = [
    `name: ${room.name}`,
    '',
    `${pluralize(room.sockets.length, 'socket')}:`,
    ...room.sockets,
  ]
  return (
    <MyList
      label="Room details"
      top="70%"
      left="60%"
      width="40%"
      height="30%"
      items={items}
      disabled
    />
  )
}
