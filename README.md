# socket.io-monitor-cli

CLI client for socket.io-monitor

## Installation

```sh
npm install -g socket.io-monitor-cli
```

## Usage

First, enable [socket.io-monitor](https://github.com/byteclubfr/socket.io-monitor) in your socket.io server.


```sh
socket.io-monitor [--port port] [--host addr] [--password pwd]

Options:
  --host, -h      Server address     [chaine de caractère] [défaut: "localhost"]
  --port, -p      Server port                            [nombre] [défaut: 9042]
  --password, -a  Password (if not provided but server requires one, you will be
                  interactively asked for one)[chaine de caractère] [défaut: ""]
  --help          Affiche de l'aide                                    [booléen]
```
