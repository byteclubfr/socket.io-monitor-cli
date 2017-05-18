import blessed from 'blessed'

let _screen

const getScreen = () => {
  if (_screen) return _screen

  // Creating our screen
  const screen = blessed.screen({
    autoPadding: true,
    smartCSR: true,
    title: 'socket.io-monitor',
  })

  // Adding a way to quit the program
  screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    return process.exit(0)
  })

  // Watch for screen destruction, useful for persistent old-school error message
  let active = true
  screen.on('destroy', () => {
    active = false
  })
  screen.onceDestroyed = fn => {
    if (active) {
      screen.once('destroy', fn)
    } else {
      fn()
    }
  }

  _screen = screen

  return screen
}

export default getScreen
