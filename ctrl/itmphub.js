const vm = require('vm')
const itmp = require('itmp');

const itmpsubscriptions = new Map()
const uriregexp = /^(?<schema>[a-z]+)(?:.(?<subschema>[a-z]+))?:(?:\/\/)?(?:(?:(?<login>(?:[a-z0-9-._]|%[0-9A-F]{2})*)(?::(?<pass>(?:[a-z0-9-_]|%[0-9A-F]{2})*))?@)?(?<fullhost>(?<host>(?:[a-z0-9-_~.]|%[0-9A-F]{2})*|\[[0-9a-fA-F:.]{2,}\])(?::(?<port>[0-9]+))?))(?<path>(?:\/?(?:[a-zA-Z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})*)*)(?<query>\?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?(?<fragment>#(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?$/i

class ItmpHub {

  constructor() {
    this.connectors = new Map()
    this.subscriptions = new Map() // subscriptions by variable names
    this.calls = new Map() // cals by names
    this.values = {}
    const that = this
    this.state = new Proxy(this.values, {
      get(target, prop) { return target[prop] },
      set(target, prop, value) {
        let oldvalue = target[prop]
        target[prop] = value
        that.onUpdate(prop, value, oldvalue)
        return true
      }
    })
    vm.createContext(this.state) // Contextify the sandbox.
  }
  
  onUpdate(prop, value, oldvalue) {
    if (this.subscriptions.has(prop)) {
      let subs = this.subscriptions.get(prop)
      subs.forEach((sub) => {
        sub.func(prop, value, oldvalue)
      })
    }
    return true
  }

  subscribe(topic, func) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map())
    }
    let id = '$' + this.subscriptionsid++
    if (this.subscriptions.get(topic).size === 0 && this.onsubscribe) {
      this.onsubscribe(topic)
    }
    this.subscriptions.get(topic).set(id, { func })
    return id
  }
    
  unsubscribe(topic, id) {
    if (!this.subscriptions.has(topic)) {
      return false
    }
    let ret = this.subscriptions.get(topic).delete(id)
    if (this.subscriptions.get(topic).size === 0 && this.onunsubscribe) {
      this.onunsubscribe(topic)
    }
    return ret
  }
  
  setValue(name, value) {
    this.state[name] = value
  }
  
  getValue(name) {
    return this.state[name]
  }
        
        
  oncall(name,func){
    this.calls.set(name,func)
  }

  start(expressapp) {
    const server = itmp.createServer('ws://localhost:1884/ws', {
        expressapp: expressapp,
        role: 'server', // role determine who send first message for login client send first message, server wait for message, node connects without login
        realm: 'test server', // realm describes what is it, it can de user, robot, proxy, .... - main function
        token: 'supersecret',
        uid: 'uid'
      }, (newclient) => {
        this.addReadyConnector(newclient)
      });
  }

  getConnector(url) {
    let parse = url.match(uriregexp)
    if (!parse || !parse.groups)
      return undefined
    
    let connector = this.connectors.get(url)
    console.log(connector)
    if (!connector) {
      connector = this.addConnector(url, { module: parse.groups.schema, url })
    }
    return connector
  }

  addConnector(url, cfg, localModulesDir) {
    let Link
    if (cfg.module) {
      try {
        Link = require(cfg.module)
      } catch (e) {
        if (localModulesDir)
          Link = require(`${localModulesDir}/${cfg.module}`)
        else
          Link = require(`./${cfg.module}`)
      }
    }
    try {
      let lnk = Link.connect(url, cfg)
      this.addReadyConnector(lnk)
      this.connectors.set(url, lnk)
      return lnk
    } catch (e) {
      console.error(e)
    }
  }

  addReadyConnector(lnk) {
    lnk.on(lnk.$login, function (login) {
        console.log('srv login', JSON.stringify(login))
        if (login.token !== 'supersecret') {
          login.block = true
        }
      })
    
    lnk.on(lnk.$connected, function (link) { console.log('srv connected') })
       
    lnk.on(lnk.$disconnected, function (link) { console.log('srv disconnect') })

    lnk.on(lnk.$subscribe, (topic, opts) => {
      console.log('subscribe', 'for', topic)
      if (itmpsubscriptions.has(`${topic}@${lnk.url}`)) {
        console.error('panic! double subs for ', topic, lnk.url)
      }
      let subsid = this.subscribe(topic, (loctopic, value) => {
        lnk.sendEvent(topic, value)
      })
      if (!subsid) {
        console.error('subscribe error', topic)
        throw (new Error('subscribe error'))
      } else {
        itmpsubscriptions.set(`${topic}@${lnk.url}`, subsid)

        let v = this.getValue(topic)
        if (v !== undefined && v !== null && typeof v !== 'function')
          setImmediate(() => {
            lnk.sendEvent(topic, v)
            console.log('sent', ' ', topic, ':', v)
          })
      }
    })

    lnk.on(lnk.$unsubscribe, (topic) => {
      console.log('unsubscribe', lnk.url, 'for', topic)
      itmpsubscriptions.delete(`${topic}@${lnk.url}`)
    })
    
    if (lnk.setGeneralCall)
      lnk.setGeneralCall(async (uri, args, opts) => {
        console.log('call',uri, args, opts)
        if (!this.calls.has(uri)) {// calls by names
            console.log('no such uri',uri)
            throw new Error('no such uri');
        }
        let result = this.calls.get(uri)(args, opts)
        return result
      })

    lnk.on(lnk.$message, (link, url, val) => {
      console.log('event', url, JSON.stringify(val))
      this.updateValue(url, val)
    })

    return lnk
  }
}

module.exports = new ItmpHub()
