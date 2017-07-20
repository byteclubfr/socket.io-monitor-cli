// @flow

import React, { Component } from 'react'
import jsome from 'jsome'

import { getFilteredLogs } from './selectors'
import { pluralize, humanize, leftPad, partial } from './utils'

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

const logToLine = (type, info) =>
  `${type} ${Object.values(info).toString().replace(/,\[object Object\]/g, '')}`

type Log = {
  type: string,
  line: string,
  info: Object,
}

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
    logs: Array<Log>,
    logToggles: Object,
    sockets: Array<Socket>,
    rooms: Array<Room>,
    selected: ?('room' | 'socket'),
    selectedSocket: ?string, // id
    selectedRoom: ?string, // name
    selectedLog: ?Log,
  }

  state = {
    logs: [], // raw js logs
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
      .on('join', ({ id, rooms }) => this.addLog('join', { id, rooms }))
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
      .on('join', ({ id, rooms }) => {
        // add socket in existing rooms
        const updatedRooms = this.state.rooms.map(
          r =>
            rooms.includes(r.name)
              ? { ...r, sockets: r.sockets.concat(id) }
              : r,
        )
        const newRooms = rooms
          .filter(name => !updatedRooms.find(r => r.name === name))
          .map(name => ({ name, sockets: [id] }))

        this.setState({
          rooms: updatedRooms.concat(newRooms),
        })

        // update socket
        this.setState(({ sockets }) => ({
          sockets: sockets.map(
            s => (s.id === id ? { ...s, rooms: s.rooms.concat(rooms) } : s),
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
              s.id === id
                ? { ...s, rooms: s.rooms.filter(r => r !== room) }
                : s,
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
    this.setState(({ logs }) => ({
      logs: [Object.assign({ type, line: logToLine(type, info) }, info)].concat(
        logs,
      ),
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

  toggleSocket = (index: number) => {
    this.setState(({ sockets, selected }) => ({
      selected: selected === 'socket' ? null : 'socket',
      selectedSocket: selected === 'socket' ? null : sockets[index].id,
      selectedRoom: null,
    }))
  }

  toggleRoom = (index: number) => {
    this.setState(({ rooms, selected }) => ({
      selected: selected === 'room' ? null : 'room',
      selectedRoom: selected === 'room' ? null : rooms[index].name,
      selectedSocket: null,
    }))
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
          logs={getFilteredLogs(this.state)}
          logsCount={this.state.logs.length}
          filteredBy={this.state.selected}
          onSelect={index =>
            this.setState(state => ({
              selectedLog: getFilteredLogs(state)[index],
            }))}
        />
        <LogDetails content={this.state.selectedLog || {}} />
        <Sockets
          sockets={this.state.sockets}
          selected={this.state.selectedSocket}
          onSelect={this.toggleSocket}
        />
        <Rooms
          rooms={this.state.rooms}
          selected={this.state.selectedRoom}
          onSelect={this.toggleRoom}
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
  const { disabled } = props

  const listProps = { ...props }
  delete listProps.disabled
  delete listProps.prefix
  delete listProps.onSelect

  if (props.prefix) {
    listProps.items = props.items.map((s, i) => {
      let prefix = props.prefix === 'desc' ? props.items.length - i : i + 1
      prefix = leftPad(String(prefix), String(props.items.length).length)
      return `${prefix}. ${s}`
    })
  }

  // Reverse dumb arguments in onSelect
  const { onSelect } = props
  if (onSelect) {
    listProps.onSelect = (box, index) => onSelect(index, box)
  }

  // UI
  listProps['class'] = styles.bordered
  if (!disabled) {
    Object.assign(listProps, { style: styles.list, keys: true, mouse: true })
  }

  return <list {...listProps} />
}

type LogsProps = {
  filteredBy: ?('room' | 'socket'),
  logs: Array<Object>,
  logsCount: number,
  onSelect: Function,
}
const Logs = ({ filteredBy, logs, logsCount, onSelect }: LogsProps) =>
  <MyList
    label={`Logs (${logs.length}/${logsCount})${filteredBy
      ? ' filtered by ' + filteredBy
      : ''}`}
    width="50%"
    height="50%"
    left="10%"
    prefix="desc"
    items={logs.map(l => l.line)}
    onSelect={onSelect}
  />

type LogTogglesProps = {
  toggles: Array<string>,
  onSelect: Function,
}
const LogToggles = ({ toggles, onSelect }: LogTogglesProps) =>
  <MyList
    label="Log Toggles"
    width="10%"
    height="50%"
    items={toggles}
    onSelect={onSelect}
  />

type LogDetailsProps = {
  content: Object,
}
const LogDetails = ({ content }: LogDetailsProps) => {
  const json = { ...content }
  delete json.line

  return (
    <box
      class={styles.bordered}
      label="Log details"
      width="60%"
      top="50%"
      height="50%"
      mouse={true}
      scrollable={true}>
      {jsome.getColoredString(json)}
    </box>
  )
}

const socketToItem = (selected: ?string, s: Socket) => {
  const check = selected === s.id ? '✔' : ' '
  const rooms = pluralize(s.rooms.length, 'room')
  return `${check} ${s.label} ${humanize(s.connectedAt)} (${rooms})`
}

type SocketsProps = {
  sockets: Array<Socket>,
  selected: ?string,
  onSelect: Function,
}
const Sockets = ({ sockets, selected, onSelect }: SocketsProps) =>
  <MyList
    label={`Sockets (${sockets.length})`}
    left="60%"
    width="40%"
    height="35%"
    focused={true}
    items={sockets.map(partial(socketToItem, selected))}
    onSelect={onSelect}
  />

const roomToItem = (selected: ?string, r: Room) => {
  const check = selected === r.name ? '✔' : ' '
  const sockets = pluralize(r.sockets.length, 'socket')
  return `${check} ${r.name} (${sockets})`
}

type RoomsProps = {
  rooms: Array<Room>,
  selected: ?string,
  onSelect: Function,
}
const Rooms = ({ rooms, selected, onSelect }: RoomsProps) =>
  <MyList
    label={`Rooms (${rooms.length})`}
    top="35%"
    left="60%"
    width="40%"
    height="35%"
    items={rooms.map(partial(roomToItem, selected))}
    onSelect={onSelect}
  />

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
