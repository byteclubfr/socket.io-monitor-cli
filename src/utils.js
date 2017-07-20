// @flow

export const pluralize = (count: number, label: string) => `${count} ${label}${count > 1 ? 's' : ''}`

// remove year and zone
export const humanize = (ms: number) => new Date(ms).toUTCString().slice(5)

// for <List /> prefixes
export const leftPad = (index: string, total: number) =>
  Array(total - index.length).fill('0').join('') + index

export const partial = (fn: Function, ...args1) => (...args2) => fn(...args1, ...args2)

