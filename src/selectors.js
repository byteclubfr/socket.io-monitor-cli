import { createSelector } from 'reselect'

export const getFilteredLogs = createSelector(
  [state => state.logs, state => state.logToggles],
  (logs, logToggles) => logs.filter(log => logToggles[log.type]),
)

export const getFilteredLogLines = createSelector(
  [state => state.logLines, state => state.logToggles],
  (logLines, logToggles) =>
    logLines.filter(line => {
      const [type] = line.split(' ')
      return logToggles[type]
    }),
)
