import React, {Component} from 'react'

/**
 * Styles
 */
const styles = {
  bordered: {
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'blue'
      }
    }
  }
};

/**
 * Top level component.
 */
export default class Dashboard extends Component {
  constructor (props) {
    super(props)
    this.state = { logs: [] }
  }
  componentWillMount () {
    this.props.client
    .on('init', ({ rooms, sockets }) => this.log('init', { sockets, rooms }))
    .on('broadcast', ({ name, args, rooms, flags }) => this.log('broadcast', name, args, rooms, flags))
    .on('join', ({ id, room }) => this.log('join', id, room))
    .on('leave', ({ id, room }) => this.log('leave', id, room))
    .on('leaveAll', ({ id }) => this.log('leaveAll', id))
    .on('connect', ({ id }) => this.log('connect', id))
    .on('disconnect', ({ id }) => this.log('disconnect', id))
    .on('emit', ({ id, name, args }) => this.log('emit', id, name))
    .on('recv', ({ id, name, args }) => this.log('recv', id, name))
  }
  log (content, ...args) {
    this.setState({
      logs: [ `${content}: ${JSON.stringify(args)}` ].concat(this.state.logs)
    })
  }
  render() {
    return (
      <element>
        <Log content={ this.state.logs.join('\n') } />
        <Request />
        <Response />
        <Jobs />
        <Progress />
        <Stats />
      </element>
    );
  }
}

/**
 * Log component.
 */
class Log extends Component {
  render() {
    return (
      <box label="Log"
           class={styles.bordered}
           width="60%"
           height="70%"
           draggable={true}>
        {this.props.content}
      </box>
    );
  }
}

/**
 * Request component.
 */
class Request extends Component {
  render() {
    return (
      <box label="Request"
           class={styles.bordered}
           top="70%"
           width="30%">
        {0}
      </box>
    );
  }
}

/**
 * Response component.
 */
class Response extends Component {
  render() {
    return <box label="Response"
                class={styles.bordered}
                top="70%"
                left="30%"
                width="30%" />;
  }
}

/**
 * Jobs component.
 */
class Jobs extends Component {
  render() {
    return <box label="Jobs"
                class={styles.bordered}
                left="60%"
                width="40%"
                height="60%" />;
  }
}

/**
 * Progress component.
 */
class Progress extends Component {
  constructor(props) {
    super(props);

    this.state = {progress: 0, color: 'blue'};

    const interval = setInterval(() => {
      if (this.state.progress >= 100)
        return clearInterval(interval);

      this.setState({progress: this.state.progress + 1});
    }, 50);
  }

  render() {
    const {progress} = this.state,
          label = `Progress - ${progress}%`;

    return <progressbar label={label}
                        onComplete={() => this.setState({color: 'green'})}
                        class={styles.bordered}
                        filled={progress}
                        top="60%"
                        left="60%"
                        width="40%"
                        height="10%"
                        style={{bar: {bg: this.state.color}}} />;
  }
}

/**
 * Stats component.
 */
class Stats extends Component {
  render() {
    return (
      <box label="Stats"
           class={styles.bordered}
           top="70%"
           left="60%"
           width="40%"
           height="31%">
        Some stats
      </box>
    );
  }
}
