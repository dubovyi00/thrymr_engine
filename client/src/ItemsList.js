import React from 'react';
import ReactDOM from "react-dom";
import { useParams } from 'react-router-dom';
import {Header, Footer} from './Template';
import { useLocation } from 'react-router-dom';
import { isExpired, decodeToken } from "react-jwt";
import './App.css';
import no_photo from './no_photo.png';

class ItemsList extends React.Component {
  constructor(props) {
  	
  	super(props);

  	//console.log(this.props);
  	this.state = {
	    categories: [],
	    cat: "Не выбрана",
	    name: "",
	    searchedName: "",
	    items: [],
  	    error: 0, // 0 - без ошибок, 1 - ошибка при получении данных, 2 - ошибка при удалении данных
  	    pages_count: 0,
  	    packs_visible: [],
  	    pack_selected: 1,
  	    page_buttons: [],
  	    id_rack: 0,
  	    robotIsTakingItem: false,
  	    robotStart: false,
  	    thatsAll: false,
  	    searchBy: "default",
  	    username: "",
  	    admin: false
  	};
  }
  
  componentDidMount() {
  	fetch("http://localhost:5000/api/v1/users/authorize/select_item", {
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
  	var page_selected = (url_parsed.indexOf('page') != -1) ? url_parsed[url_parsed.indexOf('page') + 1] : 1;
  	
  	this.setState(() => {
  		return { searchBy: (url_parsed[4] != 'default') ? url_parsed[4] : 'default' };
  	}); 
  	
  	if (url_parsed[4] === 'name') {
	  	this.setState(() => {
	  		return { searchedName: url_parsed[5] }
	  	});
	}
  	
  	
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
  		
  		if (url_parsed[4] === 'category') {
	  		data.categories.forEach((val, ind) => {
	  			if (val.id_cat == url_parsed[5]) {
	  				this.setState(() => {
	  					return { cat: val.name }
	  				});
	  			}
	  		});
	  	}
  	})
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 1 };
  		});
  	});
  	
  	
  	
  	fetch("http://localhost:5000/api/v1/items_pages/"+((url_parsed[4]  === 'page' || url_parsed[4]  === undefined) ? "" : url_parsed[4]+"/"+url_parsed[5]), {
  	//fetch("http://localhost:5000/api/v1/items_pages/"+this.state.searchBy+"/"+url_parsed[5], {
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
  		
  		var page_buttons = [];
		for (let i = 1; i <= data.pages_count; i++) {
			page_buttons.push(i);
		}
		
  		this.setState(() => {
  			return {
  				pages_count: data.pages_count,
  				page_buttons
  			};
  		});
  	})
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 1 };
  		});
  	});
  	
  	
  	
  	
  	fetch("http://localhost:5000/api/v1/items"+((url_parsed[4]  === 'page' || url_parsed[4]  === undefined) ? "" : "/by_"+url_parsed[4]+"/"+url_parsed[5]) +"/page/"+page_selected, {
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
  		var packs_visible = [];
	  	data.items.forEach(() => {
	  		packs_visible.push(false);
	  	});
  		this.setState(() => {
  			return {
  				items: data.items,
  				packs_visible
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
  
  packsShowHide(index) {
  	var packs_visible = this.state.packs_visible;
  	packs_visible[index] = !packs_visible[index];
  	this.setState(() => {
		return {
			packs_visible
		};
	});
  }
  
  startRobotProcess(pack_selected) {
  	fetch("http://localhost:5000/api/v1/storage/pack_rack/" + pack_selected, {
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
  				id_rack: data.id_rack,
  				pack_selected
  			};
  		});
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
  	
  	
  }
  
  takeItem() {
  	this.setState(() => {
  		return { 
  			robotIsTakingItem: true
  		};
  	});
  	fetch("http://localhost:5000/api/v1/robot/", {
  		method: 'DELETE',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json'
  		},
  		body: JSON.stringify({
  			id_rack: this.state.id_rack
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
  		return this.setState(() => {
  			return { 
  				robotIsTakingItem: false,
  				thatsAll: true
  			};
  		});
  	}) 
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 2 };
  		});
  	});
  }
  
  deletePack(index) {
  	fetch("http://localhost:5000/api/v1/items/", {
  		method: 'DELETE',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  			'Authorization': 'Bearer '+localStorage.getItem('token')
  		},
  		body: JSON.stringify({
  			id_pack: this.state.pack_selected,
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
  	window.location.assign("/items");
  }
  
  goToPage(page) {
  	window.location.assign("/items/page/"+page);
  }
  
  goToPageByCat(id_cat, page) {
  	window.location.assign("/items/category/"+id_cat+"/page/"+page);
  }
  
  goToPageByName(name, page) {
  	window.location.assign("/items/name/"+name+"/page/"+page);
  }
  
  searchByCat(cat) {
  	this.state.categories.forEach((val, ind) => {
  		if (val.name === cat) {
  			window.location.assign("/items/category/"+val.id_cat+"/page/1");
  		}
  	});
  	
  }
  
  searchByName(name) {
  	window.location.assign("/items/name/"+name+"/page/1");
  }
  
  addThisItem(id) {
  	window.location.assign("/add_existing_item/"+id);
  }
  
  render() {
  	
	

	var list = (<div className="menu">
	      	<h3>Список предметов на складе</h3>
	      	
	      	{ this.state.searchBy === 'category' && <p>Предметы категории "{this.state.cat}"</p>}
	      	{ this.state.searchBy === 'name' && <p>Результаты поиска по слову "{decodeURI(this.state.searchedName)}"</p>}
	      	
	      	<table align="center">
	      		<tr>
	      		<td>
	      			<p><b>Выбрать категорию предметов: </b></p>
	      		</td>
	      		<td>
	      			<input 
			      		type="text"  
			      		list="categoryList" 
			      		value={this.state.category}
					onChange={(event) => {
						this.setState({ category: event.target.value })
					}}
			      	/>
			      	<datalist id="categoryList">
					{
						 this.state.categories.map((val, ind) => (		
						 	<option value={val.name} />
						 ))
					}
				</datalist>
	      		</td>
	      		<td>
	      			<button id="delete-pack"  onClick={this.searchByCat.bind(this, this.state.category)}><p>&#128269;</p></button>
	      		</td>
	      		</tr>
	      		
	      		<tr>
	      			<td>
		      			<p><b>Найти по названию: </b></p>
		      		</td>
		      		<td>
					<input 
				      		type="text"  
				      		value={this.state.name}
						onChange={(event) => {
							this.setState({ name: event.target.value })
						}}
				      	/>
		      		</td>
		      		<td>
		      			<button id="delete-pack"  onClick={this.searchByName.bind(this, this.state.name)}><p>&#128269;</p></button>
		      		</td>
	      		</tr>
	      		
	      	</table>
	      	
	      	<br />
	      	{
	      		this.state.items.map((val, ind) => (
	      			<div>
	      			<div className="item">
	      		
			      			<table>
			      			<tr>
			      			<td width="17%" >
			      			<div className="item-pic">  
			      				<img src={(val.image) ? val.image : no_photo} width="100%"  />
			      			</div>
			      			</td>
			      			<td>
			      				<h4>{val.name}<br /></h4>
			      				<p>Производство: {val.manufacter}</p>
			      			</td>
			      			<td width="17%" >
			      			<button 
			      				id="info-button"
			      				onClick={this.packsShowHide.bind(this, ind)}
			      			>
			      				<h4>Взять со склада</h4>
			      			</button>
			      			</td>
			      			</tr>
			      			</table>
			      		
			      		
			      	</div>
			      	{
			      		this.state.packs_visible[ind] &&
			      		val.packs.length !== 0 && 
			      		<div className="item-info-table" >
				      		<div className="item-info">
				      			<h4>История операций</h4>
				      			{
				      				val.history.map((hv, hi) => (
				      					<p><i>[{hv.datetime}]</i> {hv.operation} пользователем {hv.username}</p>
				      				))
				      			}
				      			<br />
				      		</div> 
				      		<div className="item-info">
				      			<h4>Список упаковок</h4>
				      			<table >
				      			{
				      				val.packs.map((v, i) => (
				      					<tr >
				      					<td width="100%" id="packs-list">
				      					<p>{v.package} ({v.count} {v.measure})</p>
				      					</td>
				      					<td>
				      					<button id="select-pack-button" onClick={this.startRobotProcess.bind(this, v.id_pack)}>
						      				<h4>Выбрать</h4>
						      			</button>
				      					</td>
				      					</tr>
				      				))
				      			}
				      			</table>
				      			<br />
				      			<button style={{ width: "50%" }} onClick={this.addThisItem.bind(this, val.id_item)}><p>Добавить ещё</p></button>
				      			<br />
				      		</div> 
			      		</div> 
			      		
			      	}
			      	{ 
			      		this.state.packs_visible[ind] &&
			      		val.packs.length === 0 &&
			      		<div className="item-info-table" >
				      		<div className="item-info">
				      			<h4>История операций</h4>
				      			{
				      				val.history.map((hv, hi) => (
				      					<p><i>[{hv.datetime}]</i> {hv.operation} пользователем {hv.username}</p>
				      				))
				      			}
				      			<br />
				      			
				      		</div> 
				      		<div className="item-info">
				      			<h4>Предмет отсутствует на складе</h4>
				      			<br />
				      			<button onClick={this.addThisItem.bind(this, val.id_item)}><p>Добавить</p></button>
				      			<br />
				      		</div> 
			      		</div> 
			      	}
			      	<br />
			      	
	      			</div>
	      		))
	      	}
	      <table align="center"><tr>{
	      		this.state.page_buttons.map((val, ind) => (<td><button id="delete-pack" onClick={this.goToPage.bind(this, val)}><p>{val}</p></button></td>))
	      }</tr></table>	
	      { this.state.items.length === 0 && <p><b>Ничего не найдено, повторите попытку!</b></p> }
	      </div>
	);
	
	var loaderr = (<div className="menu">
	      	<h3>Список предметов на складе</h3>
	      	
	      	<br />
	      	<p><i><b>Произошла ошибка загрузки, повторите попытку!</b></i></p>
	      	<button onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button>
	      	
	      </div>
	);
	
	const process = (<div className="menu">
	      	<h3>Список предметов на складе</h3>
	      	
	      	<br/>
	      	<br/>
	      	{ !this.state.robotIsTakingItem && !this.state.thatsAll && <p>Робот готов взять предмет</p> }
	      	{ !this.state.robotIsTakingItem && !this.state.thatsAll &&  <button onClick={this.takeItem.bind(this)}><p>Взять предмет</p></button> }
	      	{ this.state.robotIsTakingItem && <p>Робот забирает предмет</p> }
	      	{ !this.state.robotIsTakingItem && this.state.thatsAll && <p>Предмет можно забирать</p> }
	      	{this.state.error === 2 && <p><i><b>Не удалось обновить данные, повторите попытку!</b></i></p>}
	      	{ !this.state.robotIsTakingItem && this.state.thatsAll && <button onClick={this.deletePack.bind(this)}><p>Завершить выгрузку</p></button> }
	      	<button onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button>
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
	      { this.state.error !== 1 ?
	      <div>
	      	{ this.state.robotStart ? process : list }
	      </div>
	      
	      : loaderr }
	      < Footer />
	    </div>
	  );
  }
}

export default ItemsList;
