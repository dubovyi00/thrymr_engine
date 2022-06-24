const path = require('path');
const ITMP  = require('./itmpws')
//const jsonParser = express.json();

//const { app, BrowserWindow } = require('electron');
//const isDev = require('electron-is-dev');
const express = require('express')
const expressapp = express()
const jsonParser = express.json()
/* const expressWs = */ require('express-ws')(expressapp, undefined, { wsOptions: { test: '' } })
expressapp.use('/', express.static('./public'))

const hub = require('./itmphub');
//const { copyFile } = require('fs');
const RMDS = require('./devs/rmds');

let port = 3006
var server = expressapp.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`srv listening on address 2'${server.address().address}' and port ${server.address().port}`)
  
})
hub.start(expressapp,server)

//const dev = hub.getConnector('itmp.serial:///dev/ttyUSB0?baudRate=115200~10')
//const dev = hub.getConnector('itmp.serial://COM7?baudRate=115200~10')

// подключение к роботу
const Z = new RMDS(hub, { addr: 'itmp.serial:///dev/ttyUSB0?baudRate=115200~10', prefix: 'Z', mmstep: 0.002510704 }) // линейный привод, координаты в мм
const R = new RMDS(hub, { addr: 'itmp.serial:///dev/ttyUSB0?baudRate=115200~11', prefix: 'R', mmstep: 0.009549297, zeroshift: 0 }) // поворотный привод, координаты в градусах
const X = new RMDS(hub, { addr: 'itmp.serial:///dev/ttyUSB0?baudRate=115200~13', prefix: 'X', mmstep: 0.017629471, zeroshift: 0 }) // поворотный привод выноса, координаты в градусах поворота


// заглушки, использовать при дебаге соединения и передачи команд
//const Z = new RMDS(hub, { addr: 'fake', prefix: 'Z', mmstep: 0.000625 }) // линейный привод, координаты в мм
//const R = new RMDS(hub, { addr: 'fake', prefix: 'R', mmstep: 0.009549297, zeroshift: 0 }) // поворотный привод, координаты в градусах
//const X = new RMDS(hub, { addr: 'fake', prefix: 'X', mmstep: 0.017629471, zeroshift: 0 }) // поворотный привод выноса, координаты в градусах поворота


Z.start();
R.start();
X.start();


let cnt=1;
hub.setValue('cnt', cnt)
setInterval(() => {
  hub.setValue('cnt',cnt++)
}, 20000);

hub.oncall('tset',(arg)=>{
  console.log('!tset',arg)
  return arg+'!'
})

hub.oncall('Zsetvalue', async (arg) => {
  Z.goto(arg)
})

hub.oncall('Rsetvalue', async (arg) => {
  R.goto(arg)
})

hub.oncall('Xsetvalue', async (arg) => {
  X.goto(arg)
})


hub.oncall('Zhome', async (arg) => {
  Z.home(16*500)
})

hub.oncall('Rhome', async (arg) => {
  R.home()
})

hub.oncall('Xhome', async (arg) => {
  X.home()
})

hub.oncall('Zgetvalue', async (arg) => {
  var val = await Z.getval()
  console.log(val)
  return val

})

hub.oncall('Rgetvalue', async (arg) => {
  var val = await R.getval()
  console.log(val)
  return val

})

hub.oncall('Xgetvalue', async (arg) => {
  var val = await X.getval()
  console.log(val)
  return val

})

hub.oncall('Xopened', async (arg) => {
  console.log('opened', arg)
  X.openclose(arg)
  hub.setValue('Xopened',arg)
})

const itmp = new ITMP({uri: "ws://localhost:3006/ws/",token:'supersecret'})
itmp.connect()

const sleep = ms => new Promise(r => setTimeout(r, ms));

//Проверка работы всех двигателей
try {
	itmp.call('Xhome')
	itmp.call('Zhome')
	itmp.call('Rhome')

	itmp.call('Xopened', true);
	
	
	console.log("Robot succesfully connected and ready!");
} catch (e) {
	console.log("Error when starting robot", e.message);
}


