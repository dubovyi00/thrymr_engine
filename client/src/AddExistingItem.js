import React from 'react';
import ReactDOM from "react-dom";
import './App.css';
import { CookiesProvider } from 'react-cookie';
import {Header, Footer} from './Template';
import { isExpired, decodeToken } from "react-jwt";

class AddExistingItem extends React.Component {
  constructor() {
  	super();
  	this.state = {
  	    name: "",
  	    manufacter: "",
  	    category: "",
  	    packs: [],
  	    categories: [], 
  	    error: 0, //0 - без ошибок, 1 - ошибка при получении списка категорий, 2 - ошибка при добавлении в БД
  	    robotStart: false,
  	    robotIsPuttingItem: false,
  	    storageWillBeFull: false,
  	    idPackPutting: 0,
  	    thatsAll: false,
  	    id_cat: 0,
  	    id_item: 0
  	};
  }
  
  componentDidMount() {
  	fetch("http://localhost:5000/api/v1/users/authorize/add_existing_item", {
  		method: 'GET',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  			'Authorization': 'Bearer '+localStorage.getItem('token')
  		},
  		credentials: "include"
  	})
  	.then(response => {
  		if (response.status === 200) {
  			const myDecodedToken = decodeToken(localStorage.getItem('token'));
  			return this.setState(() => {
  				return { 
  					username: myDecodedToken.login, 
  					admin: myDecodedToken.admin
  				};
  			});
  			// обработка и чтение данных из токена
  		} else if (response.status >= 400) {
  			// переход на страницу аутентификации
  			window.location.assign("/sign_in");
  		} 
  		
  		return response.json();
  	})
  
  
  	var url_parsed = window.location.toString().split('/');
  	console.log(url_parsed);
  	fetch("http://localhost:5000/api/v1/items/"+url_parsed[4], {
  		'Accept': 'application/json'
  	})
  	.then(response => {
  		if (response.status >= 400) {
  			return this.setState(() => {
  				return { error: 1 };
  			});
  		}
  		
  		return response.json();
  	})
  	.then(data => {
  		
  		this.setState(() => {
  			return {
  				name: data.name,
  				manufacter: data.manufacter,
  				category: data.category_name,
  				id_cat: data.id_cat,
  				id_item: data.id_item,
  				packs: [{id_item: data.id_item, count: 0, measure: "", package: ""}]
  			};
  		});
  	})
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 1 };
  		});
  	});
  	
  	
  }
  
  addPack() {
  	var packs = this.state.packs;
  	packs.push({id_item: this.state.id_item, count: 0, measure: "", package: ""});
  	this.setState(() => {
  		return { packs: packs };
  	});
  }
  
  addSamePack(i) {
  	var packs = this.state.packs;
  	var new_pack = {
  		id_item: this.state.id_item,
  		count: packs[i].count, 
  		measure: packs[i].measure, 
  		package: packs[i].package
  	};
  	packs.push(new_pack)
  	this.setState(() => {
  		return { packs };
  	});
  }
  
  deletePack(i) {
  	console.log(i);
  	var old_packs = this.state.packs;
  	var packs = [];
  	old_packs.forEach((val, ind) => {
  		if (ind !== i) {
  			packs.push(val);
  		} 
  	});
  	this.setState(() => {
  		return { packs: packs };
  	});
  }
  
  startRobotProcess() {
  	fetch("http://localhost:5000/api/v1/storage/free_space/" + this.state.packs.length, {
  		'Accept': 'application/json'
  	})
  	.then(response => {
  		if (response.status >= 400) {
  			return this.setState(() => {
  				return { error: 1 };
  			});
  		}
  		
  		return response.json();
  	})
  	.then(data => {
  		var packs = this.state.packs;
  		var storageWillBeFull = false;
  		
  		packs.forEach((val, ind) => {
  			packs[ind].id_rack = data.racks[ind].id_rack;
  		});
  		
  		data.racks.forEach((val, ind) => {
  			if (val.id_rack === -1) {
  				storageWillBeFull = true;
  			}
  		});
  		
  		this.setState(() => {
  			return {
  				packs,
  				storageWillBeFull
  			};
  		});
  	})
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 1 };
  		});
  	});
  	fetch("http://localhost:5000/api/Radd", {
  		'Accept': 'application/json'
  	})
  	.then(response => {
  		if (response.status >= 400) {
  			return this.setState(() => {
  				return { error: 1 };
  			});
  		}
  		
  		return response.json();
  	})
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 1 };
  		});
  	});
  	
  	this.setState(() => {
  		return { robotStart: true };
  	});
  	
  };
  
  putItem() {
  	this.setState(() => {
  		return { 
  			robotIsPuttingItem: true
  		};
  	});
  	fetch("http://localhost:5000/api/v1/robot/", {
  		method: 'POST',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json'
  		},
  		body: JSON.stringify({
  			id_rack: this.state.packs[this.state.idPackPutting].id_rack
  		})
  	})
  	.then(response => {
  		if (response.status >= 400) {
  			return this.setState(() => {
  				return { error: 2 };
  			});
  		}
  		
  		return response.json();
  	})
  	.then(data => {
  		var idPackPutting = this.state.idPackPutting + 1;
  		
  		if (idPackPutting === this.state.packs.length) {
  			var thatsAll = true;
  		} else {
  			var thatsAll = false;
  		}
  		return this.setState(() => {
  			return { 
  				idPackPutting,
  				robotIsPuttingItem: false,
  				thatsAll
  			};
  		});
  		//window.location.assign("/");
  	}) 
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 2 };
  		});
  	});
  }
    
  sendData() {
  	
  	fetch("http://localhost:5000/api/v1/items/", {
  		method: 'PUT',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  			'Authorization': 'Bearer '+localStorage.getItem('token')
  		},
  		body: JSON.stringify({
  			packs: this.state.packs
  		}),
  		credentials: "include"
  	})
  	.then(response => {
  		if (response.status >= 400 && response.status != 401) {
  			return this.setState(() => {
  				return { error: 2 };
  			});
  		} else if (response.status != 401) {
  			window.location.assign("/sign_in");
  		}
  		
  		return response.json();
  	})
  	.then(data => { 
  		window.location.assign("/");
  	}) 
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 2 };
  		});
  	});
  	
  }
  
  returnBack() {
  	window.location.assign("/");
  }
  
  returnToForm() {
  	this.setState(() => {
  		return { robotStart: false };
  	});
  }
  
  render() {
  	const form = (<div className="menu">
	      	<h3>Добавление предмета на склад</h3>
	      	<div className="item-input-box">
	      		<div className="item_data"> 
	      		<table align="center" width="30%">
	      			<tr><td>
				<p><b>Наименование:</b></p>
				<p><i>{this.state.name}</i></p>
				</td></tr>
				<tr><td>
				<p><b>Производитель:</b></p>
				<p><i>{this.state.manufacter}</i></p>
				</td></tr>
				<tr><td>
				<p><b>Категория:</b></p>
				<p><i>{this.state.category}</i></p>
				</td></tr>
			</table>
			<p><b>Список упаковочных тар</b></p>
			<table align="center">
			<tr>
				<th>No.</th>
				<th>Вид упаковки</th>
				<th>Количество</th>
				<th>Мера</th>
				<th></th>
			</tr>
			
			{
				this.state.packs.map((val, ind) => (
					<tr>
						
						<td><h4>{ind+1}</h4></td>
			      			<td>
							
							<p><input 
							    type="text" 
							    size="40"
							    list="packageList"
							    value={val.package}
							    onChange={(e) => {
							    	this.setState((prevState, prevProps) => {
							    	    const packs = [...prevState.packs];
							    	    packs[ind].package = e.target.value;
							    	    return {
							    	    	packs
							    	    }
							    	})
							    }}
							/></p>
							<datalist id="packageList">
							 	<option value="Коробка" />
							 	<option value="Ящик" />
							 	<option value="Полиэтилен" />
							 	<option value="Бобина" />
							 	<option value="Другое" />
							 </datalist>
						</td>
						<td>
							
							<p><input 
							    type="text" 
							    size="10"
							    value={val.count}
							    onChange={(e) => {
							    	this.setState((prevState, prevProps) => {
							    	    const packs = [...prevState.packs];
							    	    packs[ind].count = e.target.value;
							    	    return {
							    	    	packs
							    	    }
							    	})
							    }}
							/></p>
						</td>
						<td>
							<p><input 
							    type="text" 
							    size="10"
							    list="measureList"
							    value={val.measure}
							    onChange={(e) => {
							    	this.setState((prevState, prevProps) => {
							    	    const packs = [...prevState.packs];
							    	    packs[ind].measure = e.target.value;
							    	    return {
							    	    	packs
							    	    }
							    	})
							    }}
							/></p>
							<datalist id="measureList">
							 	<option value="кг" />
							 	<option value="шт." />
							 </datalist>
						</td>
						<td>
							<button id="delete-pack" onClick={this.deletePack.bind(this, ind)}><p>X</p></button>
						</td>
						<td>
							<button id="delete-pack" onClick={this.addSamePack.bind(this, ind)}><p>+1</p></button>
						</td>

						
					</tr>
				))
				
				
			}
			</table>
			
			<br/>
			<button onClick={this.addPack.bind(this)}><p>Имеется ещё одна упаковка</p></button>
			<br/>
			</div>
			
	      	</div>
	      	<br/>
	      	<br/>
	      	<button onClick={this.startRobotProcess.bind(this)}><p>Добавить предметы на склад</p></button>
	      	<button onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button> 
	      	<br/>
	      </div>);
	      
	  const process = (<div className="menu">
	      	<h3>Добавление предмета на склад</h3>
	      	
	      	<br/>
	      	<br/>
	      	{ !this.state.thatsAll && !this.state.robotIsPuttingItem && <p>Робот ожидает следующий предмет</p> }
	      	{ !this.state.thatsAll && this.state.robotIsPuttingItem && <p>Робот ставит предмет, подождите...</p> }
	      	{ !this.state.thatsAll && this.state.storageWillBeFull && <p><b>Внимание:</b> Часть упаковок не будет помещена на склад!</p>}
	      	{ !this.state.thatsAll && !this.state.robotIsPuttingItem && <button onClick={this.putItem.bind(this)}><p>Взять предмет</p></button> }
	      	{ this.state.thatsAll && <p>Все введённые предметы помещены на склад!</p> }
	      	{this.state.error === 2 && <p><i><b>Не удалось сохранить данные, повторите попытку!</b></i></p>}
	      	{ this.state.thatsAll && <button onClick={this.sendData.bind(this)}><p>Сохранить данные</p></button> }
	      	<br/>
	      	<br/>
	      	<br/>
	      	<br/>
	      	<br/>
	      	<br/>
	      	<br/>
	      	<br/><br/><br/><br/><br/>
	      </div>);   
	      
	  return (
	    <div className="window">
	      < Header username={this.state.username} admin={this.state.admin}/>
	      <div>
	      	{ this.state.robotStart ? process : form }
	      </div>
	      < Footer />
	    </div>
	  );
  }
}

export default AddExistingItem;
