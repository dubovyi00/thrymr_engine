

const dt = 0.05
class RMDS {
  constructor(hub, cfg) {
    this.cfg = Object.assign({
      prefix: '',
      mmstep: 1,
      zeroshift:0
    }, cfg)
    this.hub = hub
    if (!this.cfg.addr || this.cfg.addr==='fake'){
      this.dev = null
      this.pos = 0
      this.target = 0
      this.speed = 0
      this.maxspeed = 16*1000
      this.acc = 8*1000
    } else {
      this.dev = hub.getConnector(this.cfg.addr)
    }
    hub.setValue(this.cfg.prefix +'position', 0)
    hub.setValue(this.cfg.prefix + 'opened', 0)
  }

  
  start() {
    if (!this.dev) {
      setInterval(() => {
        if (this.pos != this.target) {
          //console.log(this.pos,this.speed,this.acc,this.target,this.maxspeed)
          this.pos += this.speed * dt
          if (this.target > this.pos ) { // we should move forward
            if (this.speed > 0 && this.speed * this.speed / (2* this.acc) >= this.target - this.pos) {
              //console.log ('fdec',this.speed * this.speed / (2* this.acc),this.target - this.pos)
              if (this.speed <= 3 * this.acc * dt && this.target - this.pos < 3 * this.speed * dt) {
                //console.log ('stop')
                this.pos = this.target
                this.speed = 0
              } else {
                this.speed -= this.acc * dt
              }
            } else {
              //console.log ('facc')
              this.speed += this.acc * dt
            }
          } else { // we should move backward
            if (this.speed < 0 && this.speed * this.speed / (2* this.acc) >= this.pos - this.target) {
              //console.log ('rdec')
              if (-this.speed <= 3 * this.acc * dt && this.target - this.pos > 3 * this.speed * dt) {
                this.pos = this.target
                this.speed = 0
              } else {
                this.speed += this.acc * dt
              }
              this.speed += this.acc * dt
            } else {
              //console.log ('racc')
              this.speed -= this.acc * dt
            }
          }
          if (this.speed > this.maxspeed) this.speed = this.maxspeed
          if (this.speed < -this.maxspeed) this.speed = -this.maxspeed
        }
        let mm = Math.round(this.pos * this.cfg.mmstep)
        this.hub.setValue(this.cfg.prefix + 'position', mm)
      }, 50);
      return
    }
    this.dev.describe('').then((res) => {
      console.log(res)
    }).catch((err) => {
      console.error(this.cfg.addr, err)
    })
    setInterval(() => {
      this.dev.call('to', []).then((res) => {
        console.log(this.cfg.prefix, res)
        if (Array.isArray(res)) {
          
          let mm = Math.round(res[1] * this.cfg.mmstep)
          this.hub.setValue(this.cfg.prefix + 'position', mm)
        }
      }).catch((err) => { 
        //console.error(this.cfg.addr,err) 
      })
    }, 200);
  }

  async goto(pos) {
    let steps = Math.round(pos[0] / this.cfg.mmstep)
    let speed = (!pos[1]) ? 2 * 16 * 500 : Math.round(pos[1] / this.cfg.mmstep) //2 * pos[1] * 500 //pos[1] / this.cfg.mmstep
    console.log(pos)
    if (!this.dev) {
      this.target = steps
    } else {
      console.log('to', this.cfg.prefix, steps, speed)
      
      return this.dev.call('to', [steps, speed, 4 * 16 * 500]).then((ret) => {
        
      }).catch((err) => { 

      })
    }
  }
  
  getval() {
    var val = this.dev.call('to', []).then((res) => {
        console.log(res)
        return res
      }).catch((err) => { 
        return err 
      }) 
      
   return val
  }
  
  async home(arg) {
    console.log('home', arg)
    if (!this.dev) {
      this.target = 0
    } else {
      try {
        let ret = await this.dev.call('home', arg?[arg]:[])
        console.log(ret)
        return ret
      } catch (err) {
        console.error(err)
      }
      return 'err'
    }
  }
  async openclose(arg) {
    console.log('home', arg)
    if (!this.dev) {
      
    } else {
      console.log('srv', arg)
      try {
        let ret = await this.dev.call('srv', arg ? [2200] : [1200])
        console.log(ret)
        return ret
      } catch (err) {
        console.error(err)
      }
      return 'err'
    }
  }
}

module.exports = RMDS