expressapp.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, User-Agent");
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    next();
    
});

expressapp.options('*', (req, res) => {
	console.log("OPTIONS req done!");
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, User-Agent");
	res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
	return res;
    });

expressapp.post("/api/home/", jsonParser, async function(req, res){
    //console.log(req)
    console.log("POST home req done!");
    
    if (!req.body) return res.sendStatus(400)
    
    try {
    	await itmp.call(req.body.axis + 'home')
    	
    } catch (e) {
        console.log(e.message)
        return res.sendStatus(500)
    }

    return res.sendStatus(200)
    
    
});

expressapp.post("/api/setvalue/", jsonParser, async function(req, res){
    console.log("POST setvalue req done!");
    if (!req.body) return res.sendStatus(400)
    try {
    	console.log(req.body)
    	if (!req.body.speed) await itmp.call(req.body.axis + 'setvalue', [req.body.coord]) 
    	else await itmp.call(req.body.axis + 'setvalue', [req.body.coord, req.body.speed])
    	
    } catch (e) {
        console.log(e.message)
        return res.sendStatus(500)
    }

    return res.sendStatus(200)
    
    
});

expressapp.post("/api/openclose/", jsonParser, async function(req, res){
    console.log("POST open req done!");
    if (!req.body) return res.sendStatus(400)
    try {
    	//arg = hub.getValue('Xopened');
    	console.log('Xopened', req.body.arg);
    	await itmp.call('Xopened', req.body.arg);
	
    	
    } catch (e) {
        console.log(e.message)
        return res.sendStatus(500)
    }

    return res.sendStatus(200)

    
    
});

expressapp.get("/api/getvalue/:axis", async function(req, res){
    console.log("GET getvalue req done!");
    var values;
    if (!req.params) return res.sendStatus(400)
    try {
      
      values = await itmp.call(req.params.axis + 'getvalue', [])
    	console.log("Responsed value ", values)
    } catch (e) {
        console.log(e.message)
        return res.sendStatus(500)
    }

    return res.status(200).json({'values': values})
    
    
});

expressapp.post("/api/horizontal/", jsonParser, async function(req, res) {
    if (!req.body) return res.sendStatus(400)
    try {
    
    	z_val_arr = await itmp.call('Zgetvalue', []);
    	z_val = z_val_arr[2] * 0.002510704
    	//await itmp.call('Xsetvalue', [18.5])
    	await sleep(500);
    	//var x_arr = [39, 57, 76, 94, 113, 135.5];
    	
    	
    	if (req.body.dir === 'left') {
    		//var z_val = 142;
    		var z_arr = [-12, -16, -19, -13, -2, -2];
    		/* await itmp.call('Xsetvalue', [115, 30]);
    		//z_val -= 64;
    		await itmp.call('Zsetvalue', [z_val - 64, 55]);
    		
    		await sleep(4000);
    		//await z_val -= 10;
    		await itmp.call('Zsetvalue', [z_vals -64 - 10, 55]); */
    		//await itmp.call('Zsetvalue', [-30, 55]);
    		
    		await itmp.call('Xsetvalue', [115, 14]);
    		for (i = 0; i < z_arr.length; i++) {
    			
    			//console.log('z_val', z_val);
    			z_val += z_arr[i];
    			await itmp.call('Zsetvalue', [z_val, 55]);
    			
    			await sleep(2000);
    		} 

    	} else if (req.body.dir === 'right') {
    		//var z_val = 72;
    		var z_arr = [-2, -8, -14, -14, -13, -14];
    		await itmp.call('Xsetvalue', [0, 16]);
    		for (i = 0; i < z_arr.length; i++) {
    			
    			//console.log('z_val', z_val);
    			z_val -= z_arr[i];
    			await itmp.call('Zsetvalue', [z_val, 55]);
    			
    			await sleep(2000);
    		}
    	}
        
        
    } catch (e) {
        return res.sendStatus(500)
    }
    return res.sendStatus(200)
});


