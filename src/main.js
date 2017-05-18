import React from 'react'
import { render } from 'react-blessed'
import getScreen from './screen'
import App from './App'

export default client =>
  render(<App client={ client } />, getScreen())
