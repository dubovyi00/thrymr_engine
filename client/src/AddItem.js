import React from 'react';
import ReactDOM from "react-dom";
import './App.css';
import { CookiesProvider } from 'react-cookie';
import {Header, Footer} from './Template';
import { useLocation } from 'react-router-dom';
import { isExpired, decodeToken } from "react-jwt";

import FileBase64 from './react-file-base64';



class AddItem extends React.Component {
  constructor(props) {
  	super(props);
 
  	this.state = {
  	    name: "",
  	    manufacter: "",
  	    category: "",
  	    packs: [{count: 0, measure: "", package: ""}],
  	    categories: [], 
  	    error: 0, //0 - без ошибок, 1 - ошибка при получении списка категорий, 2 - ошибка при добавлении в БД
  	    robotStart: false,
  	    robotIsPuttingItem: false,
  	    storageWillBeFull: true,
  	    idPackPutting: 0,
  	    thatsAll: false,
  	    image: null,
  	    imageBase64: null
  	};
  }
  
  componentDidMount() {
  	fetch("http://localhost:5000/api/v1/users/authorize/add_item", {
  		method: 'GET',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  			'Authorization': 'Bearer '+localStorage.getItem('token')
  		},
  		credentials: "include"
  	})
  	.then(response => {
  		console.log(response.status);
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
  	
  	
  	fetch("http://localhost:5000/api/v1/items/categories_list/", {
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
  				categories: data.categories
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
  	packs.push({count: 0, measure: "", package: ""});
  	this.setState(() => {
  		return { packs: packs };
  	});
  }
  
  addSamePack(i) {
  	//var packs = this.state.packs;
  	var packs = this.state.packs;
  	var new_pack = {
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
  

  
  onImageChange = event => {
	if (event.target.files && event.target.files[0]) {
		let img = event.target.files[0];
		this.setState(() => {
			return {
				image: URL.createObjectURL(img),
			}
		});
	}
  };
  
  getFiles(files){

	this.setState({ 
		imageBase64: files[0].base64,
		image: files[0].url
	})
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
  		method: 'POST',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  			'Authorization': 'Bearer '+localStorage.getItem('token')
  		},
  		body: JSON.stringify({
  			name: this.state.name,
  			manufacter: this.state.manufacter,
  			category: this.state.category,
  			image: this.state.imageBase64,
  			image_url: this.state.image,
  			packs: this.state.packs,
  			login: this.state.username
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
				<p>Наименование:</p>
				<p><input 
				    type="text" 
				    size="40"
				    value={this.state.name}
				    onChange={(event) => {
				    	this.setState({ name: event.target.value })
				    }}
				    
				/></p>
				</td></tr>
				<tr><td>
				<p>Производитель:</p>
				<p><input 
				    type="text" 
				    size="40"
				    value={this.state.manufacter}
				    onChange={(event) => {
				    	this.setState({ manufacter: event.target.value })
				    }}
				/></p>
				</td></tr>
				<tr><td>
				<p>Категория:</p>
				{this.state.error === 1 && <p><i><b>Не удалось загрузить список категорий!</b></i></p>}
				<p><input 
				    type="text" 
				    size="40"
				    list="categoryList"
				    value={this.state.category}
				    onChange={(event) => {
				    	this.setState({ category: event.target.value })
				    }}
				 /></p>
				 <datalist id="categoryList">
				 	{
				 		this.state.categories.map((val, ind) => (
				 			<option value={val.name} />
				 		))
				 	}
				 </datalist>
				</td></tr>
				
				<tr><td>
				<p>Изображение:</p>
				
				
				<p>
				<FileBase64
					multiple={ true }
					onDone={ this.getFiles.bind(this) } 
				/></p>
				<img src={this.state.image} width="320px" />
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

export default AddItem;
