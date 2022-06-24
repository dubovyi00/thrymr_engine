import React from 'react';
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';


export class Header extends React.Component {
  constructor(props) {
  	super(props);
  	this.state = {
  		username: "",
  		admin: false,
  		hiddenMenu: false
  	};
  }
  
  componentDidMount() {
  	return this.setState(() => {
  		return { 
  			username: this.props.username,
  			admin: this.props.admin,
  			hiddenMenu: this.props.hiddenMenu
  		};
  	});
  }
  
  goToAdd() {
  	window.location.assign("/");
  }
  
  returnBack() {
  	window.location.assign("/");
  }
  
  render() {
	  return (
	      <header>
	        
		<h1>Thrymr</h1>
		{ this.props.username && <p>Добро пожаловать, {this.props.username}!</p> }
		 <p style={{ lineHeight: 0}}>
		{ !this.state.hiddenMenu && <nav>
			<Link to="/add_item"><button id="menu-button"><p>Добавить предмет</p></button></Link>
			<Link to="/items"><button id="menu-button"><p>Взять предмет</p></button></Link>
			{ this.props.admin && <Link to="/admin/sign_up"><button id="menu-button"><p>Регистрация пользователя</p></button></Link> }
			<Link to="/sign_in"><button id="menu-button"><p>Выход из системы</p></button></Link>
		 </nav> }
	      	
	         </p>
		
		 
	      </header>
	     
	      
	  ); 
  }
}


export function Footer(props) {
  return (
  	<footer>
	      	<p>Thrymr is a part of M.A.R.S. (Mobile Autonomous Robotic System)<br />
		Thrymr - часть Мобильной Автономной Робототехнической Системы</p>
	</footer>
  );
}

//export default { Header, Footer };
