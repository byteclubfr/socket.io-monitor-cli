import React from 'react'
import { render } from 'react-blessed'
import screen from './screen'
import App from './App'

export default client =>
  render(<App client={ client } />, screen)
