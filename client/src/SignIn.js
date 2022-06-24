import React from 'react';
import ReactDOM from "react-dom";
import { useParams } from 'react-router-dom';
import {Header, Footer} from './Template';

import './App.css';


class SignIn extends React.Component {
  constructor(props) {
  	
  	super(props);
  	this.state = {
	    login: "",
	    password: "",
	    error: 0, //0 - ошибок нет, 1 - неверные логин/пароль
	    loged: false
  	};
  }
  
  componentDidMount() {
  	// проверяем, что база данных имеется, если она не инициализирована - сначала необходимо это сделать для дальнейшей работы
  	// поскольку на эту страницу мы всё равно попадём при первом запуске (токенов естественно не будет), то нам само собой для продолжения работы нужно её создать
  	// если же БД создана - просто идём дальше
  	fetch("http://localhost:5000/api/v1/storage/", {
  		method: 'GET',
  		headers: {
  			'Content-Type': 'application/json', 
  			'Accept': 'application/json',
  		},
  		credentials: "include"
  	})
  	.then(response => {
  		if (response.status >= 400) {
  			window.location.assign("/admin/dbcreate");
  		} 
  		
  		return response.json();
  	})
  	
  	// а потом удаляем токен, если имеется - в этом окне мы делаем аутентификацию по-новой
  	localStorage.removeItem('token');
  }
  
  signInUser() {
  	fetch("http://localhost:5000/api/v1/users/", {
	  	method: 'GET',
	  	headers: {
	  		'Content-Type': 'application/json', 
	  		'Accept': 'application/json',
	  		'Login': this.state.login,
	  		'Password': this.state.password,
	  		
	  	},
	  	credentials: "include"
	  })
	  .then(response => {
	  	if (response.status >= 400) {
	  		return this.setState(() => {
	  			return { error: 1 };
	  		});
	  	}
	  		
	  	else if (response.status === 200) {
		  	this.setState(() => {
		  		return { 
		  			loged: true,
		  			error: 0
		  		};
		  	});
		  	return response.json();
		  	
	  	}
	  })
	  .then(data => {
  		localStorage.setItem('token', data.access_token);
  		window.location.assign("/");
  	  })
	  .catch((e) => {
	  	console.log(e);
	  	this.setState(() => {
	  		return { error: 1 };
	  	});
	  });
  }
  
  render() {
 
	
	  return (
	    <div className="window">
	      < Header hiddenMenu />
	      <div>
	      <h3>Вход в систему</h3>
	      { this.state.error === 1 && <p>Введены неверные данные!</p> }
	      <table align="center" width="30%">
	      		<tr><td>
				<p>Логин:</p>
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
				<p>Пароль:</p>
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
	      <button onClick={this.signInUser.bind(this)}><p>Войти</p></button>
	      
	      <br />
	      <br />
	      <br />
	      </div>
	      < Footer />
	    </div>
	  );
  }
}

export default SignIn;
