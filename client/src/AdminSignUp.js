import React from 'react';
import ReactDOM from "react-dom";
import { useParams } from 'react-router-dom';
import {Header, Footer} from './Template';
import { isExpired, decodeToken } from "react-jwt";
import './App.css';


class AdminSignUp extends React.Component {
  constructor(props) {
  	
  	super(props);
  	this.state = {
	    login: "",
	    password: "",
	    error: 0, //0 - ошибок нет, 1 - невалидные данные, 2 - ошибка регистрации, 3 - несанкционированный доступ (на страницу зашёл не админ), 4 - есть пробел в логине
	    created: false,
	    admin: true
  	};
  }
  
  componentDidMount() {
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
  			return this.setState(() => {
  				return { 
  					admin: false
  				};
  			});
  		} 
  		
  		return response.json();
  	})
  	
  }
  
  signUp() {
  	if (this.state.password.length >= 6 && this.state.login.length >= 5 && this.state.login.indexOf(' ') === -1) {
  		fetch("http://localhost:5000/api/v1/users/", {
	  		method: 'POST',
	  		headers: {
	  			'Content-Type': 'application/json', 
	  			'Accept': 'application/json',
	  			'Authorization': 'Bearer '+localStorage.getItem('token')
	  		},
	  		body: JSON.stringify({
	  			login: this.state.login,
	  			password: this.state.password
	  		}),
	  		credentials: "include"
	  	})
	  	.then(response => {
	  		if (response.status >= 400) {
	  			return this.setState(() => {
	  				return { admin: false };
	  			});
	  		}
	  		
	  		else if (response.status === 200) {
		  		return this.setState(() => {
		  			return { 
		  				created: true,
		  				error: 0
		  			};
		  		});
	  		}
	  	})
	  	.catch((e) => {
	  		console.log(e);
	  		this.setState(() => {
	  			return { error: 2 };
	  		});
	  	});
  	} else if (this.state.password.length < 6 || this.state.login.length < 5) {
  		this.setState(() => {
	  		return { error: 1 };
	  	});
  	} else if (this.state.login.indexOf(' ') != -1) {
  		this.setState(() => {
	  		return { error: 4 };
	  	});
  	}
  	
  	
  }
  
  
  
  render() {
 	  var ifAdmin = (
 	      <div>
	      <h3>Регистрация пользователя</h3>
	      { this.state.created && this.state.error === 0 && <p>Пользователь успешно создан!</p> }
	      { this.state.error === 4 && <p>Логин не должен содержать пробелов!</p> }
	      { this.state.error === 2 && <p>Пользователь с таким логином уже создан!</p> }
	      { this.state.error === 1 && <p>Слишком маленькая длина введённых данных!</p> }
	      <table align="center" width="30%">
	      		<tr><td>
				<p>Логин (не менее 5 символов):</p>
				<p><input 
				    type="text" 
				    size="30"
				    maxlength="30"
				    value={this.state.login}
				    onChange={(event) => {
				    	this.setState({ login: event.target.value, created: false })
				    }}
				    
				/></p>
			</td></tr>
			<tr><td>
				<p>Пароль (не менее 6 символов):</p>
				<p><input 
				    type="password"
				    size="40"
				    value={this.state.password}
				    onChange={(event) => {
				    	this.setState({ password: event.target.value, created: false })
				    }}
				    
				/></p>
			</td></tr>
	      </table>
	      <br />
	      <br />
	      <button onClick={this.signUp.bind(this)}><p>Создать аккаунт</p></button>
	      
	      <br />
	      <br />
	      <br />
	      </div>
 	  );
 	  
 	  var ifNotAdmin = (
 	      <div>
 	     
	      <h3 style={{ marginTop: "13%", marginBottom: "14%" }}>Доступ запрещён!!!</h3>
	 

	     
	      </div>
 	  );
	
	  return (
	    <div className="window">
	      < Header username={this.state.username} admin={this.state.admin}/>
	     	   { this.state.admin ? ifAdmin : ifNotAdmin}
	      < Footer />
	    </div>
	  );
  }
}

export default AdminSignUp;
