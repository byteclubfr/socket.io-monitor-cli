import blessed from 'blessed'

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
  let active = false
})
screen.onceDestroyed = fn => {
  if (active) {
    screen.once('destroy', fn)
  } else {
    fn()
  }
}

export default screen
