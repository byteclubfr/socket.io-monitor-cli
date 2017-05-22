# socket.io-monitor-cli

CLI client for socket.io-monitor

This dashboard displays real-time information about your running socket.io server:
- events log
- sockets list
- rooms list

## Installation

```sh
npm install -g socket.io-monitor-cli
```

## Usage

First, enable [socket.io-monitor](https://github.com/byteclubfr/socket.io-monitor) in your socket.io server.


```sh
socket.io-monitor [--port port] [--host addr] [--password pwd]

Options:
  --host, -h      Server address                 [string] [default: "localhost"]
  --port, -p      Server port                            [number] [defaut: 9042]
  --password, -a  Password (if not provided but server requires one, you will be
                  interactively asked for one)            [string] [default: ""]
  --help          Display help                                         [boolean]
```

## Development

The terminal rendering is made with [react-blessed](https://github.com/Yomguithereal/react-blessed).

Therefore, using `console.log` in the source will mix your debug output with the rendered app.

So, prefer `console.error` and redirect `stderr`:

```sh
socket.io-monitor 2> debug.log
```

```sh
tail -f debug.log
```

