import React from 'react';
import ReactDOM from "react-dom";
import './App.css';
import { CookiesProvider } from 'react-cookie';
import {Header, Footer} from './Template';
import { isExpired, decodeToken } from "react-jwt";

class AdminCreateDatabase extends React.Component {
  constructor() {
  	super();
  	this.state = {
  	    row: 0,
  	    column: 0,
  	    max_count: 0,
  	    error: 0, //0 - без ошибок, 1 - БД уже инициализирована, 2 - ошибка при создании таблиц
  	    adminPassword: "",
  	    createStart: false,
  	    loaded: false,
  	    verticalRows: false,
  	    dontNeed: false,
  	    admin: true
  	};
  }
  
  componentDidMount() {
  	// выполняем проверку наличия БД
  	fetch("http://localhost:5000/api/v1/storage/", {
  		method: 'GET',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  		},
  		credentials: "include"
  	})
  	.then(response => {
  		if (response.status === 200) {
  			return this.setState(() => {
  				return { 
  					dontNeed: true
  				};
  			});
  			// обработка и чтение данных из токена
  		} 
  		
  		return response.json();
  	})
  	
  	if (this.state.dontNeed) {
  		// если БД есть, но заходит всё же не админ - запрещаем доступ, обычному пользователю здесь делать абсолютно нечего
	  	fetch("http://localhost:5000/api/v1/users/authorize/db_create", {
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
	  		} else if (response.status >= 400 && response.status != 403) {
	  			// переход на страницу аутентификации
	  			window.location.assign("/sign_in");
	  		} else if (response.status === 403) {
	  			// ставим плашку о запрете доступа
	  			if (!this.state.dontNeed) {
	  				return this.setState(() => {
		  				return { 
		  					admin: false
		  				};
		  			});
				}
	  			
	  		} 
	  		
	  		return response.json();
	  	})
  	
  	}
  	
  }
  
  sendData() {
  	
  	
  	
  }
  
  changeOrintation() {
  	var verticalRows = !this.state.verticalRows;
  	this.setState(() => {
  		return { verticalRows };
  	});
  }
  
  returnBack() {
  	window.location.assign("/");
  }
  
  createStartProcess() {
  	this.setState(() => {
  		return { createStart: true };
  	});
  	fetch("http://localhost:5000/api/v1/storage/", {
  		method: 'POST',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json'
  		},
  		body: JSON.stringify({
  			rows: parseInt(this.state.row),
  			columns: parseInt(this.state.column),
  			max_count: parseInt(this.state.max_count),
  			password: this.state.password })
  		})
  	.then(response => {
  		if (response.status >= 400) {
  			return this.setState(() => {
  				return { error: 2 };
  			});
  		} else if (response.status === 200) {
  			return this.setState(() => {
  				return { error: 1 };
  			});
  		}
  		
  		return response.json();
  	})
  	.then(data => {
  		return this.setState(() => {
  			return { loaded: false };
  		});
  	}) 
  	.catch((e) => {
  		console.log(e);
  		this.setState(() => {
  			return { error: 2 };
  		});
  	});
  };
  
  render() {   
  	  const process = (<div className="menu">
			      	<h3>Инициализация БД</h3>
			      	
			      	<br/>
			      	<br/>
			      	<p>Состояние инициализации:</p>
			      	{this.state.loaded === false && 
			      	<div>
			      		<p><i><b>Создаются таблицы, пожалуйста, подождите...</b></i></p>
			      	</div>}
			      	{this.state.error === 0 && 
			      	<div>
			      		<p><i><b>Таблицы успешно созданы!</b></i></p>
			      		<button onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button>
			      	</div>}
			      	{this.state.error === 1 && 
			      	<div>
			      		<p><i><b>БД уже готова к работе, повторная инициализация не требуется</b></i></p>
			      		<button onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button>
			      	</div>}
			      	{this.state.error === 2 && 
			      	<div>
			      		<p><i><b>Возникла ошибка, повторите попытку позже!</b></i></p>
			      		<button onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button>
			      	</div>}
			      	
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/><br/><br/><br/><br/>
		        </div>); 
	      
	  const form = (<div className="menu">
			      	<h3>Инициализация БД</h3>
			      	
			      	
			      	<br/>
			      		<p>Пароль для администратора: <input 
					    type="password"
					    size="30"
					    value={this.state.password}
					    onChange={(event) => {
					    	this.setState({ password: event.target.value })
					    }}
					    
					/></p>
				<br />
			      	<p><b>Перед началом инициализации БД необходимо определить размер склада</b></p>
			      	<table align="center" width="30%">
		      			<tr><td>
					<p>Количество {(!this.state.verticalRows) ? "рядов" : "ячеек в ряду"}: <input 
					    type="text" 
					    size="5"
					    value={this.state.row}
					    onChange={(event) => {
					    	this.setState({ row: event.target.value })
					    }}
					    
					/></p>
					</td></tr>
					<tr><td>
					<p>Количество {(!this.state.verticalRows) ? "ячеек в ряду" : "вертикальных рядов"}: <input 
					    type="text" 
					    size="5"
					    value={this.state.column}
					    onChange={(event) => {
					    	this.setState({ column: event.target.value })
					    }}
					    
					/></p>
					</td></tr>
					<tr><td>
					<p>Вместимость каждой ячейки (в кол-ве упаковок): <input 
					    type="text" 
					    size="5"
					    value={this.state.max_count}
					    onChange={(event) => {
					    	this.setState({ max_count: event.target.value })
					    }}
					    
					/></p>
					</td></tr>
				</table>
			      	<button onClick={this.changeOrintation.bind(this)}><p>Сменить ориентацию рядов</p></button>
			      	<br/>
			      
			      	<button onClick={this.createStartProcess.bind(this)}><p>Начать создание БД</p></button>
			      	
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/>
			      	<br/><br/><br/><br/><br/>
		        </div>);
		        
	  var ifNotAdmin = (
 	      <div>
 	     
	      <h3 style={{ marginTop: "13%", marginBottom: "14%" }}>Доступ запрещён!!!</h3>
	 

	     
	      </div>
 	  );
	  
	  var dontNeedComp = (
 	      <div>
 	     
	      <h3 style={{ marginBottom: "12%" }}>Инициализация БД</h3>
	      <p >Повторная инициализация не требуется</p>
	      <button style={{ marginBottom: "12%" }}onClick={this.returnBack.bind(this)}><p>Вернуться назад</p></button>

	     
	      </div>
 	  );
	  
	  return (
	    <div className="window">
	      < Header hiddenMenu />
	      <div>
		      	{ !this.state.dontNeed && (this.state.createStart ? process : form) }
		      	{ this.state.admin && this.state.dontNeed && dontNeedComp }
		      	{ !this.state.admin && ifNotAdmin }
	      </div>
	      < Footer />
	    </div>
	  );
  }
}

export default AdminCreateDatabase;
