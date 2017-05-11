import { createSelector } from 'reselect'

export const getFilteredLogs = createSelector(
  [
    state => state.logs,
    state => state.logToggles,
    state => state.selected,
    state => state.selectedSocket,
    state => state.selectedRoom,
  ],
  (logs, logToggles, selected, socket, room) =>
    logs.filter(log => logToggles[log.type]).filter(log => {
      switch (selected) {
        case 'socket':
          return log.id === socket
        case 'room':
          return log.room === room || (log.rooms && log.rooms.includes(room))
        default:
          return true
      }
    }),
)
